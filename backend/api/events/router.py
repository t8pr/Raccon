from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from core.database import get_session
from models.user import User
from models.tag import Tag
from api.auth.dependencies import get_current_user
from api.events.schemas import TagScanRequest, TagScanResponse
import uuid
from models.pack import Pack
from models.event import Event
from models.event_tag import EventTag
from api.events.schemas import EventCreateRequest, EventResponse, EventSetupRequest

router = APIRouter(prefix="/events", tags=["Events"])

@router.put("/{event_id}/setup")
def setup_event_journey(
    event_id: uuid.UUID,
    request: EventSetupRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    
    pack = session.get(Pack, event.pack_id)
    if not pack or pack.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this pack.")

    existing_tags = session.exec(select(EventTag).where(EventTag.event_id == event_id)).all()
    for et in existing_tags:
        session.delete(et)
    
    for tag_data in request.tags_config:
        event_tag = EventTag(
            event_id=event.id,
            tag_id=tag_data.tag_id,
            tag_type=tag_data.tag_type,
            content=tag_data.content
        )
        session.add(event_tag)
        
    session.commit()
    return {"status": "success", "message": "Player journey configured successfully"}

@router.post("/scan", response_model=TagScanResponse)
def scan_tag(
    request: TagScanRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):

    if request.injected_user_hash != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security Violation: You cannot use a link shared by another player."
        )

    tag = session.exec(select(Tag).where(Tag.static_hash == request.tag_hash)).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Invalid Tag. This tag does not exist.")

    # TODO: Check if this user has scanned tag (sequence_num - 1) before allowing this one.
    
    return TagScanResponse(
        status="success",
        message=f"Tag {tag.sequence_num} verified successfully!",
        tag_sequence=tag.sequence_num
    )