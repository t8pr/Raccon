from fastapi import FastAPI
from contextlib import asynccontextmanager
from core.database import init_db
from api.auth.router import router as auth_router
from api.users.router import router as users_router 
from api.health.router import router as health_router
from api.admin.router import router as admin_router
from api.packs.router import router as packs_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Raccon Event Platform", lifespan=lifespan)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(health_router)
app.include_router(admin_router)
app.include_router(packs_router)

@app.get("/")
def root():
    return {"message": "System is running. Database connected!"}