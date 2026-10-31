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
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

settings = Settings()