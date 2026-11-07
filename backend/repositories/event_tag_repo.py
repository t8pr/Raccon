from sqlmodel import Session, select
from models import EventTag
import uuid
from typing import List


class EventTagRepository:
    def __init__(self, session: Session):
        self.session = session
        
    def get_by_tag_id(self, event_tag_id: uuid.UUID) -> EventTag | None:
        return self.session.get(EventTag, event_tag_id)
    
    def get_all_by_event_id(self, event_id: uuid.UUID) -> List[EventTag] | None:
        return self.session.exec(select(EventTag).where(EventTag.event_id == event_id)).all()
    
    def get_by_event_id(self, event_id: uuid.UUID) -> EventTag | None:
            return self.session.exec(select(EventTag).where(EventTag.event_id == event_id)).first()
    
    def get_exisiting_event_tag(self, event_id: uuid.UUID, tag_id: uuid.UUID) -> EventTag | None:
        return self.session.exec(select(EventTag).where((EventTag.event_id == event_id) & (EventTag.tag_id == tag_id))).first()
    
    def add_event_tag(self, new_tag: EventTag) -> None:
        self.session.add(new_tag)