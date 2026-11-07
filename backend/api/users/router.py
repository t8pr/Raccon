from fastapi import APIRouter, Depends
from services.user_service import UserService
from models.user import User
from api.auth.dependencies import get_current_user
from api.users.schemas import UserResponse, UserUpdate


router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
    service: UserService = Depends()
):
    return service.get_profile(current_user.id)

@router.patch("/me", response_model=UserResponse)
def update_profile(
    user_data: UserUpdate,
    service: UserService = Depends(),
    current_user: User = Depends(get_current_user)
):
    return service.update_profile(current_user, user_data.model_dump(exclude_unset=True))