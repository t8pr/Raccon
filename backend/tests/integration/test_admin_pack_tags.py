import uuid
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from fastapi_pagination import add_pagination
from sqlalchemy import event
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, create_engine, select
from api.admin.router import router
from api.auth.dependencies import get_current_user
from core.database import get_session
from models import Event, Pack, Tag, User


@pytest.fixture
def api():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    for model in (User, Pack, Tag, Event):
        model.__table__.create(engine)

    app = FastAPI()
    app.include_router(router)
    add_pagination(app)
    admin = User(username="admin", role="admin")

    def session_override():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = session_override
    app.dependency_overrides[get_current_user] = lambda: admin
    with TestClient(app) as client:
        yield client, engine, admin
    engine.dispose()


@pytest.mark.parametrize("claimed", [False, True])
def test_admin_appends_tags_to_existing_pack(api, claimed):
    client, engine, _ = api
    owner = User(
        username="owner",
        name="Pack owner",
        email="owner@example.com",
        phone_number="0500000000",
        password="test-password",
    )
    owner_id = owner.id if claimed else None
    with Session(engine) as session:
        if claimed:
            session.add(owner)
            session.flush()
        pack = Pack(
            owner_id=owner_id, mode="seq", tags_count=1, master_auth_hash="master"
        )
        pack_id = pack.id
        session.add(pack)
        session.flush()
        session.add(Tag(pack_id=pack_id, static_hash="original", sequence_num=1))
        session.commit()

    url = f"/admin/packs/{pack_id}/tags"
    response = client.post(url, json={"tags_count": 2})
    assert response.status_code == 200
    result = response.json()
    assert result["pack_id"] == str(pack_id)
    assert result["tags_count"] == 3
    assert [tag["sequence_num"] for tag in result["tags"]] == [2, 3]
    assert all(tag["is_printed"] is False for tag in result["tags"])

    follow_up = client.post(url, json={"tags_count": 1})
    assert follow_up.status_code == 200
    assert follow_up.json()["tags"][0]["sequence_num"] == 4

    with Session(engine) as session:
        pack = session.get(Pack, pack_id)
        assert pack.tags_count == 4
        assert pack.owner_id == owner_id
        tags = session.exec(select(Tag).order_by(Tag.sequence_num)).all()
        assert [tag.sequence_num for tag in tags] == [1, 2, 3, 4]
        assert tags[0].static_hash == "original"
        assert len({tag.static_hash for tag in tags}) == 4


def test_admin_add_tags_rejects_missing_pack_and_invalid_count(api):
    client, _, _ = api
    url = f"/admin/packs/{uuid.uuid4()}/tags"

    assert client.post(url, json={"tags_count": 1}).status_code == 404
    assert client.post(url, json={"tags_count": 0}).status_code == 422


def test_non_admin_cannot_add_pack_tags(api):
    client, _, user = api
    user.role = "user"

    response = client.post(f"/admin/packs/{uuid.uuid4()}/tags", json={"tags_count": 1})

    assert response.status_code == 403


def make_user(username, name, role="user", avatar_id=1):
    return User(
        username=username,
        name=name,
        email=f"{username}@example.com",
        phone_number="0500000000",
        password="test-password",
        role=role,
        avatar_id=avatar_id,
    )


def test_admin_lists_users_with_pagination_and_public_fields(api):
    client, engine, _ = api
    with Session(engine) as session:
        session.add_all([
            make_user("zoe", "Zoe"),
            make_user("alice", "Alice", role="admin", avatar_id=3),
            make_user("bob", "Bob"),
        ])
        session.commit()

    first = client.get("/admin/users", params={"page": 1, "size": 2})
    assert first.status_code == 200
    result = first.json()
    assert {key: result[key] for key in ("page", "size", "total", "pages")} == {
        "page": 1, "size": 2, "total": 3, "pages": 2,
    }
    assert [user["username"] for user in result["items"]] == ["alice", "bob"]
    alice = result["items"][0]
    assert (alice["role"], alice["avatar_id"]) == ("admin", 3)
    assert alice.keys() == {
        "id", "user_hash", "name", "username", "email",
        "phone_number", "avatar_id", "role", "created_at",
    }

    second = client.get("/admin/users", params={"page": 2, "size": 2})
    assert second.status_code == 200
    assert [user["username"] for user in second.json()["items"]] == ["zoe"]


@pytest.mark.parametrize("params", [{"page": 0}, {"size": 0}, {"size": 101}])
def test_admin_users_rejects_invalid_pagination(api, params):
    client, _, _ = api
    assert client.get("/admin/users", params=params).status_code == 422


def test_admin_deletes_only_the_selected_user(api):
    client, engine, _ = api
    target = make_user("target", "Target")
    survivor = make_user("survivor", "Survivor")
    target_id, survivor_id = target.id, survivor.id
    with Session(engine) as session:
        session.add_all([target, survivor])
        session.commit()

    url = f"/admin/delete-user/{target_id}"
    assert client.delete(url).status_code == 200
    assert client.delete(url).status_code == 404
    with Session(engine) as session:
        assert session.get(User, target_id) is None
        assert session.get(User, survivor_id) is not None


def test_admin_deletes_selected_pack_and_cascades_to_its_tags_and_event(api):
    client, engine, _ = api
    target = Pack(mode="seq", tags_count=1, master_auth_hash="target")
    survivor = Pack(mode="seq", tags_count=1, master_auth_hash="survivor")
    target_id, survivor_id = target.id, survivor.id
    with Session(engine) as session:
        session.add_all([target, survivor])
        session.flush()
        for pack_id, name in [(target_id, "target"), (survivor_id, "survivor")]:
            session.add(Tag(pack_id=pack_id, static_hash=name, sequence_num=1))
            session.add(Event(pack_id=pack_id, title=name))
        session.commit()

    url = f"/admin/delete-pack/{target_id}"
    assert client.delete(url).status_code == 200
    assert client.delete(url).status_code == 404
    with Session(engine) as session:
        assert session.exec(select(Pack.id)).all() == [survivor_id]
        assert session.exec(select(Tag.pack_id)).all() == [survivor_id]
        assert session.exec(select(Event.pack_id)).all() == [survivor_id]


@pytest.mark.parametrize("endpoint", ["delete-user", "delete-pack"])
def test_admin_delete_rejects_malformed_id(api, endpoint):
    client, _, _ = api
    assert client.delete(f"/admin/{endpoint}/invalid").status_code == 422


@pytest.mark.parametrize("authenticated", [False, True])
def test_admin_endpoints_reject_unauthorized_calls(api, authenticated):
    client, _, user = api
    if authenticated:
        user.role = "user"
    else:
        del client.app.dependency_overrides[get_current_user]

    expected = 403 if authenticated else 401
    assert client.get("/admin/users").status_code == expected
    assert client.get("/admin/packs").status_code == expected
    assert client.delete(f"/admin/delete-user/{uuid.uuid4()}").status_code == expected
    assert client.delete(f"/admin/delete-pack/{uuid.uuid4()}").status_code == expected
