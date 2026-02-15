"""
Database connection setup
This connects your app to PostgreSQL
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create database engine (the connection)
engine = create_engine(settings.DATABASE_URL)

# Create session factory (how we talk to the database)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all database models
Base = declarative_base()

def get_db():
    """
    Get database session
    This is used in API routes to access the database
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()