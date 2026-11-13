from sqlmodel import Session
from fastapi import Depends, HTTPException, status
from core.database import get_session
from repositories.pack_repo import PackRepository
from repositories.event_repo import EventRepository
from repositories.tag_repo import TagRepository
from repositories.event_tag_repo import EventTagRepository
from repositories.journey_progress_repo import JourneyProgressRepository
from repositories.user_repo import UserRepository
from models import User, JourneyProgress
from datetime import datetime, timezone
from typing import Literal
import uuid


class JourneyService:
    def __init__(self, session: Session = Depends(get_session)):
        self.session = session
        self.events = EventRepository(session)
        self.packs = PackRepository(session)
        self.tags = TagRepository(session)
        self.event_tags = EventTagRepository(session)
        self.journey_progress_repo = JourneyProgressRepository(session)
        self.users = UserRepository(session)
        
    def scan_tag(self, user: User, tag_hash: str, injected_user_hash: str) -> dict:
        if injected_user_hash != user.user_hash:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Security Violation: Link sharing detected.")
            
        tag = self.tags.get_by_static_hash(tag_hash)
        if not tag:
            raise HTTPException(status_code=404, detail="Invalid Tag.")

        event = self.events.get_by_pack_id(tag.pack_id)
            
        if not event:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No event found.")

        event = self.events.lock_event(event.id)

        if not event or event.status != "live":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This event is not live.")

        pack = self.packs.get_pack(event.pack_id)

        event_tag = self.event_tags.get_exisiting_event_tag(event.id, tag.id)

        progress = self.journey_progress_repo.get_user_journey(event.id, user.user_hash)

        if pack.mode == "open" and self.is_complete(event.id):
            result = {
                "status": "view_only",
                "message": "The round has finished.",
                "event_id": event.id,
                "mode": pack.mode,
                "tag_sequence": tag.sequence_num,
                "tag_type": event_tag.tag_type if event_tag else None,
                "content": event_tag.content if event_tag else None,
                "current_score": progress.score if progress else 0,
                "remaining_tags": pack.tags_count - len(progress.visited_sequences) if progress else pack.tags_count,
                "frozen_until": progress.frozen_until if progress else None,
                "event_finished": True,
            }

            self.session.rollback() #release event lock
            return result

        if not progress:
            progress = JourneyProgress(event_id=event.id, user_hash=user.user_hash)
            self.journey_progress_repo.add_progress(progress)

        if progress.status == "completed":
            raise HTTPException(status_code=400, detail="You have already completed this event!")

        if progress.frozen_until and progress.frozen_until > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail={
                "code": "freeze",
                "message": "You are currently frozen and cannot scan tags.",
                "frozen_until": progress.frozen_until.isoformat(),
                "current_score": progress.score,
                "tag_sequence": tag.sequence_num
                }
            )

        if event_tag and event_tag.tag_type == "trap":
            content = event_tag.content or {}
            
            already_visited = tag.sequence_num in progress.visited_sequences
            if already_visited and not content.get("choose"):
                raise HTTPException(
                    status_code=400, 
                    detail={
                    "code": "already_scanned",
                    "message": "You already triggered this trap.",
                    "content": content,
                    "current_score": progress.score,
                    "remaining_tags": self.get_remaining_tags(pack, progress)
                    }
                )

            if not already_visited:
                visited = list(progress.visited_sequences)
                visited.append(tag.sequence_num)
                progress.visited_sequences = visited
            
            if content.get("boom"):
                new_score = max(0, progress.score - content["boom"])
                if new_score != progress.score:
                    progress.score = new_score
                    progress.scanned_at = datetime.now(timezone.utc)
                message = "Boom! You hit a trap and lost points."
                
            elif content.get("freeze"):
                from datetime import timedelta
                freeze_seconds = content.get("freeze")
                progress.frozen_until = datetime.now(timezone.utc) + timedelta(seconds=freeze_seconds)
                message = f"Freeze! You are frozen for {freeze_seconds} seconds."
                
            elif content.get("choose"):
                message = "Choose which trap to activate."

            else:
                message = "You found an empty trap."

            self.journey_progress_repo.add_progress(progress)
            self.session.commit()
            return {
                "status": "choose_required" if content.get("choose") else "trap_triggered",
                "message": message,
                "event_id": event.id,
                "mode": pack.mode,
                "tag_sequence": tag.sequence_num,
                "tag_type": "trap",
                "content": content,
                "current_score": progress.score,
                "remaining_tags": self.get_remaining_tags(pack, progress),
                "frozen_until": progress.frozen_until
            }


        if pack.mode == "seq":
            if tag.sequence_num <= progress.current_sequence:
                raise HTTPException(
                    status_code=400, 
                    detail={
                    "code": "already_scanned",
                    "message": "You have already scanned this tag.",
                    "content": event_tag.content,
                    "current_score": progress.score,
                    "remaining_tags": self.get_remaining_tags(pack, progress)
                    }
                )
            if tag.sequence_num != progress.current_sequence + 1:
                raise HTTPException(
                    status_code=400, 
                    detail={
                    "code": "skipped_tag",
                    "message": f"Skipped tag! You must scan tag {progress.current_sequence + 1} first.",
                    "current_score": progress.score,
                    "remaining_tags": self.get_remaining_tags(pack, progress)
                    }
                )
            
            progress.current_sequence = tag.sequence_num
            progress.score += 1
            progress.scanned_at = datetime.now(timezone.utc)

            if progress.score >= pack.tags_count:
                progress.status = "completed"

        elif pack.mode == "open":
            content = dict(event_tag.content or {}) #create a seperate dict so sqlmodel can detect new content
            
            claimed_by = content.get("claimed_by")
            if claimed_by:
                if claimed_by == user.user_hash:
                    raise HTTPException(
                        status_code=400,
                        detail={
                        "code": "already_scanned",
                        "message": "You already claimed this tag.",
                        "current_score": progress.score,
                        "remaining_tags": self.get_remaining_tags(pack, progress)
                        }
                    )
                
                claimer = self.users.get_by_user_hash(claimed_by)
                claimer_name = claimer.name if claimer else "Another player"
                raise HTTPException(
                    status_code=400, 
                    detail={
                    "code": "claimed_by_another_player",
                    "message": f"Sorry, {claimer_name} claimed this tag before you!",
                    "current_score": progress.score,
                    "remaining_tags": self.get_remaining_tags(pack, progress)
                    }
                )
                
            if tag.sequence_num in progress.visited_sequences:
                raise HTTPException(
                    status_code=400, 
                    detail={
                        "code": "already_scanned",
                        "message": "You already claimed this tag.",
                        "current_score": progress.score,
                        "remaining_tags": self.get_remaining_tags(pack, progress)
                        }
                    )

            content["claimed_by"] = user.user_hash
            event_tag.content = content
            self.event_tags.add_event_tag(event_tag)

            visited = list(progress.visited_sequences)
            visited.append(tag.sequence_num)
            progress.visited_sequences = visited
            progress.score += 1
            progress.scanned_at = datetime.now(timezone.utc)

        self.journey_progress_repo.add_progress(progress)
        self.session.flush() #update progress but dont finalize transaction

        if pack.mode == "open":
            event_finished = self.is_complete(event.id)
        else:
            event_finished = progress.status == "completed"

        if pack.mode == "open" and event_finished:
            self.journey_progress_repo.update_status(event.id)

        self.session.commit()

        return {
            "status": "success",
            "message": f"Tag {tag.sequence_num} scanned successfully!",
            "event_id": event.id,
            "mode": pack.mode,
            "tag_sequence": tag.sequence_num,
            "tag_type": event_tag.tag_type if event_tag else None,
            "content": event_tag.content if event_tag else None,
            "current_score": progress.score,
            "remaining_tags": self.get_remaining_tags(pack, progress),
            "frozen_until": progress.frozen_until,
            "event_finished": event_finished
        }
    
    def get_progress(self, user: User, event_id: uuid.UUID):
        progress = self.journey_progress_repo.get_user_journey(event_id, user.user_hash)
        if not progress:
            return {"score": 0, "status": "not_started", "visited_sequences": []}
        return {
            "score": progress.score, 
            "status": progress.status, 
            "visited_sequences": progress.visited_sequences
        }

    
    def set_player_trap(
        self,
        user: User,
        tag_hash: str,
        injected_user_hash: str,
        trap_type: Literal["boom", "freeze"],
        trap_value: int
    ):
        if injected_user_hash != user.user_hash:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Security Violation.")

        tag = self.tags.get_by_static_hash(tag_hash)
        if not tag:
            raise HTTPException(status_code=404, detail="Invalid Tag.")

        event = self.events.get_by_pack_id(tag.pack_id)
                    
        if not event:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No event found.")
        
        event = self.events.lock_event(event.id)

        if not event or event.status != "live":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This event is not live.")
        
        pack = self.packs.get_pack(event.pack_id)

        if pack.mode == "open" and self.is_complete(event.id):
            raise HTTPException(
                status_code=409,
                detail="The round has finished. Traps cannot be changed.",
            )

        event_tag = self.event_tags.get_exisiting_event_tag(event.id, tag.id)
        
        if not event_tag or event_tag.tag_type != "trap":
            raise HTTPException(status_code=400, detail="This tag is not a trap.")

        current_content = event_tag.content or {}
        if not current_content.get("choose"):
            raise HTTPException(
                status_code=400, 
                detail="This trap has already been activated or is not available for activation."
            )

        new_content = {
            trap_type: trap_value,
            "was_choose": True
        }

        event_tag.content = new_content
        self.event_tags.add_event_tag(event_tag)
        self.session.commit()

        return {
            "status": "success", 
            "message": f"Trap {trap_type} set successfully on tag {tag.sequence_num}.",
            "content": new_content,
        }

    def get_leaderboard(self, user: User, event_id: uuid.UUID):
        return self.journey_progress_repo.get_top_players(event_id)

    def is_complete(self, event_id: uuid.UUID) -> bool:
        event_tags = self.event_tags.get_all_by_event_id(event_id)

        clue_tags = [tag for tag in event_tags if tag.tag_type == "clue"]

        return bool(clue_tags) and all(
            (tag.content or {}).get("claimed_by")
            for tag in clue_tags
        )

    def get_remaining_tags(self, pack, progress) -> int:
        if pack.mode == "seq":
            return pack.tags_count - progress.current_sequence

        return pack.tags_count - len(progress.visited_sequences)
