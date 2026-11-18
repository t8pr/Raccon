from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from core.database import engine
from core.leaderboard_broadcast import subscribe_leaderboard, broadcast_latest_leaderboard, player_channel
from services.journey_service import JourneyService
from api.auth.dependencies import oauth2_scheme
from api.auth.dependencies import get_current_user
from api.journey.schemas import TagScanRequest, TagScanResponse, SetTrapRequest, LeaderboardResponse
from repositories.event_repo import EventRepository
from models import User
import uuid
from redis.exceptions import RedisError


def authorize_leaderboard_stream(
    event_id: uuid.UUID,
    token: str = Depends(oauth2_scheme),
) -> str:
    with Session(engine) as session:
        user = get_current_user(token=token, session=session)

        event = EventRepository(session).get_event(event_id)

        if event is None:
            raise HTTPException(
                status_code=404,
                detail="Event not found.",
            )
        return user.user_hash
        
router = APIRouter(prefix="/journey", tags=["Journey"])

@router.post("/scan", response_model=TagScanResponse)
def scan_tag(
    request: TagScanRequest,
    http_request: Request,
    background_tasks: BackgroundTasks,
    service: JourneyService = Depends(),
    current_user: User = Depends(get_current_user)
):
    result = service.scan_tag(current_user, **request.model_dump())
    
    if result["status"] != "view_only":
        background_tasks.add_task(
            broadcast_latest_leaderboard,
            http_request.app.state.redis,
            result["event_id"],
        )

    return result

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

@router.get("/leaderboard/{event_id}", response_model=list[LeaderboardResponse])
def get_leaderboard(
    event_id: uuid.UUID,
    service: JourneyService = Depends(),
    current_user: User = Depends(get_current_user)
):
    return service.get_leaderboard(current_user, event_id)

@router.get("/leaderboard/{event_id}/stream")
async def stream_leaderboard(
    event_id: uuid.UUID,
    request: Request,
    user_hash: str = Depends(authorize_leaderboard_stream),
):
    redis_client = request.app.state.redis

    if redis_client is None:
        raise HTTPException(503, "Live updates are unavailable.")

    personal_channel = player_channel(event_id, user_hash)

    async def events():
        try:
            async with subscribe_leaderboard(
                redis_client,
                event_id,
                user_hash,
            ) as subscription:
                while not await request.is_disconnected():
                    message = await subscription.get_message(
                        ignore_subscribe_messages=True,
                        timeout=1,
                    )

                    if not message or message["type"] != "message":
                        yield ": heartbeat\n\n"
                        continue

                    channel = message["channel"]
                    payload = message["data"]

                    if isinstance(channel, bytes):
                        channel = channel.decode("utf-8")

                    if isinstance(payload, bytes):
                        payload = payload.decode("utf-8")

                    event_type = (
                        "player"
                        if channel == personal_channel
                        else "leaderboard"
                    )

                    yield (
                        f"event: {event_type}\n"
                        f"data: {payload}\n\n"
                    )

        except RedisError:
            return

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )