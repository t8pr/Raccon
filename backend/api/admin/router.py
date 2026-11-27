from fastapi import APIRouter, Depends, Query
from services.admin_service import AdminService
from models.user import User
from api.admin.schemas import AdminPackDetailResponse, FactoryPackResponse, PackAddTagsRequest, PackAddTagsResponse, PackGenerateRequest, PackGenerateResponse
from api.packs.schemas import PackResponse
from api.users.schemas import UserResponse
from api.auth.dependencies import get_current_admin
import uuid
from typing import List, Literal
from fastapi_pagination import Page
from fastapi.responses import PlainTextResponse


router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/generate-packs", response_model=List[PackGenerateResponse])
def generate_packs(
    request: PackGenerateRequest,
    format: Literal["json", "txt"] = Query(default="json"),
    as_links: bool = Query(default=True),
    service: AdminService = Depends(),
    admin_user: User = Depends(get_current_admin),
):
    packs = service.generate_packs(admin_user, **request.model_dump())

    if format == "txt":
        content, filename = service.format_packs_as_txt(
            packs, request.mode, request.tags_count, request.quantity, as_links
        )
        return PlainTextResponse(
            content=content,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    return packs

@router.post("/packs/{pack_id}/tags", response_model=PackAddTagsResponse)
def add_pack_tags(
    pack_id: uuid.UUID,
    request: PackAddTagsRequest,
    service: AdminService = Depends(),
    admin_user: User = Depends(get_current_admin),
):
    return service.add_pack_tags(admin_user, pack_id, request.tags_count)

@router.post("/generate-rebuild-codes")
def generate_rebuild_codes(
    quantity: int = Query(default=10, ge=1, le=500),
    format: Literal["json", "txt"] = Query(default="json"),
    admin_user: User = Depends(get_current_admin),
    admin_service: AdminService = Depends(),
):
    codes = admin_service.generate_rebuild_codes(quantity)

    if format == "txt":
        content = "\n".join(codes)
        return PlainTextResponse(
            content=content,
            headers={
                "Content-Disposition": 'attachment; filename="rebuild_codes.txt"'
            },
        )

    return {"count": len(codes), "codes": codes}

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

@router.get("/packs/details/{master_auth_hash}", response_model=AdminPackDetailResponse)
def get_pack_details_by_auth(
    master_auth_hash: str,
    service: AdminService = Depends(),
    admin_user: User = Depends(get_current_admin)
):
    return service.get_pack_by_master_auth(admin_user, master_auth_hash)

@router.get("/users", response_model=Page[UserResponse])
def get_users(
    service: AdminService = Depends(),
    admin_user: User = Depends(get_current_admin)
):
    return service.get_users(admin_user)


@router.delete("/delete-user/{user_id}")
def delete_user(
    user_id: uuid.UUID,
    service: AdminService = Depends(),
    admin_user: User = Depends(get_current_admin)
):
    return service.delete_users(admin_user, user_id)


@router.delete("/delete-pack/{pack_id}")
def delete_pack(
    pack_id: uuid.UUID,
    service: AdminService = Depends(),
    admin_user: User = Depends(get_current_admin)
):
    return service.delete_packs(admin_user, pack_id)
