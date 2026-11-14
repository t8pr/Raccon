from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, Request
from services.event_service import EventService
from core.leaderboard_broadcast import broadcast_latest_leaderboard
from models.user import User
from api.auth.dependencies import get_current_user
from api.events.schemas import EventBase, EventDetailResponse, EventTagConfigView, EventUpdateRequest, EventCreateRequest, EventResponse, EventSetupRequest
import uuid
from typing import List
from services.storage_service import StorageService


router = APIRouter(prefix="/events", tags=["Events"])

@router.get("/{event_id}", response_model=EventDetailResponse)
def get_event_details(
    event_id: uuid.UUID,
    service: EventService = Depends(),
    current_user: User = Depends(get_current_user)
):
    return service.get_event_details(current_user, event_id)

@router.put("/{event_id}/setup")
def setup_event_journey(
    event_id: uuid.UUID,
    request: EventSetupRequest,
    service: EventService = Depends(),
    current_user: User = Depends(get_current_user)
):
    service.setup_event_journey(current_user, event_id, request)
    return {"status": "success", "message": "Tag setup saved successfully."}

@router.put("/{event_id}/edit")
def edit_event(
    event_id: uuid.UUID,
    request: EventSetupRequest,
    service: EventService = Depends(),
    current_user: User = Depends(get_current_user)
):
    return service.edit_event(current_user, event_id, request)

@router.patch("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: uuid.UUID,
    request: EventUpdateRequest,
    service: EventService = Depends(),
    current_user: User = Depends(get_current_user)
):
    return service.update_event(current_user, event_id, request.model_dump())

@router.post("/{event_id}/reset")
def reset_event(
    event_id: uuid.UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    service: EventService = Depends(),
    current_user: User = Depends(get_current_user)
):
    result = service.reset_event(current_user, event_id)
    
    background_tasks.add_task(
        broadcast_latest_leaderboard,
        request.app.state.redis,
        event_id,
    )

    return result
@router.get("", response_model=List[EventBase])
def list_my_events(
    service: EventService = Depends(),
    current_user: User = Depends(get_current_user)
):
    return service.list_my_events(current_user)

@router.post("/upload-image")
def upload_hint_image(
    file: UploadFile = File(...),
    service: StorageService = Depends(),
    current_user: User = Depends(get_current_user)
):
    image_url = service.upload_image(file)
    return {"status": "success", "url": image_url}