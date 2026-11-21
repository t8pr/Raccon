from contextlib import asynccontextmanager
from sqlmodel import Session
from core.database import engine
from core.logger import logger
from repositories.journey_progress_repo import JourneyProgressRepository
from redis.asyncio import Redis
from redis.exceptions import RedisError
from starlette.concurrency import run_in_threadpool
import json
import uuid


@asynccontextmanager
async def subscribe_leaderboard(
    redis_client: Redis,
    event_id: uuid.UUID,
    user_hash: str,
):
    async with redis_client.pubsub() as subscription:
        await subscription.subscribe(
            leaderboard_channel(event_id),
            player_channel(event_id, user_hash),
        )
        yield subscription


def leaderboard_channel(event_id: uuid.UUID) -> str:
    return f"leaderboard:{event_id}"


def player_channel(event_id: uuid.UUID, user_hash: str) -> str:
    return f"leaderboard:{event_id}:player:{user_hash}"


async def publish_leaderboard(redis_client: Redis | None, event_id: uuid.UUID, players: list[dict]) -> bool:
    if redis_client is None:
        return False

    try:
        await redis_client.publish(
            leaderboard_channel(event_id),
            json.dumps(players),
        )
        return True #message is published, not receieved

    except RedisError:
        return False


async def publish_player(redis_client: Redis, event_id: uuid.UUID, player: dict) -> None:
    await redis_client.publish(
        player_channel(event_id, player["user_hash"]),
        json.dumps(player),
    )


def load_leaderboard(event_id: uuid.UUID) -> list[dict]:
    with Session(engine) as session:
        return JourneyProgressRepository(session).get_ranked_players(event_id)


async def broadcast_latest_leaderboard(
    redis_client: Redis | None, event_id: uuid.UUID,
) -> None:
    if redis_client is None:
        return

    try:
        players = await run_in_threadpool(load_leaderboard, event_id)

        # Everyone receives the same top 10
        published = await publish_leaderboard(
            redis_client,
            event_id,
            players[:10],
        )

        if not published:
            logger.warning("Leaderboard publish failed for %s", event_id)

        # While each player receives their own rank
        for player in players:
            await publish_player(redis_client, event_id, player)

    except Exception:
        logger.exception("Leaderboard broadcast failed for %s", event_id)