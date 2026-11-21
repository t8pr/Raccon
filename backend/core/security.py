import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from core.config import settings 

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # for week

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def generate_token(data: dict, exp_minutes: int, purpose: str) -> str:
    """
    Helper function that genertaes JWT
    based on expiration time and purpose.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=exp_minutes)
    to_encode.update({
            "exp": expire,
            "purpose": purpose
        })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_access_token(data: dict) -> str:
    return generate_token(
        data=data,
        exp_minutes=ACCESS_TOKEN_EXPIRE_MINUTES,
        purpose="access"
    )
