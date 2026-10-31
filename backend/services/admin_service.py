from sqlmodel import Session
from core.database import get_session
from core.logger import logger
from fastapi import Depends, HTTPException
from repositories.user_repo import UserRepository
from repositories.pack_repo import PackRepository
from repositories.tag_repo import TagRepository
from models.user import User
from models.pack import Pack
from models.tag import Tag
from typing import Literal
import secrets
import string
import uuid


def generate_short_hash(length: int = 6) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

class AdminService:
    def __init__(self, session: Session = Depends(get_session)):
        self.session = session
        self.users = UserRepository(session)
        self.packs = PackRepository(session)
        self.tags = TagRepository(session)
        
    def generate_packs(self, admin_user: User, mode: Literal["open", "seq"], tags_count: int, quantity: int):
        all_generated_packs = []
        
        for _ in range(quantity):
            master_auth = secrets.token_urlsafe(12)
            
            new_pack = Pack(
                mode=mode,
                tags_count=tags_count,
                master_auth_hash=master_auth
            )
            self.packs.add_pack(new_pack)
            self.session.flush() 

            generated_tags = []
            for i in range(tags_count):
                new_tag = Tag(
                    pack_id=new_pack.id,
                    static_hash=generate_short_hash(6),
                    sequence_num=i + 1
                )
                self.tags.add_tag(new_tag)
                generated_tags.append(new_tag)
            
            self.session.flush() 

            all_generated_packs.append({
                    "pack_id": new_pack.id,
                    "master_auth_hash": new_pack.master_auth_hash,
                    "tags": [{
                        "id": t.id, 
                        "static_hash": t.static_hash,
                        "sequence_num": t.sequence_num,
                        "is_printed": t.is_printed
                    } for t in generated_tags]
                })

        self.session.commit()
        logger.info(f"Admin {admin_user.username} generated {quantity} new packs (Mode: {mode})")
        return all_generated_packs

    def get_factory_pack_config(self, admin_user: User, pack_id: uuid.UUID):
        pack = self.packs.get_pack(pack_id)
        if not pack:
            raise HTTPException(status_code=404, detail="Pack not found")
            
        tags = self.tags.get_by_pack_id(pack_id)
        
        tags_view = []
        for tag in tags:
            tags_view.append({
                "sequence_num": tag.sequence_num,
                "tag_id": tag.id,
                "print_url": f"https://raccon.link/t/{tag.static_hash}",
                "is_printed": tag.is_printed
            })
            
        return {
            "pack_id":pack.id,
            "mode":pack.mode,
            "tags_to_program":tags_view
        }
        
    def mark_tag_as_printed(self, admin_user: User, tag_id: uuid.UUID) -> int:
        tag = self.tags.get_by_tag_id(tag_id)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")
            
        tag.is_printed = True
        self.session.add(tag)
        self.session.commit()
        return tag.sequence_num

    def get_packs(self, admin_user: User):
        return self.packs.get_packs()