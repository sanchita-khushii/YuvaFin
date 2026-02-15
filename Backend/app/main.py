"""
Main FastAPI application
This is the entry point that starts the server
"""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
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
    version="1.0.0",
)

# Add Bearer token option to Swagger UI so you can paste your token after login
from fastapi.openapi.utils import get_openapi
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    # Add Bearer (paste token) option for Swagger Authorize
    openapi_schema["components"]["securitySchemes"] = openapi_schema.get("components", {}).get("securitySchemes") or {}
    openapi_schema["components"]["securitySchemes"]["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Paste the access_token from POST /api/auth/login/json here. No quotes.",
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema
app.openapi = custom_openapi

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


# Simple page: login then upload bill — token is sent automatically so bills are saved to your account
_upload_page = Path(__file__).resolve().parent / "static" / "upload_with_token.html"
@app.get("/upload-with-token", include_in_schema=False)
def upload_with_token_page():
    """Open this page in the browser: login, then upload a bill. Your token is sent so the bill is stored under your user."""
    if _upload_page.exists():
        return FileResponse(_upload_page)
    return {"message": "Static file not found. Use /docs to Authorize with your token and call POST /api/expenses/upload-bill."}
