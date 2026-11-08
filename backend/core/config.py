from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Raccon API"
    GOOGLE_CLIENT_ID: str = ""
    DATABASE_URL: str
    SECRET_KEY: str
    AXIOM_TOKEN: Optional[str] = None
    AXIOM_DATASET: Optional[str] = None
    RESEND_API_KEY: str
    MAX_EDIT_LIMIT: int
    FRONTEND_URL: str = "http://localhost:3000"
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_ACCOUNT_ID: str = ""
    R2_BUCKET_NAME: str = ""
    R2_PUBLIC_URL: str = ""
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

settings = Settings()