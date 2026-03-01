"""handler last_active column

Revision ID: a1b2c3d4e5f6
Revises: c8f2a1d39e5b
Create Date: 2026-03-01 18:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str]] = "c8f2a1d39e5b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("handlers", sa.Column("last_active", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("handlers", "last_active")
