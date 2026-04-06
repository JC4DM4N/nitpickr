import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt as bcryptlib
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, loops
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-before-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

LOOPS_PASSWORD_RESET_ID = "cmnls89p70wug0ix02cwxhqhr"


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    identifier: str  # username or email
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    hashed = bcryptlib.hashpw(payload.password.encode(), bcryptlib.gensalt()).decode()
    user = models.User(email=payload.email, username=payload.username, password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)

    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    token = jwt.encode({"sub": str(user.id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        email=user.email,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(
            (models.User.email == payload.identifier) |
            (models.User.username == payload.identifier)
        )
        .first()
    )
    if not user or not bcryptlib.checkpw(payload.password.encode(), user.password.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    token = jwt.encode({"sub": str(user.id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        email=user.email,
    )


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user:
        # Remove any existing tokens for this user
        db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.user_id == user.id
        ).delete()

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db.add(models.PasswordResetToken(token=token, user_id=user.id, expires_at=expires_at))
        db.commit()

        loops.send_transactional(
            email=user.email,
            transactional_id=LOOPS_PASSWORD_RESET_ID,
            data_variables={"resetToken": token, "username": user.username},
        )


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    print(f"[reset-password] received token: {payload.token!r}")
    all_tokens = db.query(models.PasswordResetToken).all()
    for t in all_tokens:
        print(f"[reset-password] stored token: {t.token!r}, expires: {t.expires_at}, now: {now}")
    reset_token = (
        db.query(models.PasswordResetToken)
        .filter(
            models.PasswordResetToken.token == payload.token,
            models.PasswordResetToken.expires_at > now,
        )
        .first()
    )
    if not reset_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired link")

    user = db.query(models.User).filter(models.User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired link")

    user.password = bcryptlib.hashpw(payload.new_password.encode(), bcryptlib.gensalt()).decode()
    db.delete(reset_token)
    db.commit()
