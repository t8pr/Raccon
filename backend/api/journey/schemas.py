from pydantic import BaseModel, model_validator
from typing import Optional, Dict, Any, Literal
from api.events.schemas import TagContent

class TagScanRequest(BaseModel):
    tag_hash: str
    injected_user_hash: str

class TagScanResponse(BaseModel):
    status: str
    message: str
    tag_sequence: int
    tag_type: Optional[str] = None
    content: Optional[TagContent] = None
    current_score: int = 0

class SetTrapRequest(BaseModel):
    tag_hash: str
    injected_user_hash: str
    trap_type: Literal["boom", "freeze"]
    trap_value: int

    @model_validator(mode='after')
    def validate_trap_rules(self) -> 'SetTrapRequest':
        if self.trap_type == "boom" and self.trap_value != 1:
            raise ValueError("Current boom value must be 1.")
        if self.trap_type == "freeze" and (self.trap_value <= 0 or self.trap_value > 180):
            raise ValueError("Freeze duration must be between 1 and 180 seconds.")
        return self