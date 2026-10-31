from sqlmodel import Session, select
from fastapi_pagination.ext.sqlmodel import paginate
from models import Pack
import uuid

class PackRepository:
    def __init__(self, session: Session):
        self.session = session
    
    def get_pack(self, pack_id: uuid.UUID) -> Pack | None:
        return self.session.get(Pack, pack_id)
    
    def get_by_master_auth(self, master_auth_hash: str) -> Pack | None:
        return self.session.exec(select(Pack).where(Pack.master_auth_hash == master_auth_hash)).first()
        
    def get_by_owner_id(self, owner_id: uuid.UUID):
        return self.session.exec(select(Pack).where(Pack.owner_id == owner_id)).all()

    def get_packs(self):
        packs_info = select(Pack).order_by(Pack.id)
        return paginate(self.session, packs_info)
    
    def add_pack(self, new_pack: Pack) -> None:
        self.session.add(new_pack)
        
        