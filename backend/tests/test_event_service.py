import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException
import uuid
from models import Event, EventTag, JourneyProgress, Pack, Tag, User
from api.events.schemas import EventSetupRequest, TagConfig, TagContent
from services.event_service import EventService


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


# Default pack values, each test will overwrite it accordingly.
@pytest.fixture
def pack(user):
    return Pack(
        owner_id=user.id,
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
        edit_count=0,
    )


@pytest.fixture
def tag(pack):
    return Tag(
        pack_id=pack.id,
        static_hash="ZtFmeN",
        sequence_num=1,
    )


@pytest.fixture
def session():
    return Mock()


@pytest.fixture
def event_service(session, event, pack, tag):
    with patch("services.event_service.StorageService"): # Im ignoring images testing for now
        service = EventService(session=session)

    service.events = Mock(spec=["lock_event", "add_event"])
    service.packs = Mock(spec=["get_pack"])
    service.tags = Mock(spec=["get_by_pack_id"])
    service.event_tags = Mock(
        spec=["get_exisiting_event_tag", "add_event_tag", "get_all_by_event_id"]
    )
    service.journey_progress_repo = Mock(spec=["has_participants"])

    service.events.lock_event.return_value = event
    service.packs.get_pack.return_value = pack
    service.tags.get_by_pack_id.return_value = [tag]
    service.event_tags.get_exisiting_event_tag.return_value = None
    service.journey_progress_repo.has_participants.return_value = False

    return service


def test_sequential_pack_rejects_traps(
    event_service, session, pack, event, tag
):
    request = EventSetupRequest(
        tags_config=[
            TagConfig(
                tag_id=tag.id,
                tag_type="trap",
                content=TagContent(boom=1),
            )
        ]
    )

    with pytest.raises(HTTPException) as exc:
        event_service.configure_tag(
            pack, event, request, event_service.storage_service
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == (
        "Only packs in 'open' mode can have trap tags configured."
    )
    event_service.event_tags.add_event_tag.assert_not_called()
    session.commit.assert_not_called()


@pytest.mark.parametrize("event_status", ["draft", "live"])
def test_edit_requires_paused_event(
    event_service, session, user, event, event_status
):
    event.status = event_status

    with pytest.raises(HTTPException) as exc:
        event_service.edit_event(
            user, event.id, EventSetupRequest(tags_config=[])
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Edits are allowed in paused events only."
    assert event.edit_count == 0
    event_service.events.add_event.assert_not_called()
    session.commit.assert_not_called()


def test_open_event_with_players_requires_reset(
    event_service, session, user, event, pack
):
    event.status = "paused"
    pack.mode = "open"
    event_service.journey_progress_repo.has_participants.return_value = True

    with pytest.raises(HTTPException) as exc:
        event_service.edit_event(
            user, event.id, EventSetupRequest(tags_config=[])
        )

    assert exc.value.status_code == 409
    assert exc.value.detail == "Reseting open hunt event is required."
    assert event.edit_count == 0
    event_service.events.add_event.assert_not_called()
    session.commit.assert_not_called()


@pytest.mark.parametrize("edit_count", [3, 4])
def test_edit_limit_is_enforced(
    event_service, session, user, event, edit_count
):
    event.status = "paused"
    event.edit_count = edit_count

    with patch("services.event_service.settings.MAX_EDIT_LIMIT", 3):
        with pytest.raises(HTTPException) as exc:
            event_service.edit_event(
                user, event.id, EventSetupRequest(tags_config=[])
            )

    assert exc.value.status_code == 400
    assert exc.value.detail == "You have reached the maximum edit limit."
    assert event.edit_count == edit_count
    event_service.events.add_event.assert_not_called()
    session.commit.assert_not_called()


@pytest.mark.parametrize("edit_count", [0, 2])
def test_successful_edit_increments_count(
    event_service, session, user, event, tag, edit_count
):
    event.status = "paused"
    event.edit_count = edit_count
    request = EventSetupRequest(
        tags_config=[
            TagConfig(tag_id=tag.id, content=TagContent(hint="Updated hint"))
        ]
    )

    with patch("services.event_service.settings.MAX_EDIT_LIMIT", 3):
        result = event_service.edit_event(user, event.id, request)

    assert event.edit_count == edit_count + 1
    assert result == {
        "edit_count": edit_count + 1,
        "edits_remaining": 3 - (edit_count + 1),
        "max_edits": 3,
    }
    saved = event_service.event_tags.add_event_tag.call_args.args[0]
    assert saved.event_id == event.id
    assert saved.tag_id == tag.id
    assert saved.tag_type == "clue"
    assert saved.content == {"hint": "Updated hint"}
    event_service.event_tags.add_event_tag.assert_called_once()
    event_service.events.add_event.assert_called_once_with(event)
    session.commit.assert_called_once()
