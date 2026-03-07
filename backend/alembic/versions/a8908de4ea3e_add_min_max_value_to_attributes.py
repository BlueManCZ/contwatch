"""add_min_max_value_to_attributes

Revision ID: a8908de4ea3e
Revises: d5f0c1ae7a1d
Create Date: 2026-03-07 11:02:48.638716

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8908de4ea3e'
down_revision: Union[str, Sequence[str], None] = 'd5f0c1ae7a1d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('attributes', sa.Column('min_value', sa.Float(), nullable=True))
    op.add_column('attributes', sa.Column('max_value', sa.Float(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('attributes', 'max_value')
    op.drop_column('attributes', 'min_value')
