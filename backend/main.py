from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.database import init_db
from api.auth.router import router as auth_router
from api.users.router import router as users_router 
from api.health.router import router as health_router
from api.admin.router import router as admin_router
from api.packs.router import router as packs_router
from api.events.router import router as events_router
from api.journey.router import router as journey_router
from scalar_fastapi import get_scalar_api_reference
from core.logger import listener
from fastapi_pagination import add_pagination

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    if listener:
        listener.stop()

app = FastAPI(title="Raccon Event Platform", lifespan=lifespan)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(health_router)
app.include_router(admin_router)
app.include_router(packs_router)
app.include_router(events_router)
app.include_router(journey_router)

origins = [
    "https://react-learning.aalsalhi-eng.workers.dev",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_pagination(app)

@app.get("/")
def root():
    return {"message": "System is running. Database connected!"}

@app.get("/scalar", include_in_schema=False)
async def scalar_html():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
    )