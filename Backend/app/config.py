"""
Configuration file - loads settings from .env file
Think of this as the "settings menu" for your app
"""

from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """
    App settings loaded from .env file
    """
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"  # Encryption method for passwords
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    
    # OpenAI / GitHub Token
    OPENAI_API_KEY: str
    OPENAI_BASE_URL: Optional[str] = None  # For GitHub models
    
    # Pinecone (optional)
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_ENVIRONMENT: str = "us-east-1"
    PINECONE_INDEX_NAME: str = "financial-advisor"
    
    # CORS (which websites can access the API)
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000"
    
    class Config:
        env_file = ".env"  # Load from .env file
        case_sensitive = True

# Create single instance
settings = Settings()