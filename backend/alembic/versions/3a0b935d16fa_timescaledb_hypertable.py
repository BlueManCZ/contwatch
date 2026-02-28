"""timescaledb hypertable

Revision ID: 3a0b935d16fa
Revises: b0eed7d52744
Create Date: 2026-02-28 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text as sa_text

# revision identifiers, used by Alembic.
revision: str = "3a0b935d16fa"
down_revision: Union[str, Sequence[str], None] = "b0eed7d52744"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Convert data_units to TimescaleDB hypertable, replace data_stats with continuous aggregate."""
    conn = op.get_bind()

    # 1. Enable TimescaleDB extension
    conn.execute(sa_text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE"))

    # 2. Add timestamp column to data_units
    conn.execute(
        sa_text(
            "ALTER TABLE data_units ADD COLUMN timestamp TIMESTAMPTZ"
        )
    )

    # 3. Populate timestamp from existing date + time columns
    conn.execute(
        sa_text(
            "UPDATE data_units SET timestamp = (date + time) AT TIME ZONE 'UTC'"
        )
    )

    # 4. Make timestamp NOT NULL
    conn.execute(
        sa_text(
            "ALTER TABLE data_units ALTER COLUMN timestamp SET NOT NULL"
        )
    )

    # 5. Deduplicate rows that share the same (timestamp, attribute_id).
    #    The store-on-change logic can emit two points at the same instant
    #    for one attribute. Keep only the row with the highest id (latest value).
    conn.execute(
        sa_text(
            """
            DELETE FROM data_units a USING data_units b
            WHERE a.timestamp = b.timestamp
              AND a.attribute_id = b.attribute_id
              AND a.id < b.id
            """
        )
    )

    # 6. Drop the old primary key constraint and auto-increment id column
    conn.execute(sa_text("ALTER TABLE data_units DROP CONSTRAINT pk_data_units"))

    # 7. Drop old indexes
    conn.execute(sa_text("DROP INDEX IF EXISTS ix_data_units_attribute_date"))
    conn.execute(sa_text("DROP INDEX IF EXISTS ix_data_units_attribute_id"))
    conn.execute(sa_text("DROP INDEX IF EXISTS ix_data_units_date"))

    # 8. Drop old columns
    conn.execute(sa_text("ALTER TABLE data_units DROP COLUMN id"))
    conn.execute(sa_text("ALTER TABLE data_units DROP COLUMN date"))
    conn.execute(sa_text("ALTER TABLE data_units DROP COLUMN time"))

    # 9. Set composite primary key
    conn.execute(
        sa_text(
            "ALTER TABLE data_units ADD CONSTRAINT pk_data_units "
            "PRIMARY KEY (timestamp, attribute_id)"
        )
    )

    # 10. Convert to hypertable
    conn.execute(
        sa_text(
            "SELECT create_hypertable('data_units', 'timestamp', migrate_data => true)"
        )
    )

    # 11. Add index on attribute_id for FK lookups
    conn.execute(
        sa_text(
            "CREATE INDEX ix_data_units_attribute_id ON data_units (attribute_id, timestamp DESC)"
        )
    )

    # 12. Drop data_stats table
    conn.execute(sa_text("DROP INDEX IF EXISTS ix_data_stats_attribute_id"))
    conn.execute(sa_text("DROP INDEX IF EXISTS ix_data_stats_date"))
    conn.execute(sa_text("DROP TABLE data_stats"))

    # 13. Create continuous aggregate materialized view
    conn.execute(
        sa_text(
            """
            CREATE MATERIALIZED VIEW daily_stats
            WITH (timescaledb.continuous) AS
            SELECT
                time_bucket('1 day', timestamp) AS bucket,
                attribute_id,
                MIN(value) AS min_value,
                MAX(value) AS max_value
            FROM data_units
            GROUP BY bucket, attribute_id
            WITH NO DATA
            """
        )
    )

    # 14. Add refresh policy — refresh the last 3 days every hour
    conn.execute(
        sa_text(
            """
            SELECT add_continuous_aggregate_policy('daily_stats',
                start_offset => INTERVAL '3 days',
                end_offset => INTERVAL '1 hour',
                schedule_interval => INTERVAL '1 hour'
            )
            """
        )
    )


def downgrade() -> None:
    """Revert to plain table with id/date/time columns and data_stats table."""
    conn = op.get_bind()

    # 1. Remove continuous aggregate policy and view
    conn.execute(
        sa_text(
            "SELECT remove_continuous_aggregate_policy('daily_stats', if_exists => true)"
        )
    )
    conn.execute(sa_text("DROP MATERIALIZED VIEW IF EXISTS daily_stats"))

    # 2. Convert back from hypertable — recreate as plain table
    # Create a temp table with the desired schema
    conn.execute(
        sa_text(
            """
            CREATE TABLE data_units_old (
                id SERIAL PRIMARY KEY,
                handler_id INTEGER NOT NULL REFERENCES handlers(id),
                attribute_id INTEGER NOT NULL REFERENCES attributes(id),
                value DOUBLE PRECISION NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL
            )
            """
        )
    )

    # Copy data back, splitting timestamp into date + time
    conn.execute(
        sa_text(
            """
            INSERT INTO data_units_old (handler_id, attribute_id, value, date, time)
            SELECT handler_id, attribute_id, value,
                   timestamp::date, timestamp::time
            FROM data_units
            """
        )
    )

    # Drop hypertable and rename
    conn.execute(sa_text("DROP TABLE data_units"))
    conn.execute(sa_text("ALTER TABLE data_units_old RENAME TO data_units"))

    # Recreate indexes
    conn.execute(
        sa_text(
            "CREATE INDEX ix_data_units_attribute_date ON data_units (attribute_id, date)"
        )
    )
    conn.execute(
        sa_text("CREATE INDEX ix_data_units_attribute_id ON data_units (attribute_id)")
    )
    conn.execute(sa_text("CREATE INDEX ix_data_units_date ON data_units (date)"))

    # 3. Recreate data_stats table
    conn.execute(
        sa_text(
            """
            CREATE TABLE data_stats (
                id SERIAL PRIMARY KEY,
                attribute_id INTEGER NOT NULL REFERENCES attributes(id),
                type VARCHAR(20) NOT NULL,
                value DOUBLE PRECISION NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL
            )
            """
        )
    )
    conn.execute(
        sa_text(
            "CREATE INDEX ix_data_stats_attribute_id ON data_stats (attribute_id)"
        )
    )
    conn.execute(sa_text("CREATE INDEX ix_data_stats_date ON data_stats (date)"))
