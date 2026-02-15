"""
Authentication service - handles login, registration, password security
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import TokenData

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token (raises 403 when header missing)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
# Optional: no header -> None, so we can return a clear 401 message
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)
# Lets Swagger UI show a "Bearer token" box so you can paste the token after login
http_bearer_optional = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """
    Hash a password (make it secure)
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Check if password is correct
    """
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create JWT token (like a secure ID card)
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def authenticate_user(db: Session, email: str, password: str):
    """
    Check if user credentials are correct
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def _credentials_exception(message: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _get_token(
    oauth_token: Optional[str] = Depends(oauth2_scheme_optional),
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_optional),
) -> Optional[str]:
    """Get token from either OAuth2 or Bearer header (so Swagger can use 'Authorize' with pasted token)."""
    if oauth_token:
        return oauth_token
    if bearer:
        return bearer.credentials
    return None


async def get_current_user(
    token: Optional[str] = Depends(_get_token),
    db: Session = Depends(get_db),
):
    """
    Get current logged-in user from token. Bills are saved with this user's id.
    Send header: Authorization: Bearer <access_token> (from POST /api/auth/login).
    """
    hint = (
        "Authentication required so bills are saved under your account. "
        "1) Login: POST /api/auth/login with body: username=your@email.com&password=yourpassword "
        "2) Use the returned 'access_token' in header: Authorization: Bearer <access_token>"
    )
    credentials_exception = _credentials_exception(hint)
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_user_or_upload_fallback(
    token: Optional[str] = Depends(_get_token),
    db: Session = Depends(get_db),
) -> User:
    """
    For upload endpoints: use current user if token present; else if ALLOW_UPLOAD_WITHOUT_AUTH
    is set (dev), use first user in DB so upload works without login. Otherwise 401.
    """
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            email = payload.get("sub")
            if email:
                user = db.query(User).filter(User.email == email).first()
                if user:
                    return user
        except JWTError:
            pass
    # No valid token: allow fallback only if dev setting is on
    allow_no_auth = (getattr(settings, "ALLOW_UPLOAD_WITHOUT_AUTH", None) or "").lower() == "true"
    if allow_no_auth:
        first_user = db.query(User).order_by(User.id).first()
        if first_user:
            return first_user
    hint = (
        "Authentication required. Login: POST /api/auth/login/json with JSON "
        '{"email": "your@email.com", "password": "xxx"}, then send the access_token in '
        "header: Authorization: Bearer <access_token>"
    )
    raise _credentials_exception(hint)