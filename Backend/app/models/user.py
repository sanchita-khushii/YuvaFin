"""
User database model
This defines the 'users' table in PostgreSQL
"""

import enum
from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class RiskTolerance(str, enum.Enum):
    """Risk tolerance levels for user profile."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class User(Base):
    """
    User table - stores user information
    """
    __tablename__ = "users"
    
    # Columns
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    
    # User profile
    age = Column(Integer)
    monthly_income = Column(Float, default=0.0)
    risk_tolerance = Column(String, default="medium")  # low, medium, high
    
    # ML Segmentation
    user_segment = Column(String, nullable=True)  # Will be set by ML
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships (connect to other tables)
    expenses = relationship("Expense", back_populates="user")