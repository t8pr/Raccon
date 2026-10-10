import string
import secrets
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from core.database import get_session
from models.pack import Pack
from models.tag import Tag
from models.user import User
from api.admin.schemas import PackGenerateRequest, PackGenerateResponse, FactoryPackResponse, FactoryTagView
from api.auth.dependencies import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin"])

def generate_short_hash(length: int = 6) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

@router.post("/generate-packs", response_model=List[PackGenerateResponse])
def generate_packs(
    request: PackGenerateRequest, 
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_current_admin)
):
    all_generated_packs = []
    
    for _ in range(request.quantity):
        master_auth = secrets.token_urlsafe(12)
        
        new_pack = Pack(
            mode=request.mode,
            tags_count=request.tags_count,
            master_auth_hash=master_auth
        )
        session.add(new_pack)
        session.flush() 

        generated_tags = []
        for i in range(request.tags_count):
            new_tag = Tag(
                pack_id=new_pack.id,
                static_hash=generate_short_hash(6),
                sequence_num=i + 1
            )
            session.add(new_tag)
            generated_tags.append(new_tag)
        
        session.flush() 

        all_generated_packs.append(
            PackGenerateResponse(
                pack_id=new_pack.id,
                master_auth_hash=new_pack.master_auth_hash,
                tags=[{
                    "id": t.id, 
                    "static_hash": t.static_hash,
                    "sequence_num": t.sequence_num,
                    "is_printed": t.is_printed
                } for t in generated_tags]
            )
        )

    session.commit()
    return all_generated_packs

@router.get("/factory/pack/{pack_id}", response_model=FactoryPackResponse)
def get_factory_pack_config(
    pack_id: uuid.UUID,
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_current_admin)
):
    pack = session.get(Pack, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
        
    tags = session.exec(select(Tag).where(Tag.pack_id == pack_id).order_by(Tag.sequence_num)).all()
    
    tags_view = []
    for tag in tags:
        tags_view.append(FactoryTagView(
            sequence_num=tag.sequence_num,
            tag_id=tag.id,
            print_url=f"https://raccon.link/t/{tag.static_hash}",
            is_printed=tag.is_printed
        ))
        
    return FactoryPackResponse(
        pack_id=pack.id,
        mode=pack.mode,
        tags_to_program=tags_view
    )

@router.patch("/factory/tags/{tag_id}/mark-printed")
def mark_tag_as_printed(
    tag_id: uuid.UUID,
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_current_admin)
):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
        
    tag.is_printed = True
    session.add(tag)
    session.commit()
    
    return {"status": "success", "message": f"Tag {tag.sequence_num} marked as printed"}