import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException
from models import User
from services.auth_service import AuthService
from core.security import hash_password, reset_pass_token, verify_password


@pytest.fixture
def user():
    return User(
        name="test user",
        username="testuser",
        email="testing@gmail.com",
        phone_number="0500000000",
        password="stored-password-hash",
        user_hash="test-user-hash",
    )


@pytest.fixture
def session():
    return Mock()


@pytest.fixture
def auth_service(session, user):
    service = AuthService(session=session)
    service.users = Mock(spec=["get_by_username_or_email", "get_by_id"])
    service.users.get_by_username_or_email.return_value = user
    service.users.get_by_id.return_value = user
    return service


def test_login_rejects_wrong_password(auth_service, session, user):
    with patch("services.auth_service.verify_password", return_value=False) as verify:
        with patch("services.auth_service.create_access_token") as create_token:
            with pytest.raises(HTTPException) as exc:
                auth_service.login(user.username, "wrong-password")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid credentials"
    auth_service.users.get_by_username_or_email.assert_called_once_with(
        user.username, user.username
    )
    verify.assert_called_once_with("wrong-password", user.password)
    create_token.assert_not_called()
    session.commit.assert_not_called()


def test_successful_login_returns_access_token(auth_service, session, user):
    with patch("services.auth_service.verify_password", return_value=True) as verify:
        with patch(
            "services.auth_service.create_access_token", return_value="access-token"
        ) as create_token:
            result = auth_service.login(user.username, "correct-password")

    assert result == "access-token"
    auth_service.users.get_by_username_or_email.assert_called_once_with(
        user.username, user.username
    )
    verify.assert_called_once_with("correct-password", user.password)
    create_token.assert_called_once_with(data={"sub": str(user.id)})
    session.commit.assert_not_called()


def test_reset_password_rejects_invalid_token(auth_service, session, user):
    original_password = user.password

    with pytest.raises(HTTPException) as exc:
        auth_service.reset_password("invalid-token", "new-password")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid reset token"
    assert user.password == original_password
    auth_service.users.get_by_id.assert_not_called()
    session.commit.assert_not_called()


def test_reset_password_rejects_reused_token(auth_service, session, user):
    user.password = hash_password("old-password")
    token = reset_pass_token(
        data={"sub": str(user.id), "pwd": user.password[-10:]}
    )

    auth_service.reset_password(token, "new-password")

    assert verify_password("new-password", user.password)
    session.commit.assert_called_once()
    updated_password = user.password
    session.reset_mock()

    with pytest.raises(HTTPException) as exc:
        auth_service.reset_password(token, "another-password")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid reset token"
    assert user.password == updated_password
    session.commit.assert_not_called()
