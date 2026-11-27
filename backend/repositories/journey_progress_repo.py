from sqlmodel import Session, select, desc, update
from models import JourneyProgress, User
import uuid
from typing import List
from sqlalchemy import func


class JourneyProgressRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_user_journey(
        self, event_id: uuid.UUID, user_hash: str
    ) -> JourneyProgress | None:
        return self.session.exec(
            select(JourneyProgress).where(
                (JourneyProgress.event_id == event_id)
                & (JourneyProgress.user_hash == user_hash)
            )
        ).first()

    def add_progress(self, new_progress: JourneyProgress) -> None:
        self.session.add(new_progress)

    def get_top_players(
        self, event_id: uuid.UUID, user_hash: str | None = None,
    ) -> list[dict]:
        ordering = (
            JourneyProgress.score.desc(),
            JourneyProgress.scanned_at.asc(),
            User.name.asc(),
            JourneyProgress.user_hash.asc(),
        )

        statement = (
            select(
                JourneyProgress.user_hash,
                User.name,
                User.avatar_id,
                JourneyProgress.score,
            )
            .join(User, User.user_hash == JourneyProgress.user_hash)
            .where(JourneyProgress.event_id == event_id)
        )

        top_query = statement.order_by(*ordering).limit(3)

        players = [dict(row) for row in self.session.exec(top_query).mappings().all()]

        for rank, player in enumerate(players, start=1):
            player["rank"] = rank

        # for shared leaderboard channel
        if user_hash is None:
            return players

        # If the user is already in top 10 return
        if any(player["user_hash"] == user_hash for player in players):
            return players

        ranked_players = statement.add_columns(
            func.row_number().over(order_by=ordering).label("rank")
        ).subquery()

        user_query = select(ranked_players).where(
            ranked_players.c.user_hash == user_hash
        )

        current_player = self.session.execute(user_query).mappings().one_or_none()

        if current_player is not None:
            return [*players[:2], dict(current_player)] # replace the third player

        return players
    
    def get_ranked_players(self, event_id: uuid.UUID) -> list[dict]:
        ordering = (
            JourneyProgress.score.desc(),
            JourneyProgress.scanned_at.asc(),
            User.name.asc(),
            JourneyProgress.user_hash.asc(),
        )

        statement = (
            select(
                JourneyProgress.user_hash,
                User.name,
                User.avatar_id,
                JourneyProgress.score,
                func.row_number().over(order_by=ordering).label("rank"),
            )
            .join(User, User.user_hash == JourneyProgress.user_hash)
            .where(JourneyProgress.event_id == event_id)
            .order_by(*ordering)
        )

        return [
            dict(row)
            for row in self.session.exec(statement).mappings().all()
        ]

    def update_status(self, event_id: uuid.UUID) -> None:
        statement = (
            update(JourneyProgress)
            .where(JourneyProgress.event_id == event_id)
            .values(status="completed")
            .execution_options(synchronize_session="fetch")
        )
        self.session.exec(statement)

    def has_participants(self, event_id: uuid.UUID) -> bool:
        statement = (
            select(JourneyProgress.id)
            .where(JourneyProgress.event_id == event_id)
            .limit(1)
        )
        return self.session.exec(statement).first() is not None
