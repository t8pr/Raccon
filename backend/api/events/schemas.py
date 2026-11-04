import uuid
from pydantic import BaseModel, model_validator
from typing import List, Dict, Any, Optional, Literal

class EventCreateRequest(BaseModel):
    pack_id: uuid.UUID
    title: str

class EventResponse(BaseModel):
    id: uuid.UUID
    pack_id: uuid.UUID
    title: str
    status: str

class TagContent(BaseModel):
    hint: Optional[str] = None
    image: Optional[str] = None
    
    boom: Optional[int] = None
    freeze: Optional[int] = None
    choose: Optional[bool] = None
    was_choose: Optional[bool] = None
    
    claimed_by: Optional[str] = None

class TagConfig(BaseModel):
    tag_id: uuid.UUID
    tag_type: Literal["clue", "trap"] = "clue"
    content: TagContent

    @model_validator(mode='after')
    def clean_and_validate_content(self) -> 'TagConfig':
        c = self.content
        
        c.claimed_by = None
        c.was_choose = None
        
        if self.tag_type == "clue":
            c.boom = c.freeze = c.choose = None
            
        elif self.tag_type == "trap":
            c.hint = c.image = None
            
            c.boom = c.boom if c.boom else None
            c.freeze = c.freeze if c.freeze else None
            c.choose = c.choose if c.choose else None
            
            if sum(bool(x) for x in (c.boom, c.freeze, c.choose)) != 1:
                raise ValueError("tag_type 'trap' must have exactly one of 'boom', 'freeze', or 'choose' set.")
            
            if c.freeze and c.freeze > 180:
                raise ValueError("tag_type 'trap' with 'freeze' must have a value between 1 and 180 seconds.")
            
            if c.boom and c.boom != 1:
                raise ValueError("tag_type 'trap' with 'boom' must have a value of 1.")
                
        return self

class EventSetupRequest(BaseModel):
    tags_config: List[TagConfig]

class EventTagConfigView(BaseModel):
    sequence_num: int
    tag_id: uuid.UUID
    tag_type: Optional[str] = None
    content: Optional[TagContent] = None
    is_configured: bool

class EventUpdateRequest(BaseModel):
    title: Optional[str] = None
    status: Optional[Literal["draft", "paused", "live"]] = None

class EventBase(BaseModel):
    id: uuid.UUID
    pack_id: uuid.UUID
    title: str
    status: str

class EventDetailResponse(EventBase):
    mode: str
    tags: List[EventTagConfigView]
    edit_count: int
    edits_remaining: int
    max_edits: int

