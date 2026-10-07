from sqlmodel import create_engine, Session, SQLModel
from core.config import settings

engine = create_engine(settings.DATABASE_URL, echo=True)

def init_db():
    import models

def get_session():
    with Session(engine) as session:
        yield session