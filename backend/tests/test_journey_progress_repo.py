import pytest
from sqlalchemy import JSON, MetaData
from sqlmodel import Session, create_engine

from models import Event, JourneyProgress, Pack, User
from repositories.journey_progress_repo import JourneyProgressRepository


@pytest.fixture
def session():
    engine = create_engine("sqlite://")
    metadata = MetaData()
    for model in (User, Pack, Event, JourneyProgress):
        model.__table__.to_metadata(metadata)
    metadata.tables["journey_progress"].c.visited_sequences.type = JSON()
    metadata.create_all(engine)

    with Session(engine) as db_session:
        yield db_session
    engine.dispose()


@pytest.mark.parametrize(
    ("player_count", "current_rank", "expected_ranks"),
    [
        (14, 3, list(range(1, 11))),
        (14, 10, list(range(1, 11))),
        (14, 11, [*range(1, 11), 11]),
        (14, 14, [*range(1, 11), 14]),
        (2, 2, [1, 2]),
        (1, 1, [1]),
        (14, None, list(range(1, 11))),
    ],
)
def test_leaderboard_returns_top_plus_current_player(
    session, player_count, current_rank, expected_ranks
):
    pack = Pack(mode="seq", tags_count=20, master_auth_hash="test-pack")
    event = Event(pack_id=pack.id)
    session.add(pack)
    session.flush()
    session.add(event)
    session.flush()

    for rank in range(1, player_count + 1):
        user_hash = f"player-{rank}"
        session.add(
            User(
                user_hash=user_hash,
                name=user_hash,
                username=user_hash,
                email=f"{user_hash}@example.com",
                phone_number="0500000000",
                password="test-password",
            )
        )
        session.add(
            JourneyProgress(
                event_id=event.id,
                user_hash=user_hash,
                score=player_count - rank,
            )
        )
    session.flush()

    current_user_hash = f"player-{current_rank}" if current_rank else "unranked"
    players = JourneyProgressRepository(session).get_top_players(
        event.id, current_user_hash
    )

    assert [player["rank"] for player in players] == expected_ranks
    assert [player["user_hash"] for player in players] == [
        f"player-{rank}" for rank in expected_ranks
    ]
