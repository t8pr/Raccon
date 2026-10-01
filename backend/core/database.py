import os
from sqlmodel import create_engine, Session, SQLModel
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    import models  # Ensure models are loaded before creating tables
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
