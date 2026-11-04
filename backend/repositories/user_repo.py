from sqlmodel import Session, select
from fastapi_pagination.ext.sqlmodel import paginate
from models import User
import uuid


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

    def delete_user(self, user: User) -> None:
        self.session.delete(user)
