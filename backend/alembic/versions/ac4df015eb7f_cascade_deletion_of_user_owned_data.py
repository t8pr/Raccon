"""cascade deletion of user owned data

Revision ID: ac4df015eb7f
Revises: 6333893c2ce7
Create Date: 2026-11-05 12:59:39.640587

"""

from typing import Sequence, Union

from alembic import op


revision: str = "ac4df015eb7f"
down_revision: Union[str, Sequence[str], None] = "6333893c2ce7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Enable cascading deletion of user-owned data."""
    op.drop_constraint(
        "event_tags_event_id_fkey", "event_tags", type_="foreignkey"
    )
    op.create_foreign_key(
        "event_tags_event_id_fkey",
        "event_tags",
        "events",
        ["event_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint(
        "event_tags_tag_id_fkey", "event_tags", type_="foreignkey"
    )
    op.create_foreign_key(
        "event_tags_tag_id_fkey",
        "event_tags",
        "tags",
        ["tag_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint(
        "events_pack_id_fkey", "events", type_="foreignkey"
    )
    op.create_foreign_key(
        "events_pack_id_fkey",
        "events",
        "packs",
        ["pack_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint(
        "journey_progress_event_id_fkey",
        "journey_progress",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "journey_progress_event_id_fkey",
        "journey_progress",
        "events",
        ["event_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint(
        "packs_owner_id_fkey", "packs", type_="foreignkey"
    )
    op.create_foreign_key(
        "packs_owner_id_fkey",
        "packs",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint(
        "tags_pack_id_fkey", "tags", type_="foreignkey"
    )
    op.create_foreign_key(
        "tags_pack_id_fkey",
        "tags",
        "packs",
        ["pack_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Restore foreign keys without cascading deletion."""
    op.drop_constraint(
        "tags_pack_id_fkey", "tags", type_="foreignkey"
    )
    op.create_foreign_key(
        "tags_pack_id_fkey",
        "tags",
        "packs",
        ["pack_id"],
        ["id"],
    )

    op.drop_constraint(
        "packs_owner_id_fkey", "packs", type_="foreignkey"
    )
    op.create_foreign_key(
        "packs_owner_id_fkey",
        "packs",
        "users",
        ["owner_id"],
        ["id"],
    )

    op.drop_constraint(
        "journey_progress_event_id_fkey",
        "journey_progress",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "journey_progress_event_id_fkey",
        "journey_progress",
        "events",
        ["event_id"],
        ["id"],
    )

    op.drop_constraint(
        "events_pack_id_fkey", "events", type_="foreignkey"
    )
    op.create_foreign_key(
        "events_pack_id_fkey",
        "events",
        "packs",
        ["pack_id"],
        ["id"],
    )

    op.drop_constraint(
        "event_tags_tag_id_fkey", "event_tags", type_="foreignkey"
    )
    op.create_foreign_key(
        "event_tags_tag_id_fkey",
        "event_tags",
        "tags",
        ["tag_id"],
        ["id"],
    )

    op.drop_constraint(
        "event_tags_event_id_fkey", "event_tags", type_="foreignkey"
    )
    op.create_foreign_key(
        "event_tags_event_id_fkey",
        "event_tags",
        "events",
        ["event_id"],
        ["id"],
    )