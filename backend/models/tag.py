import uuid
from sqlmodel import SQLModel, Field

class Tag(SQLModel, table=True):
    __tablename__ = "tags"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    pack_id: uuid.UUID = Field(foreign_key="packs.id", index=True)
    static_hash: str = Field(index=True, unique=True)
    sequence_num: int 
    is_printed: bool = Field(default=False)