from sqlmodel import Session
from fastapi import Depends, HTTPException
from core.database import get_session
from repositories.pack_repo import PackRepository
from repositories.event_repo import EventRepository
from models import User, Event


class PackService:
    def __init__(self, session: Session = Depends(get_session)):
        self.session = session
        self.packs = PackRepository(session)
        self.events = EventRepository(session)
        
    def preview_pack(self, master_auth_hash: str):
        pack = self.packs.get_by_master_auth(master_auth_hash)
        
        if not pack:
            raise HTTPException(status_code=404, detail="Invalid Master Auth Hash. Pack not found.")
            
        return pack
    
    def claim_pack(self, user: User, master_auth_hash: str):
        pack = self.packs.get_by_master_auth(master_auth_hash)
        
        if not pack:
            raise HTTPException(status_code=404, detail="Invalid Master Auth Hash. Pack not found.")
            
        if pack.owner_id is not None:
            if pack.owner_id == user.id:
                raise HTTPException(status_code=400, detail="You already own this pack.")
            raise HTTPException(status_code=400, detail="This pack has already been claimed by another user.")
            
        pack.owner_id = user.id
        self.packs.add_pack(pack)
        
        new_event = Event(
            pack_id=pack.id, 
            title="UnTitled Event",
            status="draft"
        )
        self.events.add_event(new_event)
        
        self.session.commit()
        self.session.refresh(pack)
        
        return pack
