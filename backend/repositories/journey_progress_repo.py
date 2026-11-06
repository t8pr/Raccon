from sqlmodel import Session, select, desc
from models import JourneyProgress
import uuid
from typing import List

class JourneyProgressRepository:
    def __init__(self, session: Session):
        self.session = session
    
    def get_user_journey(self, event_id: uuid.UUID, user_hash: str) -> JourneyProgress | None:
        return self.session.exec(
            select(JourneyProgress).where(
                (JourneyProgress.event_id == event_id) & 
                (JourneyProgress.user_hash == user_hash)
            )
        ).first()
    
    def add_progress(self, new_progress: JourneyProgress) -> None:
        self.session.add(new_progress)

    def get_top_players(self, event_id: uuid.UUID) -> None:
        statement = select(JourneyProgress.user_hash, JourneyProgress.score).where(JourneyProgress.event_id == event_id).order_by(desc(JourneyProgress.score)).limit(10)
        return self.session.exec(statement).mappings().all()
        