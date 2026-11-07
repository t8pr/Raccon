from sqlmodel import Session
from fastapi import Depends, HTTPException
from core.database import get_session
from core.logger import logger
from repositories.user_repo import UserRepository
from models import User
import uuid

class UserService:
    def __init__(self, session: Session = Depends(get_session)):
        self.session = session
        self.users = UserRepository(session)
        
    def get_profile(self, user_id: uuid.UUID):
        return self.users.get_by_id(user_id)
    
    def update_profile(self, current_user: User, user_data: dict):
        if user_data.get("username") and user_data.get("username") != current_user.username:
            existing_user = self.users.get_by_username(user_data.get("username"))
            if existing_user:
                raise HTTPException(status_code=400, detail="Username is already taken")
        
        for key, value in user_data.items():
            setattr(current_user, key, value)
            
        self.session.add(current_user)
        self.session.commit()
        self.session.refresh(current_user)
        logger.info(f"User profile updated: {current_user.username} (ID: {current_user.id})")
        return current_user