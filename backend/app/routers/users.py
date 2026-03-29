from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import bcrypt as bcryptlib

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/credits", response_model=schemas.UserCredits)
def get_my_credits(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    in_escrow = current_user.escrow_credits

    # ── Earned ever: sum of app.credits for completed reviews I submitted ───
    earned_rows = (
        db.query(models.App.credits)
        .join(models.Review, models.Review.app_id == models.App.id)
        .filter(
            models.Review.reviewer_id == current_user.id,
            models.Review.is_complete == True,
        )
        .all()
    )
    earned_ever = sum(r[0] for r in earned_rows)

    # ── Spent ever: sum of app.credits for completed reviews on my apps ─────
    spent_rows = (
        db.query(models.App.credits)
        .join(models.Review, models.Review.app_id == models.App.id)
        .filter(
            models.App.owner_id == current_user.id,
            models.Review.is_complete == True,
        )
        .all()
    )
    spent_ever = sum(r[0] for r in spent_rows)

    return schemas.UserCredits(
        available=current_user.credits,
        in_escrow=in_escrow,
        total=current_user.credits + in_escrow,
        earned_ever=earned_ever,
        spent_ever=spent_ever,
    )


@router.post("/", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcryptlib.hashpw(user.password.encode(), bcryptlib.gensalt()).decode()
    db_user = models.User(email=user.email, password=hashed, username=user.username)
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
