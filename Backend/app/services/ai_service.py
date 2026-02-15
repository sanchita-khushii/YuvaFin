"""
AI Service - handles OpenAI/GitHub token integration for financial advice
"""

from openai import OpenAI
from app.config import settings
from typing import Optional

# Initialize OpenAI client (works with GitHub token too!)
client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=settings.OPENAI_BASE_URL if settings.OPENAI_BASE_URL else None
)

def get_financial_advice(
    question: str,
    user_context: dict,
    model: str = "gpt-4o"
) -> str:
    """
    Get financial advice from AI based on user question and context
    
    Args:
        question: User's financial question
        user_context: Dict with user info (age, income, risk_tolerance, etc.)
        model: AI model to use (default: gpt-4o, you can use gpt-5 if available)
    
    Returns:
        AI-generated financial advice
    """
    
    # Build context for AI
    context = f"""
    You are a financial advisor helping young adults in India with personal finance.
    
    User Profile:
    - Age: {user_context.get('age', 'Not specified')}
    - Monthly Income: ₹{user_context.get('monthly_income', 0):,.0f}
    - Risk Tolerance: {user_context.get('risk_tolerance', 'medium')}
    - Current Expenses: ₹{user_context.get('total_expenses', 0):,.0f}
    - Savings: ₹{user_context.get('savings', 0):,.0f}
    
    Provide practical, actionable advice specific to Indian context.
    Consider tax benefits (80C, 80D, etc.), Indian investment options (PPF, ELSS, NPS),
    and cultural context.
    
    Keep advice under 200 words, friendly, and encouraging.
    """
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": context},
                {"role": "user", "content": question}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        return response.choices[0].message.content
    
    except Exception as e:
        return f"Sorry, I couldn't process your question right now. Error: {str(e)}"


def get_investment_suggestion(
    savings_amount: float,
    user_context: dict,
    model: str = "gpt-4o"
) -> str:
    """
    Get personalized investment suggestions
    
    Args:
        savings_amount: Amount user wants to invest
        user_context: User profile information
        model: AI model to use
    
    Returns:
        Investment advice
    """
    
    risk = user_context.get('risk_tolerance', 'medium')
    age = user_context.get('age', 25)
    income = user_context.get('monthly_income', 30000)
    
    prompt = f"""
    I'm {age} years old with monthly income of ₹{income:,.0f}.
    I have ₹{savings_amount:,.0f} to invest.
    My risk tolerance is {risk}.
    
    Suggest a diversified investment portfolio for me with:
    1. Specific Indian investment options (mutual funds, stocks, PPF, etc.)
    2. Allocation percentages
    3. Expected returns
    4. Tax benefits
    
    Keep it under 250 words.
    """
    
    return get_financial_advice(prompt, user_context, model)


def get_quick_tips(user_context: dict, model: str = "gpt-4o") -> list:
    """
    Get 3-5 quick financial tips based on user profile
    
    Args:
        user_context: User profile information
        model: AI model to use
    
    Returns:
        List of quick tips
    """
    
    prompt = f"""
    Based on this profile:
    - Age: {user_context.get('age', 25)}
    - Income: ₹{user_context.get('monthly_income', 30000):,.0f}
    - Expenses: ₹{user_context.get('total_expenses', 20000):,.0f}
    - Risk: {user_context.get('risk_tolerance', 'medium')}
    
    Give me 5 quick, actionable financial tips (each under 30 words).
    Format as numbered list.
    Focus on Indian context.
    """
    
    try:
        response = get_financial_advice(prompt, user_context, model)
        # Split into tips (basic parsing)
        tips = [tip.strip() for tip in response.split('\n') if tip.strip() and any(char.isdigit() for char in tip[:3])]
        return tips[:5]  # Return max 5 tips
    
    except Exception as e:
        return [
            "1. Start an emergency fund with 3-6 months expenses",
            "2. Invest in ELSS for tax savings under Section 80C",
            "3. Track all expenses using this app",
            "4. Start a SIP with even ₹500/month",
            "5. Get term insurance early when premiums are low"
        ]