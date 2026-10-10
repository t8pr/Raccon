from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from core.database import get_session
from models.pack import Pack
from models.user import User
from api.auth.dependencies import get_current_user
from api.packs.schemas import PackClaimRequest, PackResponse

router = APIRouter(prefix="/packs", tags=["Packs"])

@router.get("/preview/{master_auth_hash}", response_model=PackResponse)
def preview_pack(
    master_auth_hash: str,
    session: Session = Depends(get_session)
):
    pack = session.exec(select(Pack).where(Pack.master_auth_hash == master_auth_hash)).first()
    
    if not pack:
        raise HTTPException(status_code=404, detail="Invalid Master Auth Hash. Pack not found.")
        
    return pack

@router.post("/claim", response_model=PackResponse)
def claim_pack(
    request: PackClaimRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    pack = session.exec(select(Pack).where(Pack.master_auth_hash == request.master_auth_hash)).first()
    
    if not pack:
        raise HTTPException(status_code=404, detail="رمز غير صالح. الباقة غير موجودة.")
    
    if pack.owner_id is not None:
        if pack.owner_id == current_user.id:
            raise HTTPException(status_code=400, detail="أنت تملك هذه الباقة بالفعل.")
        raise HTTPException(status_code=400, detail="تمت المطالبة بهذه الباقة مسبقاً من قبل مستخدم آخر.")
        
    pack.owner_id = current_user.id
    session.add(pack)
    session.commit()
    session.refresh(pack)
    
    return pack
