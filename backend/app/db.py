import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg://rina:rina@db:5432/rina"
).strip()

# Accept plain connection strings as given by Neon/Supabase/etc.
for prefix in ("postgresql://", "postgres://"):
    if DATABASE_URL.startswith(prefix):
        DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len(prefix):]
        break

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=5)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
