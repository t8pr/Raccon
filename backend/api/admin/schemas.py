import uuid
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from models.user import User

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

class PackAddTagsRequest(BaseModel):
    tags_count: int = Field(gt=0, strict=True)

class PackAddTagsResponse(BaseModel):
    pack_id: uuid.UUID
    tags_count: int
    tags: List[TagInfo]

class FactoryTagView(BaseModel):
    sequence_num: int
    tag_id: uuid.UUID
    print_url: str
    is_printed: bool

class FactoryPackResponse(BaseModel):
    pack_id: uuid.UUID
    mode: str
    owner_name: Optional[str] = None
    tags_to_program: List[FactoryTagView]

class AdminPackDetailResponse(BaseModel):
    pack_id: uuid.UUID
    mode: str
    tags_count: int
    master_auth_hash: str
    is_claimed: bool
    owner_id: Optional[uuid.UUID] = None
    owner_name: Optional[str] = None
    owner_username: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
