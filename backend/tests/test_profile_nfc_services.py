from unittest.mock import Mock
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi import HTTPException
from sqlmodel import Session, create_engine

from core.security import create_access_token
from models import User
from services.nfc_service import NfcService
from services.user_service import UserService


@pytest.fixture
def profiles():
    engine = create_engine("sqlite://")
    User.__table__.create(engine)
    try:
        with Session(engine) as session:
            users = [
                User(name=name, username=name.lower(), email=f"{name}@example.com",
                     phone_number="0500000000", password="test-password")
                for name in ("Alice", "Bob")
            ]
            session.add_all(users)
            session.commit()
            yield session, *users
    finally:
        engine.dispose()


def test_profile_updates_selected_fields_and_persists_them(profiles):
    session, alice, _ = profiles
    service = UserService(session)
    user_id = alice.id
    service.update_profile(alice, {"name": "New name", "avatar_id": 3})
    session.expire_all()
    result = service.get_profile(user_id)
    assert (result.name, result.avatar_id, result.username) == ("New name", 3, "alice")


def test_profile_rejects_duplicate_username_before_applying_changes(profiles):
    session, alice, bob = profiles
    with pytest.raises(HTTPException) as exc:
        UserService(session).update_profile(alice, {"name": "New name", "username": bob.username})
    assert exc.value.status_code == 400
    assert (alice.name, alice.username) == ("Alice", "alice")


@pytest.mark.parametrize("cookie", [None, "invalid", "Bearer broken-token"])
def test_nfc_redirects_guests_and_invalid_sessions_to_login(cookie):
    service = NfcService(Mock())
    service.users = Mock()
    response = service.handle_nfc_scan("tag123", cookie)
    location = urlsplit(response.headers["location"])
    assert response.status_code == 307
    assert location.path.endswith("/login")
    assert parse_qs(location.query) == {"redirect_tag": ["tag123"]}
    assert ("access_token=" in response.headers.get("set-cookie", "")) == (
        cookie == "Bearer broken-token"
    )
    service.users.get_by_id.assert_not_called()


@pytest.mark.parametrize("account_exists", [
    pytest.param(True, marks=pytest.mark.xfail(
        strict=True,
        raises=AssertionError,
        reason="SQLite UUID lookup rejects the string subject passed by NfcService",
    )),
    False,
])
def test_nfc_redirect_for_valid_token_depends_on_account(profiles, account_exists):
    session, user, _ = profiles
    user_id, user_hash = user.id, user.user_hash
    token = create_access_token({"sub": str(user_id)})
    if not account_exists:
        session.delete(user)
        session.commit()

    response = NfcService(session).handle_nfc_scan("tag123", f"Bearer {token}")
    location = urlsplit(response.headers["location"])
    if account_exists:
        assert location.path.endswith("/scan")
        assert parse_qs(location.query) == {"tag": ["tag123"], "sig": [user_hash]}
    else:
        assert location.path.endswith("/login")
        assert parse_qs(location.query) == {"redirect_tag": ["tag123"]}
        assert "Max-Age=0" in response.headers["set-cookie"]
