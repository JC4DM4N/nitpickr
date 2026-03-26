from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewCreate(BaseModel):
    app_id: int


@router.post("/", response_model=schemas.ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not db.query(models.App).filter(models.App.id == payload.app_id).first():
        raise HTTPException(status_code=404, detail="App not found")

    if db.query(models.Review).filter(
        models.Review.app_id == payload.app_id,
        models.Review.reviewer_id == current_user.id,
    ).first():
        raise HTTPException(status_code=400, detail="You have already reviewed this app")

    review = models.Review(app_id=payload.app_id, reviewer_id=current_user.id)
    db.add(review)
    db.commit()
    db.refresh(review)

    app = db.query(models.App).filter(models.App.id == payload.app_id).first()
    return _to_out(review, app)


@router.get("/me", response_model=List[schemas.ReviewOut])
def get_my_reviews(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.Review, models.App)
        .join(models.App, models.Review.app_id == models.App.id)
        .filter(models.Review.reviewer_id == current_user.id)
        .order_by(models.Review.created_date.desc())
        .all()
    )
    return [_to_out(review, app) for review, app in rows]


def _to_out(review: models.Review, app: models.App) -> schemas.ReviewOut:
    return schemas.ReviewOut(
        id=review.id,
        app_id=review.app_id,
        reviewer_id=review.reviewer_id,
        is_complete=review.is_complete,
        created_date=review.created_date,
        app_name=app.name,
        app_initials=app.initials,
        app_color=app.color,
        app_stage=app.stage,
        app_url=app.url,
    )
