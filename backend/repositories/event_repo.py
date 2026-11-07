from sqlmodel import Session, select
from models import Event
import uuid
from typing import List

class EventRepository:
    def __init__(self, session: Session):
        self.session = session
    
    def get_event(self, event_id: uuid.UUID) -> Event | None:
        return self.session.get(Event, event_id)
    
    def get_all_events(self, pack_ids: List) -> List[Event] | None:
        return self.session.exec(select(Event).where(Event.pack_id.in_(pack_ids))).all()
        
    def get_by_pack_id(self, pack_id: str) -> Event | None:
        return self.session.exec(select(Event).where(Event.pack_id == pack_id).order_by(Event.id.desc())).first()
    
    def add_event(self, new_event: Event) -> None:
        self.session.add(new_event)
        