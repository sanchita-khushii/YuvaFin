"""
Expense routes - handles expense creation, retrieval, deletion, and OCR bill/salary uploads
"""

from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from PIL import UnidentifiedImageError
from sqlalchemy import func
import pytesseract
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate, UploadBillResponse
from app.services.auth_service import get_current_user, get_current_user_or_upload_fallback
from app.services.ocr import extract_bill_data, extract_salary_from_image

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])

@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new expense manually
    """
    new_expense = Expense(
        user_id=current_user.id,
        amount=expense.amount,
        category=expense.category,
        description=expense.description,
        merchant=expense.merchant,
        expense_date=expense.expense_date
    )
    
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    
    return new_expense

@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all expenses for current user
    """
    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    return expenses

@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific expense by ID
    """
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == current_user.id
    ).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    return expense

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an expense
    """
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == current_user.id
    ).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    db.delete(expense)
    db.commit()
    
    return None

@router.post("/upload-bill", response_model=UploadBillResponse)
async def upload_bill(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_or_upload_fallback),
):
    """
    Upload one or more bill images. OCR extracts amount, date, category; expenses are
    saved under the logged-in user. Send header: Authorization: Bearer <token> (from
    POST /api/auth/login/json with {"email": "...", "password": "..."}). If
    ALLOW_UPLOAD_WITHOUT_AUTH=true in .env (dev), token is optional and first user is used.
    """
    added = []
    for file in files:
        contents = await file.read()
        if not contents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{file.filename or 'unknown'}' is empty. Please upload a valid image (JPEG, PNG, GIF).",
            )
        try:
            data = extract_bill_data(contents, filename=file.filename or "")
        except UnidentifiedImageError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not read image from '{file.filename or 'file'}'. Use a JPEG, PNG, or GIF image.",
            )
        except pytesseract.TesseractNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OCR engine (Tesseract) is not installed. Install from https://github.com/UB-Mannheim/tesseract/wiki and add it to PATH, or set Tesseract path in the app.",
            )
        expense_date = data["expense_date"] or datetime.utcnow()
        new_expense = Expense(
            user_id=current_user.id,
            amount=data["amount"],
            category=data["category"],
            description=data["description"],
            original_filename=file.filename,
            ocr_text=data.get("ocr_text"),
            expense_date=expense_date,
        )
        db.add(new_expense)
        db.commit()
        db.refresh(new_expense)
        added.append(new_expense)
    return UploadBillResponse(
        expenses=added,
        saved_for_user_id=current_user.id,
        saved_for_email=current_user.email,
    )


@router.post("/upload-salary")
async def upload_salary(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_or_upload_fallback),
):
    """
    Upload salary slip image; OCR extracts amount and updates user's monthly_income.
    Same auth as upload-bill (Bearer token or dev fallback if ALLOW_UPLOAD_WITHOUT_AUTH=true).
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty. Please upload a valid image (JPEG, PNG, GIF).",
        )
    try:
        detected_salary = extract_salary_from_image(contents)
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read image. Use a JPEG, PNG, or GIF image.",
        )
    except pytesseract.TesseractNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OCR engine (Tesseract) is not installed. Install from https://github.com/UB-Mannheim/tesseract/wiki.",
        )
    current_user.monthly_income = detected_salary
    db.commit()
    db.refresh(current_user)
    total_expense_sum = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(Expense.user_id == current_user.id)
        .scalar()
        or 0.0
    )
    savings = detected_salary - total_expense_sum
    return {
        "detected_income": detected_salary,
        "total_expense": total_expense_sum,
        "savings": savings,
        "message": "Salary slip processed; monthly income updated.",
    }