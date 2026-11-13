"""add scanned_at to journey_progress

Revision ID: 95fc423ddcf5
Revises: ac4df015eb7f
Create Date: 2026-11-13 16:51:49.371691

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '95fc423ddcf5'
down_revision: Union[str, Sequence[str], None] = 'ac4df015eb7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "journey_progress",
        sa.Column(
            "scanned_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("journey_progress", "scanned_at")
    