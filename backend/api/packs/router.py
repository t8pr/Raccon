from fastapi import APIRouter, Depends
from services.pack_service import PackService
from models.user import User
from api.auth.dependencies import get_current_user
from api.packs.schemas import PackClaimRequest, PackResponse


router = APIRouter(prefix="/packs", tags=["Packs"])

@router.get("/preview/{master_auth_hash}", response_model=PackResponse)
def preview_pack(
    master_auth_hash: str,
    service: PackService = Depends()
):
    return service.preview_pack(master_auth_hash)

@router.post("/claim", response_model=PackResponse)
def claim_pack(
    request: PackClaimRequest,
    service: PackService = Depends(),
    current_user: User = Depends(get_current_user)
):
    return service.claim_pack(current_user, request.master_auth_hash)
