import uuid
from pydantic import BaseModel, Field
from typing import Optional 
from datetime import datetime

class UserResponse(BaseModel):
    id: uuid.UUID
    user_hash: str
    name: str
    username: str
    email: str
    phone_number: str
    avatar_id: int
    role: str = "user"
    created_at: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = Field(None, pattern=r"^[a-z0-9_]+$")
    phone_number: Optional[str] = Field(None, pattern=r"^\d{9}$")
    avatar_id: Optional[int] = None