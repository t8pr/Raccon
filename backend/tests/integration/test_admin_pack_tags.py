import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, create_engine, select

from api.admin.router import router
from api.auth.dependencies import get_current_user
from core.database import get_session
from models import Pack, Tag, User


@pytest.fixture
def api():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    for model in (User, Pack, Tag):
        model.__table__.create(engine)

    app = FastAPI()
    app.include_router(router)
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
