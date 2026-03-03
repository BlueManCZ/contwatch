"""merge logging_message date+time into timestamp

Revision ID: e7a3f1b2c4d8
Revises: 64cdc243d449
Create Date: 2026-03-03 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e7a3f1b2c4d8"
down_revision: Union[str, None] = "49ffc72226c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add timestamp column (nullable initially for backfill)
    op.add_column(
        "logging_messages",
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=True),
    )

    # Backfill: PostgreSQL date + time → timestamp
    op.execute("UPDATE logging_messages SET timestamp = date + time")

    # Set NOT NULL
    op.alter_column("logging_messages", "timestamp", nullable=False)

    # Drop old columns and index
    op.drop_index("ix_logging_messages_date", table_name="logging_messages")
    op.drop_column("logging_messages", "date")
    op.drop_column("logging_messages", "time")

    # Create new index on timestamp
    op.create_index("ix_logging_messages_timestamp", "logging_messages", ["timestamp"])


def downgrade() -> None:
    # Re-add date and time columns
    op.add_column(
        "logging_messages",
        sa.Column("date", sa.Date(), nullable=True),
    )
    op.add_column(
        "logging_messages",
        sa.Column("time", sa.Time(), nullable=True),
    )

    # Backfill from timestamp
    op.execute("UPDATE logging_messages SET date = timestamp::date, time = timestamp::time")

    # Set NOT NULL
    op.alter_column("logging_messages", "date", nullable=False)
    op.alter_column("logging_messages", "time", nullable=False)

    # Restore index
    op.drop_index("ix_logging_messages_timestamp", table_name="logging_messages")
    op.create_index("ix_logging_messages_date", "logging_messages", ["date"])

    # Drop timestamp
    op.drop_column("logging_messages", "timestamp")
