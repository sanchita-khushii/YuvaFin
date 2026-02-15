from fastapi import APIRouter, UploadFile, File
from typing import List
import pytesseract
from PIL import Image
import io
import re

# Create router
router = APIRouter()

# Tesseract path
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# Import database from main
from main import database


# -------------------------
# Category Detection
# -------------------------
def detect_category(text):
    text = text.lower()

    if "restaurant" in text or "food" in text or "cafe" in text:
        return "Food"
    elif "uber" in text or "ola" in text or "rapido" in text or "taxi" in text:
        return "Transport"
    elif "amazon" in text or "flipkart" in text or "meesho" in text or "myntra" in text:
        return "Shopping"
    elif "electricity" in text or "water" in text or "gas" in text:
        return "Utilities"
    else:
        return "Other"


# -------------------------
# Upload Bill
# -------------------------
@router.post("/upload-bill")
async def upload_bill(files: List[UploadFile] = File(...)):

    added_expenses = []

    for file in files:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        image = image.convert("RGB")
        extracted_text = pytesseract.image_to_string(image)

        total_amount = None
        lines = extracted_text.split("\n")

        for line in lines:
            if "total" in line.lower():
                numbers = re.findall(r"\d+\.?\d*", line)
                if numbers:
                    total_amount = float(numbers[-1])
                    break

        if total_amount is None:
            numbers = re.findall(r"\d+\.?\d*", extracted_text)
            numbers = [float(num) for num in numbers]
            total_amount = max(numbers) if numbers else 0

        category = detect_category(extracted_text)

        database["expenses"].append({
            "amount": total_amount,
            "category": category,
            "description": file.filename
        })

        added_expenses.append(total_amount)

    total_expense = sum(item["amount"] for item in database["expenses"])

    income_amount = 0
    if database["income"] is not None:
        income_amount = database["income"]["amount"]

    savings = income_amount - total_expense

    return {
        "new_expenses_added": added_expenses,
        "total_expense": total_expense,
        "income": income_amount,
        "savings": savings
    }


# -------------------------
# Upload Salary
# -------------------------
@router.post("/upload-salary")
async def upload_salary(file: UploadFile = File(...)):

    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    image = image.convert("RGB")
    extracted_text = pytesseract.image_to_string(image)

    numbers = re.findall(r"\d+\.?\d*", extracted_text)
    numbers = [float(num) for num in numbers]

    estimated_salary = max(numbers) if numbers else 0

    database["income"] = {
        "amount": estimated_salary,
        "source": "Salary Slip Upload"
    }

    total_expense = sum(item["amount"] for item in database["expenses"])
    savings = estimated_salary - total_expense

    return {
        "detected_income": estimated_salary,
        "total_expense": total_expense,
        "savings": savings
    }
