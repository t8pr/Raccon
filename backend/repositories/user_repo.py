from sqlmodel import Session, select, delete, update
from fastapi_pagination.ext.sqlmodel import paginate
from models import User
import uuid
from datetime import datetime, timezone, timedelta


class UserRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_username_or_email(self, username: str, email: str) -> User | None:
        return self.session.exec(
            select(User).where((User.username == username) | (User.email == email))
        ).first()

    def get_by_username(self, username: str) -> User | None:
        return self.session.exec(select(User).where((User.username == username))).first()
    
    def get_by_email(self, email: str) -> User | None:
            return self.session.exec(select(User).where((User.email == email))).first()

    def get_by_id(self, user_id: str | uuid.UUID) -> User | None:
        return self.session.get(User, user_id)

    def get_by_user_hash(self, user_hash: str) -> User | None:
        return self.session.exec(select(User).where(User.user_hash == user_hash)).first()

    def get_users(self):
        users_info = select(User).order_by(User.name)
        return paginate(self.session, users_info)
    
    def add_user(self, new_user: User) -> None:
        self.session.add(new_user)

    def delete_user(self, user_id: uuid.UUID) -> None:
        self.session.exec(delete(User).where(User.id == user_id))

    def update_password(self, user_id: uuid.UUID, new_password_hash: str) -> None:
        self.session.execute(
            update(User)
            .where(User.id == user_id)
            .values(password=new_password_hash, pass_reset_token_hash=None)
        )

    def try_issue_password_reset(self, user_id: uuid.UUID, token_hash: str) -> bool:
        statement = (
            select(User)
            .where(User.id == user_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        ) # lock transaction and reload row so timestamp is refreashed
        user = self.session.exec(statement).first()
        if user is None:
            return False

        now = datetime.now(timezone.utc)
        last_request = user.pass_reset_requested_at
        if last_request is not None and now - last_request < timedelta(minutes=2):
            return False

        user.pass_reset_requested_at = now
        user.pass_reset_token_hash = token_hash
        return True


    def try_consume_password_reset(self, token_hash: str, new_password_hash: str) -> str | None:
        statement = (
            select(User)
            .where(User.pass_reset_token_hash == token_hash)
            .with_for_update()
        )
        user = self.session.exec(statement).first()
        if user is None or user.pass_reset_requested_at is None:
            return None

        now = datetime.now(timezone.utc)
        if now - user.pass_reset_requested_at >= timedelta(minutes=15):
            return None

        user.password = new_password_hash
        user.pass_reset_token_hash = None
        return user.email