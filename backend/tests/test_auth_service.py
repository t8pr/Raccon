import hashlib
import pytest
from unittest.mock import Mock, patch
from fastapi import BackgroundTasks, HTTPException
from models import User
from services.auth_service import AuthService
from core.email import send_password_reset_email, send_reset_confirmation_email
from repositories.user_repo import UserRepository


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
    service.users = Mock(spec=UserRepository)
    service.users.get_by_username_or_email.return_value = user
    service.users.get_by_email.return_value = user
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


@pytest.mark.parametrize("issued", [True, False])
def test_forgot_password_queues_email_only_when_token_is_issued(
    auth_service, session, user, issued
):
    token = "random-reset-token"
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    auth_service.users.try_issue_password_reset.return_value = issued
    tasks = BackgroundTasks()

    with patch("services.auth_service.secrets.token_urlsafe", return_value=token):
        auth_service.forgot_password(user.email, tasks)

    auth_service.users.get_by_email.assert_called_once_with(user.email)
    auth_service.users.try_issue_password_reset.assert_called_once_with(
        user.id, token_hash
    )
    if issued:
        session.commit.assert_called_once()
        task, = tasks.tasks
        assert task.func is send_password_reset_email
        assert task.args == (user.email, token)
    else:
        session.commit.assert_not_called()
        assert not tasks.tasks


def test_forgot_password_ignores_unknown_email(auth_service, session):
    auth_service.users.get_by_email.return_value = None
    tasks = BackgroundTasks()

    auth_service.forgot_password("unknown@example.com", tasks)

    auth_service.users.try_issue_password_reset.assert_not_called()
    session.commit.assert_not_called()
    assert not tasks.tasks


def test_reset_password_rejects_invalid_token(auth_service, session):
    auth_service.users.try_consume_password_reset.return_value = None
    tasks = BackgroundTasks()

    with patch("services.auth_service.hash_password", return_value="new-hash"):
        with pytest.raises(HTTPException) as exc:
            auth_service.reset_password("invalid-token", "new-password", tasks)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid reset token"
    session.commit.assert_not_called()
    assert not tasks.tasks


def test_reset_password_queues_confirmation_after_commit(auth_service, session, user):
    token = "random-reset-token"
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    auth_service.users.try_consume_password_reset.return_value = user.email
    tasks = BackgroundTasks()

    def check_commit():
        assert not tasks.tasks

    session.commit.side_effect = check_commit
    with patch("services.auth_service.hash_password", return_value="new-hash") as hash_password:
        auth_service.reset_password(token, "new-password", tasks)

    hash_password.assert_called_once_with("new-password")
    auth_service.users.try_consume_password_reset.assert_called_once_with(
        token_hash, "new-hash"
    )
    session.commit.assert_called_once()
    task, = tasks.tasks
    assert task.func is send_reset_confirmation_email
    assert task.args == (user.email,)


def test_registration_rejects_duplicate_account(auth_service, session):
    with pytest.raises(HTTPException) as exc:
        auth_service.register_user("Test", "testuser", "test@example.com", "0500000000", "password", 1)
    assert exc.value.status_code == 400
    auth_service.users.add_user.assert_not_called()
    session.commit.assert_not_called()


def test_registration_stores_normalized_email_and_password_hash(auth_service, session):
    auth_service.users.get_by_username_or_email.return_value = None
    with (
        patch("services.auth_service.validate_email", return_value=Mock(normalized="test@example.com")),
        patch("services.auth_service.hash_password", return_value="hashed-password") as hash_password,
    ):
        user = auth_service.register_user("Test", "testuser", "test@EXAMPLE.COM", "0500000000", "password", 3)

    hash_password.assert_called_once_with("password")
    assert (user.email, user.password, user.avatar_id) == ("test@example.com", "hashed-password", 3)
    auth_service.users.add_user.assert_called_once_with(user)
    session.commit.assert_called_once()


@pytest.mark.parametrize("valid_password", [True, False])
def test_change_password_requires_current_password(auth_service, session, user, valid_password):
    with (
        patch("services.auth_service.verify_password", return_value=valid_password),
        patch("services.auth_service.hash_password", return_value="new-hash"),
    ):
        if valid_password:
            auth_service.change_password(user, "old", "new")
            auth_service.users.update_password.assert_called_once_with(user.id, "new-hash")
            session.commit.assert_called_once()
        else:
            with pytest.raises(HTTPException) as exc:
                auth_service.change_password(user, "old", "new")
            assert exc.value.status_code == 400
            auth_service.users.update_password.assert_not_called()
            session.commit.assert_not_called()
