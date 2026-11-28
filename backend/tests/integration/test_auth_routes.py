import jwt
import pytest

from unittest.mock import Mock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.auth.router import router
from core.security import hash_password, SECRET_KEY, ALGORITHM
from models import User
from services.auth_service import AuthService


@pytest.fixture(scope="module")
def correct_password_hash():
    return hash_password("correct-password")


@pytest.fixture
def user(correct_password_hash):
    return User(
        name="Test User",
        username="testuser",
        email="testing@gmail.com",
        phone_number="500000000",
        password=correct_password_hash,
        user_hash="test-user-hash",
    )

@pytest.fixture
def auth_service(user):
    session = Mock()
    service = AuthService(session=session)

    service.users = Mock(spec=["get_by_username_or_email"])
    service.users.get_by_username_or_email.return_value = user

    return service

@pytest.fixture
def client(auth_service):
    app = FastAPI()
    app.include_router(router)

    # override service dependency with the fixture
    app.dependency_overrides[AuthService] = lambda: auth_service

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()

# Login request parsing, route direction, login service, jwt, and response
def test_successful_login(client, auth_service, user):
    response = client.post(
        "/auth/login",
        data={
            "username": user.username,
            "password": "correct-password",
        },
    )

    assert response.status_code == 200

    body = response.json()
    assert body["token_type"] == "bearer"

    payload = jwt.decode(
        body["access_token"],
        SECRET_KEY,
        algorithms=[ALGORITHM],
    )
    assert payload["sub"] == str(user.id)
    assert payload["purpose"] == "access"

    assert "access_token" in response.cookies

    auth_service.users.get_by_username_or_email.assert_called_once_with(
        user.username,
        user.username,
    )


def test_login_rejects_wrong_password(client, user):
    response = client.post(
        "/auth/login",
        data={
            "username": user.username,
            "password": "wrong-password",
        },
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid credentials"}
    assert "access_token" not in response.cookies
