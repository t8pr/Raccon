from fastapi.responses import RedirectResponse
from sqlmodel import Session
from fastapi import Depends
import jwt
from core.database import get_session
from core.security import SECRET_KEY, ALGORITHM
from core.config import settings
from repositories.user_repo import UserRepository

class NfcService:
    def __init__(self, session: Session = Depends(get_session)):
        self.session = session
        self.users = UserRepository(session)

    def handle_nfc_scan(self, tag_hash: str, token_cookie: str | None) -> RedirectResponse:
        token = None
        if token_cookie and token_cookie.startswith("Bearer "):
            token = token_cookie.split(" ")[1]

        if not token:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?redirect_tag={tag_hash}")

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            user = self.users.get_by_id(user_id)
            
            if not user:
                raise Exception("User not found")
                
        except Exception:
            response = RedirectResponse(url=f"{settings.FRONTEND_URL}/login?redirect_tag={tag_hash}")
            response.delete_cookie("access_token")
            return response

        injected_hash = user.user_hash
        redirect_url = f"{settings.FRONTEND_URL}/scan?tag={tag_hash}&user={injected_hash}"
        
        return RedirectResponse(url=redirect_url)