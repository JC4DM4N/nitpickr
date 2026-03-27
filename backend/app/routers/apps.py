from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/apps", tags=["apps"])


@router.get("/mine", response_model=List[schemas.AppOut])
def list_my_apps(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.App).filter(models.App.owner_id == current_user.id).order_by(models.App.id).all()


@router.get("/", response_model=List[schemas.AppOut])
def list_apps(db: Session = Depends(get_db)):
    return db.query(models.App).order_by(models.App.id).all()


@router.get("/{app_id}/reviews", response_model=List[schemas.AppReviewFeedItem])
def get_app_reviews(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    rows = (
        db.query(models.Review, models.User)
        .join(models.User, models.Review.reviewer_id == models.User.id)
        .filter(models.Review.app_id == app_id)
        .order_by(models.Review.created_date.desc())
        .all()
    )
    return [
        schemas.AppReviewFeedItem(
            id=review.id,
            reviewer_username=user.username,
            feedback=review.feedback,
            is_complete=review.is_complete,
            created_date=review.created_date,
        )
        for review, user in rows
    ]


@router.get("/{app_id}", response_model=schemas.AppOut)
def get_app(app_id: int, db: Session = Depends(get_db)):
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    return app
