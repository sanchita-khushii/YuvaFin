"""
Dashboard routes - database integrated version
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.expense import Expense
from app.services.auth_service import get_current_user, get_current_user_or_upload_fallback

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_or_upload_fallback),
):
    """
    Returns dashboard data for CURRENT MONTH only
    """

    # -----------------------------
    # Get Current Month Range
    # -----------------------------
    now = datetime.utcnow()
    first_day = datetime(now.year, now.month, 1)

    if now.month == 12:
        next_month = datetime(now.year + 1, 1, 1)
    else:
        next_month = datetime(now.year, now.month + 1, 1)

    # -----------------------------
    # Fetch Current Month Expenses
    # -----------------------------
    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.expense_date >= first_day,
        Expense.expense_date < next_month
    ).all()

    # -----------------------------
    # Basic Calculations
    # -----------------------------
    total_expense = sum(e.amount for e in expenses)
    income = current_user.monthly_income or 0.0
    savings = income - total_expense

    savings_percentage = 0
    expense_percentage = 0

    if income > 0:
        savings_percentage = round((savings / income) * 100, 2)
        expense_percentage = round((total_expense / income) * 100, 2)

    expense_count = len(expenses)

    # -----------------------------
    # Category Breakdown
    # -----------------------------
    category_summary = {}

    for expense in expenses:
        category_summary[expense.category] = (
            category_summary.get(expense.category, 0) + expense.amount
        )

    category_breakdown = []

    for category, amount in category_summary.items():
        percentage = 0
        if income > 0:
            percentage = round((amount / income) * 100, 2)

        category_breakdown.append({
            "category": category,
            "amount": amount,
            "percentage_of_income": percentage
        })

    # -----------------------------
    # Top Spending Category
    # -----------------------------
    top_category = None
    if category_summary:
        top_category = max(category_summary, key=category_summary.get)

    # -----------------------------
    # Financial Status
    # -----------------------------
    if income == 0:
        financial_status = "No Income Data"
    elif savings_percentage >= 40:
        financial_status = "Excellent"
    elif savings_percentage >= 20:
        financial_status = "Good"
    elif savings_percentage >= 0:
        financial_status = "Needs Improvement"
    else:
        financial_status = "Overspending"

    # -----------------------------
    # Insights
    # -----------------------------
    insights = []

    if income > 0:
        if savings_percentage < 20:
            insights.append("⚠️ Your savings are below 20% of income.")
        elif savings_percentage > 40:
            insights.append("✅ Excellent savings habit!")

        if top_category:
            insights.append(f"💡 Highest spending category: {top_category}")

    projected_yearly_savings = savings * 12

    # -----------------------------
    # Final Response
    # -----------------------------
    return {
        "income": income,
        "total_expense": total_expense,
        "savings": savings,
        "savings_percentage": savings_percentage,
        "expense_percentage": expense_percentage,
        "expense_count": expense_count,
        "financial_status": financial_status,
        "top_spending_category": top_category,
        "category_breakdown": category_breakdown,
        "projected_yearly_savings": projected_yearly_savings,
        "insights": insights
    }
