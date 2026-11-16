import pytest
from datetime import datetime, timedelta, timezone
import uuid
from unittest.mock import Mock
from models import Event, EventTag, JourneyProgress, Pack, Tag, User
from services.journey_service import JourneyService
from fastapi import HTTPException


# Each test case gets a new test user.
@pytest.fixture
def user():
    return User(
        name="test user",
        username="testuser",
        email="testing@gmail.com",
        phone_number="0500000000",
        password="password123",
        user_hash="test-user-hash",
    )

# Default pack values, each test will overwrite it accordingly
@pytest.fixture
def pack():
    return Pack(
        mode="seq",
        tags_count=3,
        master_auth_hash="master",
    )


@pytest.fixture
def event(pack):
    return Event(
        pack_id=pack.id, 
        status="draft",
        title="test event",
        edit_count = 3
        )


@pytest.fixture
def tag(pack):
    return Tag(
        pack_id=pack.id,
        static_hash="ZtFmeN",
        sequence_num=1,
    )

@pytest.fixture
def event_tag(event, tag):
    return EventTag(
        event_id=event.id,
        tag_id=tag.id,
        tag_type="clue",
        content={"hint": "myhint"},
    )

@pytest.fixture
def journey_progress(user, event):
    return JourneyProgress(
        event_id=event.id,
        user_hash=user.user_hash,
        current_sequence=0,
        score=0,
        status="active",
        frozen_until=None,
        visited_sequences=[],
        scanned_at=None,
    )

@pytest.fixture
def session():
    return Mock()


@pytest.fixture
def journey_service(
    session, tag, event, pack, event_tag, journey_progress
):
    service = JourneyService(session=session)

    service.tags = Mock(spec=["get_by_static_hash"])
    service.events = Mock(spec=["get_by_pack_id", "lock_event"])
    service.packs = Mock(spec=["get_pack"])
    service.event_tags = Mock(
        spec=["get_exisiting_event_tag", "get_all_by_event_id", "add_event_tag"]
    )
    service.journey_progress_repo = Mock(
        spec=["get_user_journey", "add_progress", "update_status"]
    )
    service.users = Mock(spec=["get_by_user_hash"])

    service.tags.get_by_static_hash.return_value = tag
    service.events.get_by_pack_id.return_value = event
    service.events.lock_event.return_value = event
    service.packs.get_pack.return_value = pack
    service.event_tags.get_exisiting_event_tag.return_value = event_tag
    service.event_tags.get_all_by_event_id.return_value = [event_tag]
    service.journey_progress_repo.get_user_journey.return_value = (
        journey_progress
    )

    return service

def test_link_sharing_violation(journey_service, session, user, tag):
    with pytest.raises(HTTPException) as exc:
        journey_service.scan_tag(
            user=user,
            tag_hash= tag.static_hash,
            injected_user_hash="another-user",
        )

    assert exc.value.status_code == 403
    assert exc.value.detail == "Security Violation: Link sharing detected."
    journey_service.tags.get_by_static_hash.assert_not_called()
    session.commit.assert_not_called()


def test_valid_open_mode_claim(
    journey_service, session, user, tag, event, pack, event_tag,
    journey_progress
):
    event.status = "live"
    pack.mode = "open"

    # keep unscanned clue to keep round active.
    another_clue = EventTag(
        event_id=event.id,
        tag_id=uuid.uuid4(),
        tag_type="clue",
        content={},
    )
    journey_service.event_tags.get_all_by_event_id.return_value = [
        event_tag,
        another_clue,
    ]

    result = journey_service.scan_tag(
        user=user,
        tag_hash=tag.static_hash,
        injected_user_hash=user.user_hash,
    )

    assert result["status"] == "success"
    assert result["current_score"] == 1
    assert result["remaining_tags"] == pack.tags_count - 1
    assert result["event_finished"] is False
    assert event_tag.content == {
        "hint": "myhint",
        "claimed_by": user.user_hash,
    }
    assert journey_progress.score == 1
    assert journey_progress.visited_sequences == [tag.sequence_num]
    assert journey_progress.status == "active"
    assert journey_progress.scanned_at is not None
    journey_service.event_tags.add_event_tag.assert_called_once_with(event_tag)
    journey_service.journey_progress_repo.add_progress.assert_called_once_with(
        journey_progress
    )
    session.flush.assert_called_once()
    session.commit.assert_called_once()


