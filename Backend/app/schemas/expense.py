"""
Expense schemas - define how expense data should look
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Base schema
class ExpenseBase(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    merchant: Optional[str] = None

# For creating new expense
class ExpenseCreate(ExpenseBase):
    expense_date: Optional[datetime] = None

# For updating expense
class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    merchant: Optional[str] = None

# For returning expense data
class ExpenseResponse(ExpenseBase):
    id: int
    user_id: int
    created_at: datetime
    expense_date: datetime
    ocr_text: Optional[str] = None
    contains_sensitive_data: Optional[str] = None
    
    class Config:
        from_attributes = True

# For dashboard statistics
class DashboardSummary(BaseModel):
    total_expenses: float
    total_income: float
    savings: float
    savings_rate: float
    expense_by_category: dict
    monthly_trend: list

# For AI advisor
class AdvisorQuestion(BaseModel):
    question: str

class AdvisorResponse(BaseModel):
    question: str
    advice: str
    generated_at: datetime