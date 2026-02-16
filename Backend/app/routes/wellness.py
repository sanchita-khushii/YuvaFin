"""
Financial Wellness Engine
Separate AI-powered structured analysis
NOT chatbot.
NOT dashboard.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv
import os
import json

from app.database import get_db
from app.models.user import User
from app.models.expense import Expense
from app.services.auth_service import get_current_user_or_upload_fallback

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/api/wellness", tags=["Financial Wellness"])


# Use the same token from your main config
from app.config import settings

client = OpenAI(
    api_key=settings.OPENAI_API_KEY,  # Uses your GitHub token from .env
    base_url=settings.OPENAI_BASE_URL if settings.OPENAI_BASE_URL else "https://models.inference.ai.azure.com"
)

@router.get("/analysis")
def financial_wellness_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_or_upload_fallback),
):
    """
    AI-driven structured financial wellness analysis.
    Uses current month DB data.
    """

    # -------------------------
    # 1️⃣ Current month filtering
    # -------------------------
    now = datetime.utcnow()
    first_day = datetime(now.year, now.month, 1)

    if now.month == 12:
        next_month = datetime(now.year + 1, 1, 1)
    else:
        next_month = datetime(now.year, now.month + 1, 1)

    monthly_expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.expense_date >= first_day,
        Expense.expense_date < next_month
    ).all()

    income = current_user.monthly_income or 0.0

    if income == 0:
        return {"error": "Please upload salary first."}

    total_expense = sum(e.amount for e in monthly_expenses)
    savings = income - total_expense

    savings_ratio = round(savings / income, 2)
    expense_ratio = round(total_expense / income, 2)

    category_summary = {}

    for expense in monthly_expenses:
        category_summary[expense.category] = (
            category_summary.get(expense.category, 0) + expense.amount
        )

    financial_data = {
        "income": income,
        "total_expense": total_expense,
        "savings": savings,
        "savings_ratio": savings_ratio,
        "expense_ratio": expense_ratio,
        "category_breakdown": category_summary,
        "age": current_user.age,
        "risk_tolerance": current_user.risk_tolerance
    }

    # -------------------------
    # 2️⃣ Strong Structured Prompt
    # -------------------------
    prompt = f"""
    You are an elite institutional-grade fintech financial wellness AI engine.

    You specialize in financial psychology, behavioral finance, risk modeling,
    youth wealth building (age under 30), stress economics, and long-term capital strategy.

    You must produce a structured, data-driven financial health assessment.

    STRICT RULES:
    - Return ONLY valid JSON.
    - No markdown.
    - No commentary outside JSON.
    - No explanations before or after JSON.
    - Do NOT repeat input.
    - Do NOT invent missing values.
    - Base reasoning strictly on the provided financial data.
    - Be analytical, not motivational.
    - Avoid generic advice.
    - Avoid vague statements.

    FINANCIAL DATA:
    {financial_data}

    OBJECTIVE:

    Perform a multi-layered financial health evaluation including:

    1. Financial Stability Analysis
    2. Savings Efficiency Assessment
    3. Expense Risk Mapping
    4. Behavioral Risk Indicators
    5. Financial Stress Modeling
    6. Investment Readiness Evaluation
    7. Wealth Acceleration Potential
    8. Risk Tolerance Alignment Check

    SCORING METHODOLOGY:

    - Score must be 0–100.
    - 90–100: Elite Financial Position
    - 75–89: Strong Financial Control
    - 60–74: Stable but Needs Optimization
    - 40–59: Financial Vulnerability
    - 0–39: Financially Stressed

    Financial Stress Index:
    - Low: savings_ratio >= 0.35
    - Moderate: savings_ratio between 0.15 and 0.35
    - High: savings_ratio < 0.15 or negative savings

    Risk Profile Determination:
    - Conservative → low savings, unstable ratios
    - Balanced → moderate savings, stable pattern
    - Aggressive → high savings, growth capacity

    You MUST:

    - Quantify financial weaknesses
    - Identify structural spending imbalance
    - Detect dependency risk (high category concentration)
    - Evaluate liquidity buffer quality
    - Identify long-term compounding readiness
    - Provide measurable action items
    - Give precise percentage-based improvement targets
    - Provide youth-focused growth strategy
    - If financially strong → focus on capital scaling
    - If financially stressed → focus on stabilization first

    OUTPUT FORMAT (STRICT JSON ONLY):

    {{
    "financial_wellness_score": integer,
    "level": "Elite Financial Position | Strong Financial Control | Stable but Needs Optimization | Financial Vulnerability | Financially Stressed",
    "financial_stress_index": "Low | Moderate | High",
    "risk_profile": "Conservative | Balanced | Aggressive",
    "analysis_summary": "Detailed analytical paragraph (not motivational)",
    "identified_risks": ["list of quantified risks"],
    "behavioral_insights": ["list of spending pattern insights"],
    "saving_strategy": ["specific measurable actions"],
    "investment_strategy": ["age-appropriate investment strategy"],
    "stress_management_strategy": ["practical financial stress control steps"],
    "growth_strategy": ["wealth scaling steps if applicable"],
    "short_term_action_plan": ["30-day measurable steps"],
    "long_term_action_plan": ["1-5 year capital strategy"]
    }}
    """


    # -------------------------
    # 3️⃣ Call GitHub Model
    # -------------------------
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a fintech advisor."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5
        )

        content = response.choices[0].message.content

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {
                "error": "AI response not valid JSON",
                "raw_response": content
            }

    except Exception as e:
        return {
            "error": "AI request failed",
            "details": str(e)
        }
