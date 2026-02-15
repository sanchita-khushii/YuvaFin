"""
Expense database model
This defines the 'expenses' table
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Expense(Base):
    """
    Expense table - stores user expenses
    """
    __tablename__ = "expenses"
    
    # Columns
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Expense details
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)  # food, transport, rent, etc.
    description = Column(String, nullable=True)
    merchant = Column(String, nullable=True)
    
    # OCR data (if uploaded from bill)
    ocr_text = Column(Text, nullable=True)
    original_filename = Column(String, nullable=True)
    
    # Privacy
    contains_sensitive_data = Column(String, nullable=True)  # JSON string
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    expense_date = Column(DateTime, default=datetime.utcnow)
    
    # Relationship (connect to user)
    user = relationship("User", back_populates="expenses")