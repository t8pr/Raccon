import uuid
from pydantic import BaseModel, Field
from typing import List, Literal

class PackGenerateRequest(BaseModel):
    mode: Literal["open", "seq"] 
    tags_count: int
    quantity: int = Field(default=1, ge=1)

class TagInfo(BaseModel):
    id: uuid.UUID
    static_hash: str
    sequence_num: int
    is_printed: bool

class PackGenerateResponse(BaseModel):
    pack_id: uuid.UUID
    master_auth_hash: str
    tags: List[TagInfo]

class FactoryTagView(BaseModel):
    sequence_num: int
    tag_id: uuid.UUID
    print_url: str
    is_printed: bool

class FactoryPackResponse(BaseModel):
    pack_id: uuid.UUID
    mode: str
    tags_to_program: List[FactoryTagView]