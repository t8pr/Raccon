import uuid
from pydantic import BaseModel
from typing import Optional

class PackClaimRequest(BaseModel):
    master_auth_hash: str

class PackResponse(BaseModel):
    id: uuid.UUID
    mode: str
    tags_count: int
    owner_id: Optional[uuid.UUID]