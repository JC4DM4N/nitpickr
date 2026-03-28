from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/apps", tags=["apps"])


def _build_app_outs(apps: list, db: Session) -> list:
    if not apps:
        return []
    app_ids = [a.id for a in apps]

    approved = dict(
        db.query(models.Review.app_id, func.count(models.Review.id))
        .filter(models.Review.app_id.in_(app_ids), models.Review.is_complete == True)
        .group_by(models.Review.app_id)
        .all()
    )
    in_progress = dict(
        db.query(models.Review.app_id, func.count(models.Review.id))
        .filter(
            models.Review.app_id.in_(app_ids),
            models.Review.is_submitted == True,
            models.Review.is_complete == False,
            models.Review.is_rejected == False,
        )
        .group_by(models.Review.app_id)
        .all()
    )

    return [
        schemas.AppOut(
            id=a.id,
            owner_id=a.owner_id,
            name=a.name,
            initials=a.initials,
            color=a.color,
            url=a.url,
            category=a.category,
            stage=a.stage,
            description=a.description,
            request=a.request,
            views=a.views,
            credits=a.credits,
            approved_count=approved.get(a.id, 0),
            in_progress_count=in_progress.get(a.id, 0),
        )
        for a in apps
    ]


@router.get("/mine", response_model=List[schemas.AppOut])
def list_my_apps(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    apps = db.query(models.App).filter(models.App.owner_id == current_user.id).order_by(models.App.id).all()
    return _build_app_outs(apps, db)


@router.get("/", response_model=List[schemas.AppOut])
def list_apps(db: Session = Depends(get_db)):
    apps = db.query(models.App).order_by(models.App.id).all()
    return _build_app_outs(apps, db)


@router.post("/{app_id}/reviews/{review_id}/approve", response_model=schemas.ReviewDetail)
def approve_review(
    app_id: int,
    review_id: int,
    payload: schemas.OwnerActionPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    app, review = _get_owner_review(app_id, review_id, current_user, db)
    review.is_complete = True
    review.owner_message = payload.message
    db.commit()
    db.refresh(review)
    from .reviews import _to_detail
    return _to_detail(review, app, _get_screenshots(review_id, db))


@router.post("/{app_id}/reviews/{review_id}/request-changes", response_model=schemas.ReviewDetail)
def request_changes(
    app_id: int,
    review_id: int,
    payload: schemas.OwnerActionPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    app, review = _get_owner_review(app_id, review_id, current_user, db)
    review.is_submitted = False
    review.owner_message = payload.message
    db.commit()
    db.refresh(review)
    from .reviews import _to_detail
    return _to_detail(review, app, _get_screenshots(review_id, db))


@router.post("/{app_id}/reviews/{review_id}/reject", response_model=schemas.ReviewDetail)
def reject_review(
    app_id: int,
    review_id: int,
    payload: schemas.OwnerActionPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    app, review = _get_owner_review(app_id, review_id, current_user, db)
    review.is_rejected = True
    review.owner_message = payload.message
    db.commit()
    db.refresh(review)
    from .reviews import _to_detail
    return _to_detail(review, app, _get_screenshots(review_id, db))


def _get_owner_review(app_id, review_id, current_user, db):
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    review = db.query(models.Review).filter(
        models.Review.id == review_id,
        models.Review.app_id == app_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return app, review


def _get_screenshots(review_id, db):
    return [
        s.filename for s in
        db.query(models.ReviewScreenshot)
        .filter(models.ReviewScreenshot.review_id == review_id)
        .order_by(models.ReviewScreenshot.created_at)
        .all()
    ]


@router.get("/{app_id}/reviews/{review_id}", response_model=schemas.ReviewDetail)
def get_app_review_detail(
    app_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    review = db.query(models.Review).filter(
        models.Review.id == review_id,
        models.Review.app_id == app_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    screenshots = [
        s.filename for s in
        db.query(models.ReviewScreenshot)
        .filter(models.ReviewScreenshot.review_id == review_id)
        .order_by(models.ReviewScreenshot.created_at)
        .all()
    ]
    from .reviews import _to_detail
    return _to_detail(review, app, screenshots)


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
            is_submitted=review.is_submitted,
            is_complete=review.is_complete,
            is_rejected=review.is_rejected,
            review_requested=review.review_requested,
            created_date=review.created_date,
        )
        for review, user in rows
    ]


@router.get("/{app_id}", response_model=schemas.AppOut)
def get_app(app_id: int, db: Session = Depends(get_db)):
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    return _build_app_outs([app], db)[0]
