"""
Main FastAPI application
This is the entry point that starts the server
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base

# Import all routes
from app.routes import auth, expenses, dashboard, ai_advisor

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Youth Financial Empowerment Platform",
    description="AI-powered financial planning for young adults in India",
    version="1.0.0"
)

# CORS middleware (allows frontend to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(expenses.router)
app.include_router(dashboard.router)
app.include_router(ai_advisor.router)

# Health check endpoint
@app.get("/")
def root():
    """
    Root endpoint - check if API is running
    """
    return {
        "message": "Youth Financial Empowerment Platform API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy"}

from ocr import router as ocr_router

# Include routers
app.include_router(ocr_router)

@app.get("/")
def home():
    return {"message": "Backend is working successfully!"}
