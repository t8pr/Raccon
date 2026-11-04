from fastapi import APIRouter, Depends, Request
from services.nfc_service import NfcService

router = APIRouter(prefix="/t", tags=["NFC Redirect"])

@router.get("/{tag_hash}")
def handle_nfc_scan(
    tag_hash: str, 
    request: Request, 
    service: NfcService = Depends()
):
    token_cookie = request.cookies.get("access_token")
    return service.handle_nfc_scan(tag_hash, token_cookie)