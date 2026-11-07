from sqlmodel import Session, select
from models import Tag
import uuid
from typing import List


class TagRepository:
    def __init__(self, session: Session):
        self.session = session
        
    def get_by_tag_id(self, tag_id: uuid.UUID) -> Tag | None:
        return self.session.get(Tag, tag_id)
    
    def get_by_pack_id(self, pack_id: uuid.UUID) -> List[Tag] | None:
        return self.session.exec(select(Tag).where(Tag.pack_id == pack_id).order_by(Tag.sequence_num)).all()
    
    def get_by_static_hash(self, tag_hash: str) -> Tag | None:
        return self.session.exec(select(Tag).where(Tag.static_hash == tag_hash)).first()
    def add_tag(self, new_tag: Tag) -> None:
        self.session.add(new_tag)