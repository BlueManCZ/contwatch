"""
Migrate handlers, attributes, and data_units from the old ContWatch DB (Pony ORM)
to the new v2 DB (SQLAlchemy + TimescaleDB).

Old DB: 10.0.0.20  (production, still live)
New DB: localhost   (v2)

Usage:
    cd backend
    uv run python migrate_old_db.py [--batch-size 50000] [--start-from "2020-01-01"]

Data units are migrated oldest-first so the script can be re-run safely
(it skips rows already present in the new DB).
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone

import psycopg
from psycopg.rows import dict_row

OLD_DSN = "host=10.0.0.20 dbname=contwatch user=contwatch password=contwatch"
NEW_DSN = "host=localhost dbname=contwatch user=contwatch password=contwatch"

DEFAULT_BATCH_SIZE = 50_000
TIMEZONE = "UTC"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------


def migrate_handlers(old: psycopg.Connection, new: psycopg.Connection) -> None:
    log("Migrating handlers...")

    rows = old.execute("SELECT id, type, options, enabled FROM handler ORDER BY id").fetchall()

    for row in rows:
        options = row["options"] if isinstance(row["options"], dict) else json.loads(row["options"])

        # Old schema: {"label": "...", "config": {...}}
        # New schema: label is a column, options = the config dict directly
        label = options.pop("label", None)
        config = options.pop("config", options)

        new.execute(
            """
            INSERT INTO handlers (id, type, label, options, enabled)
            VALUES (%(id)s, %(type)s, %(label)s, %(options)s, %(enabled)s)
            ON CONFLICT (id) DO UPDATE SET
                type = EXCLUDED.type,
                label = EXCLUDED.label,
                options = EXCLUDED.options,
                enabled = EXCLUDED.enabled
            """,
            {
                "id": row["id"],
                "type": row["type"],
                "label": label,
                "options": json.dumps(config),
                "enabled": row["enabled"],
            },
        )

    new.commit()

    # Advance the sequence past the highest migrated ID
    new.execute("SELECT setval('handlers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM handlers))")
    new.commit()

    log(f"  Migrated {len(rows)} handlers.")


# ---------------------------------------------------------------------------
# Attributes
# ---------------------------------------------------------------------------


def migrate_attributes(old: psycopg.Connection, new: psycopg.Connection) -> None:
    log("Migrating attributes...")

    rows = old.execute(
        """
        SELECT id, name, handler, enabled, unit, label, icon, "order", rounding, color
        FROM attribute ORDER BY id
        """
    ).fetchall()

    for row in rows:
        new.execute(
            """
            INSERT INTO attributes (id, name, handler_id, enabled, unit, label, icon, "order", rounding, color)
            VALUES (%(id)s, %(name)s, %(handler_id)s, %(enabled)s, %(unit)s,
                    %(label)s, %(icon)s, %(order)s, %(rounding)s, %(color)s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                handler_id = EXCLUDED.handler_id,
                enabled = EXCLUDED.enabled,
                unit = EXCLUDED.unit,
                label = EXCLUDED.label,
                icon = EXCLUDED.icon,
                "order" = EXCLUDED."order",
                rounding = EXCLUDED.rounding,
                color = EXCLUDED.color
            """,
            {
                "id": row["id"],
                "name": row["name"],
                "handler_id": row["handler"],
                "enabled": row["enabled"],
                "unit": row["unit"],
                "label": row["label"],
                "icon": row["icon"],
                "order": row["order"],
                "rounding": row["rounding"],
                "color": row["color"],
            },
        )

    new.commit()

    # Advance the sequence past the highest migrated ID
    new.execute("SELECT setval('attributes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM attributes))")
    new.commit()

    log(f"  Migrated {len(rows)} attributes.")


# ---------------------------------------------------------------------------
# Data units
# ---------------------------------------------------------------------------


def get_resume_point(new: psycopg.Connection) -> datetime | None:
    """Find the latest timestamp already in the new DB so we can resume."""
    row = new.execute("SELECT MAX(timestamp) AS ts FROM data_units").fetchone()
    return row["ts"] if row and row["ts"] else None


def migrate_data_units(
    old: psycopg.Connection,
    new: psycopg.Connection,
    batch_size: int,
    start_from: str | None,
) -> None:
    log("Migrating data units...")

    # Determine where to start: explicit flag, resume point, or the beginning
    resume_ts = get_resume_point(new)
    if start_from:
        log(f"  Starting from explicit date: {start_from}")
        where_clause = f"WHERE (date + time) >= '{start_from}'::timestamp"
    elif resume_ts:
        # Convert back to naive for comparison with old DB
        resume_naive = resume_ts.strftime("%Y-%m-%d %H:%M:%S.%f")
        log(f"  Resuming from: {resume_naive} (last migrated timestamp)")
        where_clause = f"WHERE (date + time) > '{resume_naive}'::timestamp"
    else:
        log("  Starting from the beginning (no existing data in new DB).")
        where_clause = ""

    # Count rows to migrate
    count_row = old.execute(f"SELECT COUNT(*) AS cnt FROM dataunit {where_clause}").fetchone()
    total = count_row["cnt"]
    log(f"  {total:,} rows to migrate.")

    if total == 0:
        return

    # Use a server-side cursor to stream rows oldest-first
    migrated = 0
    t0 = time.monotonic()

    with old.cursor(name="migrate_data_units") as cur:
        cur.itersize = batch_size
        cur.execute(
            f"""
            SELECT handler, attribute, value, date, time
            FROM dataunit
            {where_clause}
            ORDER BY date ASC, time ASC
            """
        )

        batch: list[tuple] = []
        for row in cur:
            # Combine date + time → timestamptz (AT TIME ZONE interprets naive as local)
            batch.append((row["handler"], row["attribute"], row["value"], row["date"], row["time"]))

            if len(batch) >= batch_size:
                _insert_data_batch(new, batch)
                migrated += len(batch)
                elapsed = time.monotonic() - t0
                rate = migrated / elapsed if elapsed > 0 else 0
                log(f"  {migrated:,} / {total:,} ({migrated * 100 // total}%) — {rate:,.0f} rows/s")
                batch = []

        # Final partial batch
        if batch:
            _insert_data_batch(new, batch)
            migrated += len(batch)

    elapsed = time.monotonic() - t0
    rate = migrated / elapsed if elapsed > 0 else 0
    log(f"  Done: {migrated:,} rows in {elapsed:.1f}s ({rate:,.0f} rows/s)")


def _insert_data_batch(new: psycopg.Connection, batch: list[tuple]) -> None:
    """Insert a batch using COPY for maximum throughput."""
    with new.cursor() as cur:
        # Set session timezone so naive timestamps in COPY are interpreted correctly
        cur.execute(f"SET LOCAL timezone = '{TIMEZONE}'")
        with cur.copy(
            """
            COPY data_units (handler_id, attribute_id, value, timestamp)
            FROM STDIN
            """
        ) as copy:
            for handler_id, attribute_id, value, date, time_val in batch:
                naive_ts = f"{date} {time_val}"
                copy.write_row((handler_id, attribute_id, value, naive_ts))

    new.commit()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate old ContWatch DB to v2")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument(
        "--start-from",
        type=str,
        default=None,
        help="Start data_units migration from this date (YYYY-MM-DD). Overrides auto-resume.",
    )
    parser.add_argument(
        "--skip-handlers",
        action="store_true",
        help="Skip handler migration (if already done).",
    )
    parser.add_argument(
        "--skip-attributes",
        action="store_true",
        help="Skip attribute migration (if already done).",
    )
    parser.add_argument(
        "--skip-data",
        action="store_true",
        help="Skip data_units migration.",
    )
    args = parser.parse_args()

    log("Connecting to old DB (10.0.0.20)...")
    old = psycopg.connect(OLD_DSN, row_factory=dict_row)

    log("Connecting to new DB (localhost)...")
    new = psycopg.connect(NEW_DSN, row_factory=dict_row)

    try:
        if not args.skip_handlers:
            migrate_handlers(old, new)
        if not args.skip_attributes:
            migrate_attributes(old, new)
        if not args.skip_data:
            migrate_data_units(old, new, args.batch_size, args.start_from)

        log("Migration complete!")
    except KeyboardInterrupt:
        log("Interrupted. Progress is saved — re-run to resume data_units from where it left off.")
        sys.exit(1)
    finally:
        old.close()
        new.close()


if __name__ == "__main__":
    main()
