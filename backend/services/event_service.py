from sqlmodel import Session
from fastapi import Depends, HTTPException, status
from core.database import get_session
from repositories.pack_repo import PackRepository
from repositories.event_repo import EventRepository
from repositories.tag_repo import TagRepository
from repositories.event_tag_repo import EventTagRepository
from models import User, Event, EventTag, Pack
import uuid
from typing import List
from core.config import settings


class EventService:
    def __init__(self, session: Session = Depends(get_session)):
        self.session = session
        self.events = EventRepository(session)
        self.packs = PackRepository(session)
        self.tags = TagRepository(session)
        self.event_tags = EventTagRepository(session)

    def get_event_details(self, user: User, event_id: uuid.UUID) -> dict:
        event = self.events.get_event(event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Event not found."
            )

        pack = self.packs.get_pack(event.pack_id)
        if not pack or pack.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own this pack.",
            )

        physical_tags = self.tags.get_by_pack_id(pack.id)

        event_tags = self.event_tags.get_all_by_event_id(event.id)

        config_map = {et.tag_id: et for et in event_tags}

        tags_view = []
        for tag in physical_tags:
            config = config_map.get(tag.id)
            tags_view.append(
                {
                    "sequence_num": tag.sequence_num,
                    "tag_id": tag.id,
                    "tag_type": config.tag_type if config else None,
                    "content": config.content if config else None,
                    "is_configured": bool(config),
                }
            )

        return {
            "id": event.id,
            "pack_id": event.pack_id,
            "title": event.title,
            "status": event.status,
            "tags": tags_view,
            "edit_count": event.edit_count,
            "edits_remaining": settings.MAX_EDIT_LIMIT - event.edit_count,
            "max_edits": settings.MAX_EDIT_LIMIT,
        }

    def configure_tag(self, pack: Pack, event: Event, request) -> None:
        has_trap = any(tag.tag_type == "trap" for tag in request.tags_config)
        if has_trap and pack.mode != "open":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only packs in 'open' mode can have trap tags configured.",
            )

        for tag_data in request.tags_config:
            existing_tag = self.event_tags.get_exisiting_event_tag(
                event.id, tag_data.tag_id
            )

            if existing_tag:
                existing_tag.tag_type = tag_data.tag_type
                existing_tag.content = tag_data.content.model_dump(exclude_none=True)
                self.event_tags.add_event_tag(existing_tag)
            else:
                new_event_tag = EventTag(
                    event_id=event.id,
                    tag_id=tag_data.tag_id,
                    tag_type=tag_data.tag_type,
                    content=tag_data.content.model_dump(exclude_none=True),
                )
                self.event_tags.add_event_tag(new_event_tag)

    def validate_event_ownership(
        self, user: User, event_id: uuid.UUID, request
    ) -> tuple:
        event = self.events.get_event(event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Event not found."
            )

        pack = self.packs.get_pack(event.pack_id)
        if not pack or pack.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own this pack.",
            )

        valid_tags = self.tags.get_by_pack_id(pack.id)
        valid_tag_ids = {tag.id for tag in valid_tags}

        for tag_data in request.tags_config:
            if tag_data.tag_id not in valid_tag_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tag ID {tag_data.tag_id} does not belong to this pack.",
                )
        return event, pack

    def setup_event_journey(self, user: User, event_id: uuid.UUID, request) -> None:
        event, pack = self.validate_event_ownership(user, event_id, request)
        if event.status != "draft":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "You can't setup a saved/live event, use the edit option.",
            )
        
        self.configure_tag(pack, event, request)
        self.session.commit()

    def edit_event(self, user: User, event_id: uuid.UUID, request) -> dict:
        event, pack = self.validate_event_ownership(user, event_id, request)
        
        if event.status == "draft":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Event is still in draft. Use setup instead."
            )
            
        if event.edit_count >= settings.MAX_EDIT_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have reached the maximum edit limit.",
            )
            
        self.configure_tag(pack, event, request)
        event.edit_count += 1
        self.events.add_event(event)
        self.session.commit()
        
        return {
            "edit_count": event.edit_count,
            "edits_remaining": settings.MAX_EDIT_LIMIT - event.edit_count,
            "max_edits": settings.MAX_EDIT_LIMIT,
        }

    def update_event(self, user: User, event_id: uuid.UUID, request: dict) -> Event:
        event = self.events.get_event(event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Event not found."
            )

        pack = self.packs.get_pack(event.pack_id)
        if not pack or pack.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own this pack.",
            )

        if request.get("title") is not None:
            event.title = request.get("title")
        if request.get("status") is not None:
            event.status = request.get("status")

        self.events.add_event(event)
        self.session.commit()
        self.session.refresh(event)

        return event

    def list_my_events(self, user: User) -> List[Event] | None:
        packs = self.packs.get_by_owner_id(user.id)
        pack_ids = [p.id for p in packs]

        if not pack_ids:
            return []

        events = self.events.get_all_events(pack_ids)
        return events
