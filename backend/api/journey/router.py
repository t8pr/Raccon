from fastapi import APIRouter, Depends
from services.journey_service import JourneyService
from api.auth.dependencies import get_current_user
from api.journey.schemas import TagScanRequest, TagScanResponse, SetTrapRequest
from models import User
import uuid


router = APIRouter(prefix="/journey", tags=["Journey"])

@router.post("/scan", response_model=TagScanResponse)
def scan_tag(
    request: TagScanRequest,
    service: JourneyService = Depends(),
    current_user: User = Depends(get_current_user)
):
    return service.scan_tag(current_user, **request.model_dump())

@router.get("/progress/{event_id}")
def get_journey_progress(
    event_id: uuid.UUID,
    service: JourneyService = Depends(),
    current_user: User = Depends(get_current_user)
):
    return service.get_progress(current_user, event_id)

@router.post("/set-trap")
def set_player_trap(
    request: SetTrapRequest,
    service: JourneyService = Depends(),
    current_user: User = Depends(get_current_user)
):
    return service.set_player_trap(current_user, **request.model_dump())