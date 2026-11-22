import uuid
import string
import secrets
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, DateTime
from datetime import datetime, timezone

def generate_user_hash() -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(8))

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_hash: str = Field(default_factory=generate_user_hash, unique=True, index=True)
    name: str
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    phone_number: str
    password: str
    role: str = Field(default="user")
    avatar_id: int = Field(default=1)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pass_reset_requested_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
    pass_reset_token_hash: str | None = Field(default=None, unique=True, index=True)