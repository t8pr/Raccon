from fastapi import FastAPI
from contextlib import asynccontextmanager
from core.database import init_db

from api.auth.router import router as auth_router 

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Raccon Event Platform", lifespan=lifespan)

app.include_router(auth_router)

@app.get("/")
def root():
    return {"message": "System is running. Database connected!"}