"""
OCR service - extracts text from bill/salary images and returns structured data.
Pure logic; no FastAPI router or in-memory DB. Routes use this and save to the database.
"""

from typing import Optional
import re
import io
from datetime import datetime
import pytesseract
from PIL import Image

# Windows: set Tesseract path if not on PATH
try:
    pytesseract.get_tesseract_version()
except pytesseract.TesseractNotFoundError:
    import sys
    if sys.platform == "win32":
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# -------------------------
# CATEGORY DETECTION
# -------------------------
def detect_category(text: str) -> str:
    text = text.lower()

    if any(word in text for word in ["restaurant", "food", "cafe", "dine"]):
        return "Food"
    elif any(word in text for word in ["uber", "ola", "rapido", "taxi"]):
        return "Transport"
    elif any(word in text for word in ["amazon", "flipkart", "myntra", "meesho"]):
        return "Shopping"
    elif any(word in text for word in ["electricity", "water", "gas"]):
        return "Utilities"
    else:
        return "Other"


# -------------------------
# CLEAN NUMBER FUNCTION
# -------------------------
def clean_number(num_str: str) -> Optional[float]:
    num_str = num_str.replace(",", "")
    try:
        return float(num_str)
    except (ValueError, TypeError):
        return None


# -------------------------
# DATE EXTRACTION (returns datetime or None for DB)
# -------------------------
def extract_date(text: str) -> Optional[datetime]:
    date_patterns = [
        r"\b(\d{2})[/-](\d{2})[/-](\d{4})\b",
        r"\b(\d{4})[/-](\d{2})[/-](\d{2})\b",
        r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s(\d{2})\s(\d{4})\b",
        r"\b(\d{2})\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s(\d{4})\b",
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            groups = match.groups()
            try:
                if len(groups) == 3:
                    a, b, c = int(groups[0]), int(groups[1]), int(groups[2])
                    if c > 1000:  # year last
                        if a > 12:
                            return datetime(c, b, a)
                        if b > 12:
                            return datetime(c, a, b)
                        return datetime(c, b, a)
                    return datetime(a, b, c)
            except (ValueError, TypeError):
                pass
    return None


# -------------------------
# STRONG BILL TOTAL EXTRACTION
# -------------------------
def extract_bill_total(text):

    lines = text.split("\n")

    priority_keywords = [
        "bill total",
        "grand total",
        "amount payable",
        "amount due",
        "net payable",
        "total amount"
    ]

    # 1️⃣ Look for strong keywords
    for line in lines:
        lower_line = line.lower()

        if any(keyword in lower_line for keyword in priority_keywords):

            numbers = re.findall(r"\d[\d,]*\.?\d*", line)

            for num in reversed(numbers):
                value = clean_number(num)
                if value and value > 10:
                    return value

    # 2️⃣ General total (excluding subtotal)
    for line in lines:
        lower_line = line.lower()

        if "total" in lower_line and "sub" not in lower_line:

            numbers = re.findall(r"\d[\d,]*\.?\d*", line)

            for num in reversed(numbers):
                value = clean_number(num)
                if value and value > 10:
                    return value

    # 3️⃣ Fallback (ignore small values)
    all_numbers = re.findall(r"\d[\d,]*\.?\d*", text)

    valid_numbers = []

    for num in all_numbers:
        value = clean_number(num)
        if value and 10 <= value <= 50000:
            valid_numbers.append(value)

    if valid_numbers:
        return max(valid_numbers)

    return 0


# -------------------------
# STRONG SALARY EXTRACTION
# -------------------------
def extract_salary(text):

    lines = text.split("\n")

    salary_keywords = [
        "net salary",
        "net pay",
        "take home",
        "take-home",
        "gross salary",
        "gross pay",
        "salary credited",
        "amount credited"
    ]

    # 1️⃣ Priority keyword matching
    for line in lines:
        lower_line = line.lower()

        if any(keyword in lower_line for keyword in salary_keywords):

            numbers = re.findall(r"\d[\d,]*\.?\d*", line)

            for num in reversed(numbers):
                value = clean_number(num)
                if value and value > 1000:
                    return value

    # 2️⃣ Fallback: Largest realistic salary
    all_numbers = re.findall(r"\d[\d,]*\.?\d*", text)

    valid_numbers = []

    for num in all_numbers:
        value = clean_number(num)
        if value and 1000 <= value <= 10000000:
            valid_numbers.append(value)

    if valid_numbers:
        return max(valid_numbers)

    return 0.0


# -------------------------
# IMAGE -> TEXT (used by extract_bill_data / extract_salary_from_image)
# -------------------------
def image_bytes_to_text(image_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(image_bytes))
    image = image.convert("RGB")
    return pytesseract.image_to_string(image)


# -------------------------
# BILL: image bytes -> structured data for DB (used by expense routes)
# -------------------------
def extract_bill_data(image_bytes: bytes, filename: str = "") -> dict:
    """
    Returns: amount, expense_date (datetime or None), category, description, ocr_text.
    """
    ocr_text = image_bytes_to_text(image_bytes)
    amount = extract_bill_total(ocr_text)
    expense_date = extract_date(ocr_text)
    category = detect_category(ocr_text)
    description = f"Bill upload: {filename}" if filename else "Bill upload (OCR)"
    return {
        "amount": amount,
        "expense_date": expense_date,
        "category": category,
        "description": description,
        "ocr_text": ocr_text,
    }


# -------------------------
# SALARY: image bytes -> amount (used by expense routes to update user.monthly_income)
# -------------------------
def extract_salary_from_image(image_bytes: bytes) -> float:
    text = image_bytes_to_text(image_bytes)
    return extract_salary(text)
