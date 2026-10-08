import uuid
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    phone_number: str
    password: str
