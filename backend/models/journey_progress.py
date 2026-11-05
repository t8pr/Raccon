import uuid
from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

class JourneyProgress(SQLModel, table=True):
    __tablename__ = "journey_progress"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    event_id: uuid.UUID = Field(foreign_key="events.id", ondelete="CASCADE", index=True)
    user_hash: str = Field(index=True) 
    current_sequence: int = Field(default=0) 
    score: int = Field(default=0) 
    status: str = Field(default="active") 
    frozen_until: Optional[datetime] = Field(default=None) 
    visited_sequences: List[int] = Field(default_factory=list, sa_column=Column(JSONB))