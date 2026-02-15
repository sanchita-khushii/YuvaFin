"""
AI Financial Advisor routes
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.expense import Expense
from app.schemas.expense import AdvisorQuestion, AdvisorResponse
from app.services.auth_service import get_current_user
from app.services.ai_service import get_financial_advice, get_investment_suggestion, get_quick_tips

router = APIRouter(prefix="/api/advisor", tags=["AI Advisor"])

def get_user_context(db: Session, user: User) -> dict:
    """
    Build user context for AI
    """
    expenses = db.query(Expense).filter(Expense.user_id == user.id).all()
    total_expenses = sum(e.amount for e in expenses)
    
    return {
        "age": user.age,
        "monthly_income": user.monthly_income,
        "risk_tolerance": user.risk_tolerance,
        "total_expenses": total_expenses,
        "savings": user.monthly_income - total_expenses if user.monthly_income else 0,
        "user_segment": user.user_segment
    }

@router.post("/ask", response_model=AdvisorResponse)
def ask_advisor(
    question: AdvisorQuestion,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ask the AI financial advisor any question
    """
    # Get user context
    user_context = get_user_context(db, current_user)
    
    # Get AI advice
    advice = get_financial_advice(question.question, user_context)
    
    return {
        "question": question.question,
        "advice": advice,
        "generated_at": datetime.utcnow()
    }

@router.post("/investment-suggestion")
def investment_suggestion(
    savings_amount: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get personalized investment suggestions
    """
    user_context = get_user_context(db, current_user)
    suggestion = get_investment_suggestion(savings_amount, user_context)
    
    return {
        "savings_amount": savings_amount,
        "suggestion": suggestion,
        "generated_at": datetime.utcnow()
    }

@router.get("/quick-tips")
def quick_tips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get quick financial tips
    """
    user_context = get_user_context(db, current_user)
    tips = get_quick_tips(user_context)
    
    return {
        "tips": tips,
        "user_profile": {
            "age": current_user.age,
            "monthly_income": current_user.monthly_income,
            "risk_tolerance": current_user.risk_tolerance
        }
    }