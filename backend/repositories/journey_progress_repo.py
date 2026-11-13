from sqlmodel import Session, select, desc, update
from models import JourneyProgress, User
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

    def get_top_players(self, event_id: uuid.UUID) -> list[dict]:
        statement = (
        select(
            JourneyProgress.user_hash,
            User.name,
            User.avatar_id,
            JourneyProgress.score,
        )
        .join(User, User.user_hash == JourneyProgress.user_hash)
        .where(JourneyProgress.event_id == event_id)
        .order_by(
            JourneyProgress.score.desc(),
            JourneyProgress.scanned_at.asc(),
            User.name.asc(),
            JourneyProgress.user_hash.asc(),
            ).limit(10)
        )

        return [
            dict(row)
            for row in self.session.exec(statement).mappings().all()
        ]

    def update_status(self, event_id: uuid.UUID) -> None:
        statement = update(JourneyProgress).where(JourneyProgress.event_id == event_id).values(status="completed").execution_options(synchronize_session="fetch")
        self.session.exec(statement)

    def has_participants(self, event_id: uuid.UUID) -> bool:
        statement = select(JourneyProgress.id).where(JourneyProgress.event_id == event_id).limit(1)
        return self.session.exec(statement).first() is not None