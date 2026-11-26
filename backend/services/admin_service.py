from sqlmodel import Session
from core.database import get_session
from core.logger import logger
from core.config import settings
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
from datetime import datetime, timezone
from models.rebuild_code import RebuildCode
from repositories.rebuild_code_repo import RebuildCodeRepository

def generate_short_hash(length: int = 6) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

class AdminService:
    def __init__(self, session: Session = Depends(get_session)):
        self.session = session
        self.users = UserRepository(session)
        self.packs = PackRepository(session)
        self.tags = TagRepository(session)
        self.rebuild_codes = RebuildCodeRepository(session)
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

            generated_tags = self._generate_tags(new_pack.id, 1, tags_count)
            
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

    def _generate_tags(
        self, pack_id: uuid.UUID, first_sequence: int, tags_count: int
    ) -> list[Tag]:
        tags = []
        for sequence_num in range(first_sequence, first_sequence + tags_count):
            tag = Tag(
                pack_id=pack_id,
                static_hash=generate_short_hash(6),
                sequence_num=sequence_num,
            )
            self.tags.add_tag(tag)
            tags.append(tag)
        return tags

    def add_pack_tags(self, admin_user: User, pack_id: uuid.UUID, tags_count: int) -> dict:
        pack = self.packs.lock_pack(pack_id)
        if pack is None:
            raise HTTPException(status_code=404, detail="Pack not found")

        first_sequence = self.tags.get_last_sequence(pack_id) + 1
        tags = self._generate_tags(pack_id, first_sequence, tags_count)
        pack.tags_count += tags_count
        response = {
            "pack_id": pack_id,
            "tags_count": pack.tags_count,
            "tags": [
                {
                    "id": tag.id,
                    "static_hash": tag.static_hash,
                    "sequence_num": tag.sequence_num,
                    "is_printed": tag.is_printed,
                }
                for tag in tags
            ],
        }
        self.session.commit()
        logger.info(
            "Admin %s added %s tags to pack %s", admin_user.username, tags_count, pack_id
        )
        return response

    def get_factory_pack_config(self, admin_user: User, pack_id: uuid.UUID):
        pack = self.packs.get_pack(pack_id)
        if not pack:
            raise HTTPException(status_code=404, detail="Pack not found")
            
        owner_name = None
        if pack.owner_id:
            owner = self.users.get_by_id(pack.owner_id)
            if owner:
                owner_name = owner.name or owner.username

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
            "pack_id": pack.id,
            "mode": pack.mode,
            "owner_name": owner_name,
            "tags_to_program": tags_view
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

    def get_users(self, admin_user: User):
        return self.users.get_users()
        
    def delete_users(self, admin_user: User, user_id: uuid.UUID):
        user = self.users.get_by_id(user_id)

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        self.users.delete_user(user_id)
        self.session.commit()
        
        return {"message": "User deleted successfully"}
    
    def delete_packs(self, admin_user: User, pack_id: uuid.UUID):
        pack = self.packs.get_pack(pack_id)
    
        if pack is None:
            raise HTTPException(status_code=404, detail="Pack not found")
    
        self.packs.delete_pack(pack_id)
        self.session.commit()
            
        return {"message": "Pack deleted successfully"}

    def get_pack_by_master_auth(self, admin_user: User, master_auth_hash: str) -> dict:
        pack = self.packs.get_by_master_auth(master_auth_hash)
        
        if not pack:
            raise HTTPException(status_code=404, detail="Pack not found with this master auth hash.")
        
        response_data = {
            "pack_id": pack.id,
            "mode": pack.mode,
            "tags_count": pack.tags_count,
            "master_auth_hash": pack.master_auth_hash,
            "is_claimed": pack.owner_id is not None,
            "owner_id": pack.owner_id,
            "owner_name": None,
            "owner_username": None,
            "owner_email": None,
            "owner_phone": None
        }
        
        if pack.owner_id:
            owner = self.users.get_by_id(pack.owner_id)
            if owner:
                response_data["owner_name"] = owner.name
                response_data["owner_username"] = owner.username
                response_data["owner_email"] = owner.email
                response_data["owner_phone"] = owner.phone_number
                
        return response_data

    def format_packs_as_txt(
        self,
        packs: list[dict],
        mode: str,
        tags_count: int,
        quantity: int,
        as_links: bool = True,
    ) -> tuple[str, str]:
        base_url = settings.FRONTEND_URL.rstrip("/")
        lines = [
            f"{base_url}/claim/{p['master_auth_hash']}" if as_links else p["master_auth_hash"]
            for p in packs
        ]
        content = "\n".join(lines) + "\n"
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"packs_{mode}_{tags_count}tags_x{quantity}_{timestamp}.txt"
        return content, filename

    def _generate_unique_rebuild_code(self) -> str:
        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        part1 = "".join(secrets.choice(alphabet) for _ in range(4))
        part2 = "".join(secrets.choice(alphabet) for _ in range(4))
        return f"RBLD-{part1}-{part2}"

    def generate_rebuild_codes(self, quantity: int) -> list[str]:
        if quantity < 1 or quantity > 500:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be between 1 and 500.",
            )

        generated_codes: list[str] = []
        code_records: list[RebuildCode] = []

        for _ in range(quantity):
            code_str = self._generate_unique_rebuild_code()
            generated_codes.append(code_str)
            code_records.append(RebuildCode(code=code_str))

        self.rebuild_codes.add_bulk(code_records)
        self.session.commit()
        return generated_codes
