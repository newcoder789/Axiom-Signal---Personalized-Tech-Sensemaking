import os
from sqlmodel import SQLModel, create_engine, Session

# Use DATABASE_URL from environment for production (Postgres/Neon)
# Fallback to local SQLite for development
database_url = os.getenv("DATABASE_URL")

if not database_url:
    sqlite_file_name = "user_memory.db"
    database_url = f"sqlite:///{sqlite_file_name}"
    connect_args = {"check_same_thread": False}
else:
    # SQLAlchemy requires postgresql:// instead of postgres://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    connect_args = {}

engine = create_engine(database_url, echo=True, connect_args=connect_args)

def create_db_and_tables():
    from .models import UserMemory, AgentInteraction, DetectedPattern
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