# Pytest will run the test once for each status
@pytest.mark.parametrize("event_status", ["draft", "paused"])
def test_non_live_event_scan_rejection(
    journey_service, session, user, tag, event, event_status
):
    event.status = event_status

    with pytest.raises(HTTPException) as exc:
        journey_service.scan_tag(
            user=user,
            tag_hash=tag.static_hash,
            injected_user_hash=user.user_hash,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "This event is not live."
    session.commit.assert_not_called()

@pytest.mark.parametrize(
    ("current_sequence", "tag_sequence", "error_code"),
    [(1, 1, "already_scanned"),
     (0, 2, "skipped_tag"),
    ],
)
def test_invalid_sequence_scan_order(
    journey_service,
    session,
    user,
    tag,
    event,
    journey_progress,
    current_sequence,
    tag_sequence,
    error_code,
):
    event.status = "live"
    tag.sequence_num = tag_sequence
    journey_progress.current_sequence = current_sequence
    journey_progress.score = current_sequence

    with pytest.raises(HTTPException) as exc:
        journey_service.scan_tag(
            user=user,
            tag_hash=tag.static_hash,
            injected_user_hash=user.user_hash,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail["code"] == error_code
    assert journey_progress.score == current_sequence
    assert journey_progress.current_sequence == current_sequence
    session.commit.assert_not_called()


@pytest.mark.parametrize(
    ("claimed_user", "error_code"),
    [
        ("test-user-hash", "already_scanned"),
        ("test-user-hash2", "claimed_by_another_player"),
    ],
)
def test_open_scan_rejects_claimed_clue(
    journey_service, session, user, tag, event, pack, event_tag,
    journey_progress, claimed_user, error_code
):
    event.status = "live"
    pack.mode = "open"
    event_tag.content = {"claimed_by": claimed_user}
    journey_service.users.get_by_user_hash.return_value = User(
        name="test user2",
        username="testuser2",
        email="testing2@gmail.com",
        phone_number="0500000001",
        password="password1234",
        user_hash="test-user-hash2",
    )

    # Keep a clue unscanned so the round remains active
    another_clue = EventTag(
        event_id=event.id,
        tag_id=uuid.uuid4(),
        tag_type="clue",
        content={},
    )
    journey_service.event_tags.get_all_by_event_id.return_value = [
        event_tag,
        another_clue,
    ]

    with pytest.raises(HTTPException) as exc:
        journey_service.scan_tag(
            user=user,
            tag_hash=tag.static_hash,
            injected_user_hash=user.user_hash,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail["code"] == error_code
    assert event_tag.content == {"claimed_by": claimed_user}
    assert journey_progress.score == 0
    assert journey_progress.visited_sequences == []
    journey_service.journey_progress_repo.add_progress.assert_not_called()
    session.commit.assert_not_called()


def test_boom_trap_cannot_make_score_negative(
    journey_service, session, user, tag, event, pack, event_tag,
    journey_progress
):
    event.status = "live"
    pack.mode = "open"
    journey_progress.score = 2
    event_tag.tag_type = "trap"
    event_tag.content = {"boom": 5}

    result = journey_service.scan_tag(
        user=user,
        tag_hash=tag.static_hash,
        injected_user_hash=user.user_hash,
    )

    assert result["status"] == "trap_triggered"
    assert result["current_score"] == 0
    assert journey_progress.score == 0
    assert journey_progress.visited_sequences == [tag.sequence_num]
    journey_service.journey_progress_repo.add_progress.assert_called_once_with(
        journey_progress
    )
    session.commit.assert_called_once()


def test_frozen_player_cannot_scan(
    journey_service, session, user, tag, event, journey_progress
):
    event.status = "live"
    journey_progress.frozen_until = (
        datetime.now(timezone.utc) + timedelta(days=1)
    )

    with pytest.raises(HTTPException) as exc:
        journey_service.scan_tag(
            user=user,
            tag_hash=tag.static_hash,
            injected_user_hash=user.user_hash,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail["code"] == "freeze"
    assert journey_progress.score == 0
    assert journey_progress.visited_sequences == []
    journey_service.journey_progress_repo.add_progress.assert_not_called()
    session.commit.assert_not_called()


def test_successful_sequential_scan(
    journey_service, session, user, tag, event, journey_progress
):
    event.status = "live"

    result = journey_service.scan_tag(
        user=user,
        tag_hash=tag.static_hash,
        injected_user_hash=user.user_hash,
    )

    assert result["status"] == "success"
    assert result["current_score"] == 1
    assert result["remaining_tags"] == 2
    assert result["event_finished"] is False
    assert journey_progress.score == 1
    assert journey_progress.current_sequence == 1
    assert journey_progress.status == "active"
    assert journey_progress.scanned_at is not None
    journey_service.journey_progress_repo.add_progress.assert_called_once_with(
        journey_progress
    )
    journey_service.journey_progress_repo.update_status.assert_not_called()
    session.commit.assert_called_once()


def test_final_open_claim_completes_round(
    journey_service, session, user, tag, event, pack, event_tag,
    journey_progress
):
    event.status = "live"
    pack.mode = "open"
    pack.tags_count = 1

    result = journey_service.scan_tag(
        user=user,
        tag_hash=tag.static_hash,
        injected_user_hash=user.user_hash,
    )

    assert result["status"] == "success"
    assert result["event_finished"] is True
    assert result["remaining_tags"] == 0
    assert result["current_score"] == 1
    assert event_tag.content["claimed_by"] == user.user_hash
    assert journey_progress.score == 1
    assert journey_progress.visited_sequences == [tag.sequence_num]
    journey_service.event_tags.add_event_tag.assert_called_once_with(event_tag)
    journey_service.journey_progress_repo.update_status.assert_called_once_with(
        event.id
    )
    session.flush.assert_called_once()
    session.commit.assert_called_once()


@pytest.mark.parametrize(("trap_type", "trap_value"), [("boom", 1), ("freeze", 30)])
def test_choose_trap_activation(
    journey_service, session, user, tag, event, pack, event_tag,
    trap_type, trap_value
):
    event.status = "live"
    pack.mode = "open"
    event_tag.tag_type = "trap"
    event_tag.content = {"choose": True}

    result = journey_service.set_player_trap(
        user=user,
        tag_hash=tag.static_hash,
        injected_user_hash=user.user_hash,
        trap_type=trap_type,
        trap_value=trap_value,
    )

    assert result["status"] == "success"
    assert event_tag.content == {trap_type: trap_value, "was_choose": True}
    assert result["content"] == event_tag.content
    journey_service.event_tags.add_event_tag.assert_called_once_with(event_tag)
    session.commit.assert_called_once()
