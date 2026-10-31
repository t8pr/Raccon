from fastapi import APIRouter, Depends
from services.admin_service import AdminService
from models.user import User
from api.admin.schemas import PackGenerateRequest, PackGenerateResponse, FactoryPackResponse
from api.packs.schemas import PackResponse
from api.auth.dependencies import get_current_admin
import uuid
from typing import List
from fastapi_pagination import Page


router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/generate-packs", response_model=List[PackGenerateResponse])
def generate_packs(
    request: PackGenerateRequest,
    service: AdminService = Depends(),
    admin_user: User = Depends(get_current_admin),
):
    return service.generate_packs(admin_user, **request.model_dump())


@router.get("/factory/pack/{pack_id}", response_model=FactoryPackResponse)
def get_factory_pack_config(
    pack_id: uuid.UUID,
    service: AdminService = Depends(),
    admin_user: User = Depends(get_current_admin),
):
    return service.get_factory_pack_config(admin_user, pack_id)


@router.patch("/factory/tags/{tag_id}/mark-printed")
def mark_tag_as_printed(
    tag_id: uuid.UUID,
    service: AdminService = Depends(),
    admin_user: User = Depends(get_current_admin),
):
    sequence_num = service.mark_tag_as_printed(admin_user, tag_id)
    return {"status": "success", "message": f"Tag {sequence_num} marked as printed"}

@router.get("/packs", response_model=Page[PackResponse])
def get_packs(
    service: AdminService = Depends(),
    admin_user: User = Depends(get_current_admin)
):
    return service.get_packs(admin_user)
