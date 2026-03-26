from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from passlib.context import CryptContext

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/users", tags=["users"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = models.User(email=user.email, password=pwd_context.hash(user.password), username=user.username)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
