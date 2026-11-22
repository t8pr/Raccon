from sqlmodel import Session
from core.database import get_session
from core.security import hash_password, verify_password, create_access_token
from core.email import send_password_reset_email, send_reset_confirmation_email
from fastapi import Depends, HTTPException, BackgroundTasks
from repositories.user_repo import UserRepository
from models.user import User
from core.logger import logger
import hashlib
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from email_validator import validate_email, EmailNotValidError
from core.config import settings
import secrets

class AuthService:
    def __init__(self, session: Session = Depends(get_session)):
        self.session = session
        self.users = UserRepository(session)

    def register_user(
        self,
        name: str,
        username: str,
        email: str,
        phone_number: str,
        password: str,
        avatar_id: int,
    ) -> User:
        existing_user = self.users.get_by_username_or_email(username, email)

        if existing_user:
            raise HTTPException(
                status_code=400, detail="Username or Email already exists"
            )

        try:
            email_info = validate_email(email, check_deliverability=True)
            email = email_info.normalized

        except EmailNotValidError as e:
            raise HTTPException(
                status_code = 422, detail="Email validation failed."
            )

        hashed_pwd = hash_password(password)

        new_user = User(
            name=name,
            username=username,
            email=email,
            phone_number=phone_number,
            password=hashed_pwd,
            avatar_id=avatar_id,
        )
        self.users.add_user(new_user)
        self.session.commit()
        self.session.refresh(new_user)
        logger.info(f"New user registered: {new_user.username} (ID: {new_user.id})")
        return new_user

    def login(self, identifier: str, password: str) -> str:
        registered_user = self.users.get_by_username_or_email(identifier, identifier)

        if not registered_user or not verify_password(
            password, registered_user.password
        ):
            raise HTTPException(status_code=400, detail="Invalid credentials")

        access_token = create_access_token(data={"sub": str(registered_user.id)})
        logger.info(
            f"User logged in: {registered_user.username} (ID: {registered_user.id})"
        )
        return access_token

    def change_password(self, user: User, old_password: str, new_password: str) -> None:
        if not verify_password(old_password, user.password):
            raise HTTPException(status_code=400, detail="Incorrect old password")

        self.users.update_password(user.id, hash_password(new_password))
        self.session.commit()

    def delete_account(self, user: User) -> None:
        username, user_id = user.username, user.id
        self.users.delete_user(user.id)
        self.session.commit()
        logger.info(f"User deleted: {username} (ID: {user_id})")

    def forgot_password(self, email: str, background_tasks: BackgroundTasks) -> None:
        user = self.users.get_by_email(email)

        if user:
            pass_reset_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(pass_reset_token.encode("utf-8")).hexdigest()
            if self.users.try_issue_password_reset(user.id, token_hash):
                self.session.commit()
                background_tasks.add_task(send_password_reset_email, user.email, pass_reset_token)
                logger.info(f"User requested password reset (ID: {user.id})")

    def reset_password(self, token: str, new_password: str, background_tasks: BackgroundTasks) -> None:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        password_hash = hash_password(new_password)

        user_email = self.users.try_consume_password_reset(token_hash, password_hash)
        if not user_email:
            raise HTTPException(status_code=400, detail="Invalid reset token")

        self.session.commit()

        background_tasks.add_task(send_reset_confirmation_email, user_email)
        logger.info(f"Password reset completed (Email: {user_email})")

    def google_login(self, token: str) -> str:
        try:
            id_info = id_token.verify_oauth2_token(
                token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
            email = id_info.get("email")
            name = id_info.get("name")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Google token")

        user = self.users.get_by_email(email)

        if not user:
            base_username = email.split('@')[0].lower()
            safe_username = "".join(c for c in base_username if c.isalnum())
            username = f"{safe_username}_{secrets.token_hex(3)}"
            
            random_password = secrets.token_urlsafe(20)
            
            user = User(
                name=name,
                username=username,
                email=email,
                phone_number="000000000",
                password=hash_password(random_password),
                avatar_id=1,
            )
            self.users.add_user(user)
            self.session.commit()
            self.session.refresh(user)
            logger.info(f"New user registered via Google: {user.username} (ID: {user.id})")

        access_token = create_access_token(data={"sub": str(user.id)})
        logger.info(f"User logged in via Google: {user.username} (ID: {user.id})")
        return access_token
