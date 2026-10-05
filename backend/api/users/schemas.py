import uuid
from pydantic import BaseModel, Field
from typing import Optional 

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    username: str
    email: str
    phone_number: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = Field(None, pattern=r"^[a-z0-9_]+$")
    phone_number: Optional[str] = Field(None, pattern=r"^\d{9}$")