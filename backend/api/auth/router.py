from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from core.database import get_session
from models.user import User
from core.security import hash_password, verify_password, create_access_token
from api.auth.schemas import UserRegister, UserLogin, Token
from api.auth.dependencies import get_current_user
from fastapi.security import OAuth2PasswordRequestForm
from api.auth.schemas import ChangePassword

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
def login_user(
    user_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    user = session.exec(
        select(User).where(
            (User.username == user_data.username) | 
            (User.email == user_data.username)
        )
    ).first()

    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout_user(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out."}

@router.post("/change-password")
def change_password(
    request: ChangePassword,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(request.old_password, current_user.password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    current_user.password = hash_password(request.new_password)
    session.add(current_user)
    session.commit()

    return {"message": "Password changed successfully"}

@router.delete("/delete-account")
def delete_account(
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    session.delete(current_user)
    session.commit()
    return {"message": "Account deleted successfully"}
