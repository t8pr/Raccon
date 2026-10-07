from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["System Health"])

@router.get("/")
def health_check():
    return {
        "status": "ok",
        "message": "Raccon APIs is running!"
    }