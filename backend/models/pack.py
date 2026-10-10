import uuid
from typing import Optional
from sqlmodel import SQLModel, Field

class Pack(SQLModel, table=True):
    __tablename__ = "packs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)
    mode: str
    tags_count: int
    master_auth_hash: str = Field(unique=True, index=True)