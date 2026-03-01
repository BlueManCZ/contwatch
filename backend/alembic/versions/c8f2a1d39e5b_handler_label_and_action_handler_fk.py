"""handler label and action handler_id FK

Revision ID: c8f2a1d39e5b
Revises: 3a0b935d16fa
Create Date: 2026-03-01 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c8f2a1d39e5b"
down_revision: Union[str, Sequence[str]] = "3a0b935d16fa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Handler label column ---
    op.add_column("handlers", sa.Column("label", sa.String(length=150), nullable=True))
    # Migrate existing labels from options JSONB
    op.execute("UPDATE handlers SET label = options->>'label' WHERE options->>'label' IS NOT NULL")

    # --- Action handler_id FK ---
    op.add_column(
        "actions",
        sa.Column("handler_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        op.f("fk_actions_handler_id_handlers"),
        "actions",
        "handlers",
        ["handler_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # --- Update widget_switches FKs to SET NULL on action delete ---
    # Drop existing FKs
    op.drop_constraint(
        op.f("fk_widget_switches_action_on_id_actions"), "widget_switches", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("fk_widget_switches_action_off_id_actions"), "widget_switches", type_="foreignkey"
    )
    # Recreate with SET NULL
    op.create_foreign_key(
        op.f("fk_widget_switches_action_on_id_actions"),
        "widget_switches",
        "actions",
        ["action_on_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        op.f("fk_widget_switches_action_off_id_actions"),
        "widget_switches",
        "actions",
        ["action_off_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # Restore widget_switches FKs without SET NULL
    op.drop_constraint(
        op.f("fk_widget_switches_action_off_id_actions"), "widget_switches", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("fk_widget_switches_action_on_id_actions"), "widget_switches", type_="foreignkey"
    )
    op.create_foreign_key(
        op.f("fk_widget_switches_action_on_id_actions"),
        "widget_switches",
        "actions",
        ["action_on_id"],
        ["id"],
    )
    op.create_foreign_key(
        op.f("fk_widget_switches_action_off_id_actions"),
        "widget_switches",
        "actions",
        ["action_off_id"],
        ["id"],
    )

    op.drop_constraint(op.f("fk_actions_handler_id_handlers"), "actions", type_="foreignkey")
    op.drop_column("actions", "handler_id")
    op.drop_column("handlers", "label")
