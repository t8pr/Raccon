from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Raccon API"
    
    DATABASE_URL: str
    SECRET_KEY: str
    
    AXIOM_TOKEN: Optional[str] = None
    AXIOM_DATASET: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

settings = Settings()