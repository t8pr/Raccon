import uuid
from sqlmodel import SQLModel, Field

class Event(SQLModel, table=True):
    __tablename__ = "events"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    pack_id: uuid.UUID = Field(foreign_key="packs.id", index=True)
    title: str = Field(default="untitled")
    status: str = Field(default="pending")