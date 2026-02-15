"""
User schemas - define how user data should look
These are like "forms" that validate data
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# Base schema (common fields)
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    age: Optional[int] = None
    monthly_income: Optional[float] = 0.0
    risk_tolerance: Optional[str] = "medium"

# For creating new user (registration)
class UserCreate(UserBase):
    password: str

# For updating user
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    monthly_income: Optional[float] = None
    risk_tolerance: Optional[str] = None

# For returning user data (what API sends back)
class UserResponse(UserBase):
    id: int
    user_segment: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True  # Allows conversion from database model

# For login
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# For token response
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None