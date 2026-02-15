"""
Dashboard routes - analytics and statistics
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Dict

from app.database import get_db
from app.models.user import User
from app.models.expense import Expense
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get complete financial dashboard summary
    """
    # Get all user expenses
    expenses = db.query(Expense).filter(Expense.user_id == current_user.id).all()
    
    # Calculate total expenses
    total_expenses = sum(expense.amount for expense in expenses)
    
    # Get monthly income
    monthly_income = current_user.monthly_income or 0.0
    
    # Calculate savings
    savings = monthly_income - total_expenses
    savings_rate = (savings / monthly_income * 100) if monthly_income > 0 else 0.0
    
    # Expense by category
    expense_by_category = {}
    for expense in expenses:
        category = expense.category
        if category in expense_by_category:
            expense_by_category[category] += expense.amount
        else:
            expense_by_category[category] = expense.amount
    
    # Monthly trend (last 6 months)
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    monthly_expenses = db.query(
        func.extract('month', Expense.expense_date).label('month'),
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.user_id == current_user.id,
        Expense.expense_date >= six_months_ago
    ).group_by('month').all()
    
    monthly_trend = [
        {"month": int(month), "amount": float(total)}
        for month, total in monthly_expenses
    ]
    
    return {
        "total_expenses": total_expenses,
        "total_income": monthly_income,
        "savings": savings,
        "savings_rate": round(savings_rate, 2),
        "expense_by_category": expense_by_category,
        "monthly_trend": monthly_trend,
        "user_segment": current_user.user_segment
    }

@router.get("/statistics")
def get_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed statistics
    """
    expenses = db.query(Expense).filter(Expense.user_id == current_user.id).all()
    
    if not expenses:
        return {
            "total_expenses": 0,
            "average_expense": 0,
            "largest_expense": 0,
            "expense_count": 0
        }
    
    amounts = [e.amount for e in expenses]
    
    return {
        "total_expenses": sum(amounts),
        "average_expense": sum(amounts) / len(amounts),
        "largest_expense": max(amounts),
        "smallest_expense": min(amounts),
        "expense_count": len(expenses)
    }

@router.get("/global-impact")
def get_global_impact(db: Session = Depends(get_db)):
    """
    Get platform-wide impact metrics
    """
    total_users = db.query(User).count()
    total_expenses_tracked = db.query(Expense).count()
    
    # Calculate total savings (simplified)
    all_users = db.query(User).all()
    total_potential_savings = 0
    
    for user in all_users:
        user_expenses = db.query(Expense).filter(Expense.user_id == user.id).all()
        total_expenses = sum(e.amount for e in user_expenses)
        income = user.monthly_income or 0
        savings = income - total_expenses
        if savings > 0:
            total_potential_savings += savings
    
    return {
        "total_users": total_users,
        "total_expenses_tracked": total_expenses_tracked,
        "total_platform_savings": total_potential_savings,
        "average_savings_per_user": total_potential_savings / total_users if total_users > 0 else 0
    }