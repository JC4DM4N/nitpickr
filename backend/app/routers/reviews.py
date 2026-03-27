import os
import uuid
from pathlib import Path
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/reviews", tags=["reviews"])

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")


class ReviewCreate(BaseModel):
    app_id: int


# ── Create review ─────────────────────────────────────────────────────────────

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


# ── List my reviews ───────────────────────────────────────────────────────────

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


# ── Get single review ─────────────────────────────────────────────────────────

@router.get("/{review_id}", response_model=schemas.ReviewDetail)
def get_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.Review, models.App)
        .join(models.App, models.Review.app_id == models.App.id)
        .filter(models.Review.id == review_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Review not found")
    review, app = row
    if review.reviewer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    screenshots = [
        s.filename for s in
        db.query(models.ReviewScreenshot)
        .filter(models.ReviewScreenshot.review_id == review_id)
        .order_by(models.ReviewScreenshot.created_at)
        .all()
    ]
    return _to_detail(review, app, screenshots)


# ── Update review ─────────────────────────────────────────────────────────────

@router.patch("/{review_id}", response_model=schemas.ReviewDetail)
def update_review(
    review_id: int,
    payload: schemas.ReviewPatch,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.Review, models.App)
        .join(models.App, models.Review.app_id == models.App.id)
        .filter(models.Review.id == review_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Review not found")
    review, app = row
    if review.reviewer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if payload.feedback is not None:
        review.feedback = payload.feedback
    if payload.is_complete is not None:
        if payload.is_complete and not review.is_complete:
            app.feedbacks += 1
        review.is_complete = payload.is_complete

    db.commit()
    db.refresh(review)

    screenshots = [
        s.filename for s in
        db.query(models.ReviewScreenshot)
        .filter(models.ReviewScreenshot.review_id == review_id)
        .order_by(models.ReviewScreenshot.created_at)
        .all()
    ]
    return _to_detail(review, app, screenshots)


# ── Delete review ─────────────────────────────────────────────────────────────

@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.reviewer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    db.delete(review)
    db.commit()


# ── Upload screenshot ─────────────────────────────────────────────────────────

@router.post("/{review_id}/screenshots", status_code=status.HTTP_201_CREATED)
def upload_screenshot(
    review_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.reviewer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    suffix = Path(file.filename).suffix.lower() if file.filename else ".png"
    filename = f"{uuid.uuid4().hex}{suffix}"
    dest = os.path.join(UPLOADS_DIR, filename)

    os.makedirs(UPLOADS_DIR, exist_ok=True)
    with open(dest, "wb") as f:
        f.write(file.file.read())

    screenshot = models.ReviewScreenshot(review_id=review_id, filename=filename)
    db.add(screenshot)
    db.commit()

    return {"filename": filename}


# ── Helpers ───────────────────────────────────────────────────────────────────

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


def _to_detail(review: models.Review, app: models.App, screenshots: list) -> schemas.ReviewDetail:
    return schemas.ReviewDetail(
        id=review.id,
        app_id=review.app_id,
        is_complete=review.is_complete,
        created_date=review.created_date,
        app_name=app.name,
        app_initials=app.initials,
        app_color=app.color,
        app_stage=app.stage,
        app_url=app.url,
        app_description=app.description,
        app_request=app.request,
        feedback=review.feedback,
        screenshots=screenshots,
    )
