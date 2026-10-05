from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from core.database import get_session
from models.user import User
from api.auth.dependencies import get_current_user
from api.users.schemas import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
def update_profile(
    user_data: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if user_data.username and user_data.username != current_user.username:
        existing_user = session.exec(select(User).where(User.username == user_data.username)).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username is already taken")
            
    update_data = user_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(current_user, key, value)
        
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return current_user