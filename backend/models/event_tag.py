import uuid
from typing import Dict, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

class EventTag(SQLModel, table=True):
    __tablename__ = "event_tags"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    event_id: uuid.UUID = Field(foreign_key="events.id", index=True)
    tag_id: uuid.UUID = Field(foreign_key="tags.id", index=True)
    tag_type: str = Field(default="clue") 
    content: Dict[str, Any] = Field(default={}, sa_column=Column(JSONB))