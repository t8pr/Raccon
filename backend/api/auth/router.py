from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from core.database import get_session
from core.security import hash_password
from models.user import User
from api.auth.schemas import UserRegister
from core.security import hash_password, verify_password, create_access_token
from models.user import User
from api.auth.schemas import UserRegister, UserLogin, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
def register_user(user_data: UserRegister, session: Session = Depends(get_session)):
    existing_user = session.exec(
        select(User).where((User.username == user_data.username) | (User.email == user_data.email))
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or Email already exists")

    hashed_pwd = hash_password(user_data.password)
    
    new_user = User(
        name=user_data.name,
        username=user_data.username,
        email=user_data.email,
        phone_number=user_data.phone_number,
        password=hashed_pwd
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return {"message": "User registered successfully", "user_id": new_user.id}

@router.post("/login", response_model=Token)
def login_user(user_data: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(
        select(User).where(
            (User.username == user_data.username_or_email) | 
            (User.email == user_data.username_or_email)
        )
    ).first()

    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {"access_token": access_token, "token_type": "bearer"}