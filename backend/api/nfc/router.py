from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlmodel import Session
import jwt
from core.security import SECRET_KEY, ALGORITHM
from core.database import get_session
from core.config import settings
from repositories.user_repo import UserRepository

router = APIRouter(prefix="/t", tags=["NFC Redirect"])

@router.get("/{tag_hash}")
def handle_nfc_scan(tag_hash: str, request: Request, session: Session = Depends(get_session)):
    token_cookie = request.cookies.get("access_token")
    token = None
    if token_cookie and token_cookie.startswith("Bearer "):
        token = token_cookie.split(" ")[1]
    
    if not token:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?redirect_tag={tag_hash}")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        user = UserRepository(session).get_by_id(user_id)
        
        if not user:
            raise Exception("User not found")
            
    except Exception:
        response = RedirectResponse(url=f"{settings.FRONTEND_URL}/login?redirect_tag={tag_hash}")
        response.delete_cookie("access_token")
        return response
    
    injected_hash = user.user_hash
    redirect_url = f"{settings.FRONTEND_URL}/scan?tag={tag_hash}&user={injected_hash}"
    
    return RedirectResponse(url=redirect_url)