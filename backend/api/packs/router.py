from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from core.database import get_session
from models.pack import Pack
from models.user import User
from api.auth.dependencies import get_current_user
from api.packs.schemas import PackClaimRequest, PackResponse
from models.event import Event

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
        raise HTTPException(status_code=404, detail="Invalid Master Auth Hash. Pack not found.")
        
    if pack.owner_id is not None:
        if pack.owner_id == current_user.id:
            raise HTTPException(status_code=400, detail="You already own this pack.")
        raise HTTPException(status_code=400, detail="This pack has already been claimed by another user.")
        
    pack.owner_id = current_user.id
    session.add(pack)
    
    new_event = Event(
        pack_id=pack.id, 
        title="UnTitled Event",
        status="draft"
    )
    session.add(new_event)
    
    session.commit()
    session.refresh(pack)
    
    return pack
