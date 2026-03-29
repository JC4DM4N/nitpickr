import os
from datetime import datetime, timedelta, timezone

import bcrypt as bcryptlib
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-before-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


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
