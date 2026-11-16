import uuid
import pytest
from unittest.mock import Mock
from fastapi import HTTPException
from models import Pack, User
from services.pack_service import PackService


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


@pytest.fixture
def pack():
    return Pack(
        mode="seq",
        tags_count=3,
        master_auth_hash="master",
    )


@pytest.fixture
def session():
    return Mock()


@pytest.fixture
def pack_service(session, pack):
    service = PackService(session=session)
    service.packs = Mock(spec=["get_by_master_auth", "add_pack"])
    service.events = Mock(spec=["add_event"])
    service.packs.get_by_master_auth.return_value = pack
    return service


def test_claim_rejects_pack_owned_by_another_user(pack_service, session, user, pack):
    owner_id = uuid.uuid4()
    pack.owner_id = owner_id

    with pytest.raises(HTTPException) as exc:
        pack_service.claim_pack(user, pack.master_auth_hash)

    assert exc.value.status_code == 400
    assert exc.value.detail == "This pack has already been claimed by another user."
    assert pack.owner_id == owner_id
    pack_service.packs.add_pack.assert_not_called()
    pack_service.events.add_event.assert_not_called()
    session.commit.assert_not_called()


def test_successful_claim_assigns_owner_and_creates_event(
    pack_service, session, user, pack
):
    result = pack_service.claim_pack(user, pack.master_auth_hash)

    assert result is pack
    assert pack.owner_id == user.id
    pack_service.packs.get_by_master_auth.assert_called_once_with(
        pack.master_auth_hash
    )
    pack_service.packs.add_pack.assert_called_once_with(pack)
    pack_service.events.add_event.assert_called_once()
    created_event = pack_service.events.add_event.call_args.args[0]
    assert created_event.pack_id == pack.id
    assert created_event.status == "draft"
    session.commit.assert_called_once()
    session.refresh.assert_called_once_with(pack)
