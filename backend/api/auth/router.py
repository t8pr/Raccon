from fastapi import APIRouter, Depends, BackgroundTasks, Response
from services.auth_service import AuthService
from models.user import User
from api.auth.schemas import UserRegister, UserLogin, Token, ChangePassword, ForgotPassword, ResetPassword, GoogleLoginRequest
from api.auth.dependencies import get_current_user
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
def register_user(user_data: UserRegister, service: AuthService = Depends()):
    user = service.register_user(**user_data.model_dump())
    return {"message": "User registered successfully", "user_id": user.id}

@router.post("/login", response_model=Token)
def login_user(
    response: Response,
    user_data: OAuth2PasswordRequestForm = Depends(),
    service: AuthService = Depends()
):
    access_token = service.login(user_data.username, user_data.password)
    
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        samesite="lax", # Set to "none" later 
        secure=False, # Set to True in production Raccon.app
        max_age=60 * 24 * 7 * 60
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/google", response_model=Token)
def login_with_google(
    request: GoogleLoginRequest,
    service: AuthService = Depends()
):
    access_token = service.google_login(request.credential)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout_user(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out."}

@router.post("/change-password")
def change_password(
    request: ChangePassword,
    service: AuthService = Depends(),
    current_user: User = Depends(get_current_user)
):
    service.change_password(current_user, **request.model_dump())
    return {"message": "Password changed successfully"}

@router.delete("/delete-account")
def delete_account(
    service: AuthService = Depends(), 
    current_user: User = Depends(get_current_user)
):
    service.delete_account(current_user)
    return {"message": "Account deleted successfully"}

@router.post("/forgot-password")
def forgot_password(
    user_data: ForgotPassword,
    background_tasks: BackgroundTasks,
    service: AuthService = Depends(),
):
    service.forgot_password(user_data.email, background_tasks)
    # Users with and without a registered account get the same conformation message   
    return {"message": "If an account with this email exists, the reset link is sent."}

@router.post("/reset-password")
def reset_password(
    user_data: ResetPassword,
    service: AuthService = Depends(),
):
    service.reset_password(**user_data.model_dump())
    return {"message": "Password reset successful."}