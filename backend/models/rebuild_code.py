from datetime import datetime, timezone
import uuid
from sqlmodel import Field, SQLModel


class RebuildCode(SQLModel, table=True):
    __tablename__ = "rebuild_codes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(index=True, unique=True, nullable=False)
    is_used: bool = Field(default=False, nullable=False)
    used_by_user_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="users.id",
        nullable=True,
        ondelete="SET NULL",
    )
    used_on_event_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="events.id",
        nullable=True,
        ondelete="SET NULL",
    )
    used_at: datetime | None = Field(default=None, nullable=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )