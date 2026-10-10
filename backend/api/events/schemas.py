import uuid
from pydantic import BaseModel
from typing import List, Dict, Any

class EventCreateRequest(BaseModel):
    pack_id: uuid.UUID
    title: str

class EventResponse(BaseModel):
    id: uuid.UUID
    pack_id: uuid.UUID
    title: str
    status: str

class TagConfig(BaseModel):
    tag_id: uuid.UUID
    tag_type: str = "clue"
    content: Dict[str, Any]

class EventSetupRequest(BaseModel):
    tags_config: List[TagConfig]


class TagScanRequest(BaseModel):
    tag_hash: str
    injected_user_hash: str

class TagScanResponse(BaseModel):
    status: str
    message: str
    tag_sequence: int