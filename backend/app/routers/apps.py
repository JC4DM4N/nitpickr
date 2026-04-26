from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from .. import models, schemas, loops
from ..database import get_db
from ..dependencies import get_current_user
from .notifications import create_notification

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
            # models.Review.is_submitted == True,
            models.Review.is_complete == False,
            models.Review.is_rejected == False,
        )
        .group_by(models.Review.app_id)
        .all()
    )

    owner_ids = list({a.owner_id for a in apps})
    owner_username = {
        u.id: u.username
        for u in db.query(models.User).filter(models.User.id.in_(owner_ids)).all()
    }
    reviews_given = dict(
        db.query(models.Review.reviewer_id, func.count(models.Review.id))
        .filter(models.Review.reviewer_id.in_(owner_ids), models.Review.is_complete == True)
        .group_by(models.Review.reviewer_id)
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
            credits=a.credits,
            is_hidden=a.is_hidden,
            is_multi_review=a.is_multi_review,
            approved_count=approved.get(a.id, 0),
            in_progress_count=in_progress.get(a.id, 0),
            owner_username=owner_username.get(a.owner_id, ''),
            owner_reviews_given=reviews_given.get(a.owner_id, 0),
        )
        for a in apps
    ]


@router.post("/", response_model=schemas.AppOut)
def create_app(
    payload: schemas.AppCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    initials = ''.join(w[0].upper() for w in payload.name.split()[:2])
    app = models.App(
        owner_id=current_user.id,
        name=payload.name,
        initials=initials,
        color=payload.color,
        url=payload.url,
        category=payload.category,
        stage=payload.stage,
        description=payload.description,
        request=payload.request,
        credits=1,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return _build_app_outs([app], db)[0]


@router.patch("/{app_id}", response_model=schemas.AppOut)
def patch_app(
    app_id: int,
    payload: schemas.AppPatch,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    for field in ('name', 'url', 'category', 'stage', 'description', 'request', 'color', 'is_hidden'):
        value = getattr(payload, field)
        if value is not None:
            setattr(app, field, value)
    if payload.name is not None:
        app.initials = ''.join(w[0].upper() for w in payload.name.split()[:2])
    db.commit()
    db.refresh(app)
    return _build_app_outs([app], db)[0]


@router.get("/mine", response_model=List[schemas.AppOut])
def list_my_apps(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    apps = db.query(models.App).filter(models.App.owner_id == current_user.id).order_by(models.App.id).all()
    return _build_app_outs(apps, db)


@router.get("/", response_model=List[schemas.AppOut])
def list_apps(db: Session = Depends(get_db)):
    # Join latest review date per app, sort nulls first then oldest review first
    latest_review = (
        db.query(
            models.Review.app_id,
            func.max(models.Review.created_date).label("last_reviewed"),
        )
        .group_by(models.Review.app_id)
        .subquery()
    )

    rows = (
        db.query(models.App, latest_review.c.last_reviewed)
        .outerjoin(latest_review, models.App.id == latest_review.c.app_id)
        .order_by(func.coalesce(latest_review.c.last_reviewed, models.App.created_at).asc())
        .all()
    )

    if not rows:
        return []

    all_apps = [r[0] for r in rows]
    owner_ids = list({a.owner_id for a in all_apps})
    owner_available = {
        u.id: u.credits
        for u in db.query(models.User).filter(models.User.id.in_(owner_ids)).all()
    }

    visible_apps = [a for a in all_apps if owner_available.get(a.owner_id, 0) > 0 and not a.is_hidden]
    return _build_app_outs(visible_apps, db)


@router.post("/{app_id}/reviews/{review_id}/approve", response_model=schemas.ReviewDetail)
def approve_review(
    app_id: int,
    review_id: int,
    payload: schemas.OwnerActionPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    app, review = _get_owner_review(app_id, review_id, current_user, db)
    reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
    review.is_complete = True
    review.owner_message = payload.message
    review.owner_deadline = None
    if not review.is_exchange:
        current_user.escrow_credits -= app.credits
        reviewer.credits += app.credits
    create_notification(
        db, reviewer.id, "review_approved",
        f"{current_user.username} approved your review of {app.name}",
        app_id=app.id, review_id=review.id,
        action_url=f"{loops.FRONTEND_URL}/reviews/{review.id}",
    )
    db.commit()
    db.refresh(review)
    from .reviews import _to_detail
    return _to_detail(review, app, _get_screenshots(review_id, db), reviewer.username, current_user.username)


@router.post("/{app_id}/reviews/{review_id}/request-changes", response_model=schemas.ReviewDetail)
def request_changes(
    app_id: int,
    review_id: int,
    payload: schemas.OwnerActionPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    app, review = _get_owner_review(app_id, review_id, current_user, db)
    reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
    review.is_submitted = False
    review.review_requested = True
    review.owner_message = payload.message
    review.owner_deadline = None
    review.reviewer_deadline = datetime.now(timezone.utc) + timedelta(hours=24)
    create_notification(
        db, reviewer.id, "changes_requested",
        f"{current_user.username} requested changes on your review of {app.name}",
        app_id=app.id, review_id=review.id,
        action_url=f"{loops.FRONTEND_URL}/reviews/{review.id}",
    )
    db.commit()
    db.refresh(review)
    from .reviews import _to_detail
    return _to_detail(review, app, _get_screenshots(review_id, db), reviewer.username, current_user.username)


@router.post("/{app_id}/reviews/{review_id}/reject", response_model=schemas.ReviewDetail)
def reject_review(
    app_id: int,
    review_id: int,
    payload: schemas.OwnerActionPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    app, review = _get_owner_review(app_id, review_id, current_user, db)
    reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
    was_exchange = review.is_exchange
    review.is_rejected = True
    review.is_exchange = False
    review.owner_message = payload.message
    review.owner_deadline = None
    if not was_exchange:
        current_user.escrow_credits -= app.credits
        current_user.credits += app.credits
    else:
        # Cancel the exchange and handle the sibling review
        exchange = db.query(models.FeedbackExchange).filter(
            models.FeedbackExchange.id == review.exchange_id
        ).first()
        if exchange:
            exchange.status = "rejected"
            other_review_id = (
                exchange.review_of_requestee if review.id == exchange.review_of_requester
                else exchange.review_of_requester
            )
            if other_review_id:
                other_review = db.query(models.Review).filter(
                    models.Review.id == other_review_id
                ).first()
                if other_review and not other_review.is_expired and not other_review.is_rejected:
                    other_review.is_exchange = False
                    if other_review.is_complete:
                        # Other side already accepted: rejecter earns a credit,
                        # funded by the reviewer whose review was rejected (if they have any)
                        current_user.credits += 1
                        if reviewer.credits > 0:
                            reviewer.credits -= 1
                    else:
                        # Other side still in progress: expire it, no credit exchange
                        other_review.is_expired = True
                        other_review.reviewer_deadline = None
                        other_review.owner_deadline = None
    create_notification(
        db, reviewer.id, "review_rejected",
        f"{current_user.username} rejected your review of {app.name}",
        app_id=app.id, review_id=review.id,
        action_url=f"{loops.FRONTEND_URL}/reviews/{review.id}",
    )
    db.commit()
    db.refresh(review)
    from .reviews import _to_detail
    return _to_detail(review, app, _get_screenshots(review_id, db), reviewer.username, current_user.username)


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

    reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
    screenshots = [
        s.filename for s in
        db.query(models.ReviewScreenshot)
        .filter(models.ReviewScreenshot.review_id == review_id)
        .order_by(models.ReviewScreenshot.created_at)
        .all()
    ]
    from .reviews import _to_detail
    return _to_detail(review, app, screenshots, reviewer.username, current_user.username)


@router.get("/{app_id}/reviews/{review_id}/messages", response_model=List[schemas.MessageOut])
def get_app_review_messages(
    app_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    app, review = _get_owner_review(app_id, review_id, current_user, db)
    from .reviews import _get_messages
    return _get_messages(review_id, db)


@router.post("/{app_id}/reviews/{review_id}/messages", response_model=schemas.MessageOut, status_code=201)
def post_app_review_message(
    app_id: int,
    review_id: int,
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    app, review = _get_owner_review(app_id, review_id, current_user, db)
    if not review.is_submitted or review.is_complete or review.is_rejected:
        raise HTTPException(status_code=400, detail="Cannot message on this review")

    msg = models.Message(review_id=review_id, sender_id=current_user.id, body=payload.body.strip())
    db.add(msg)

    # Owner messaged → only pass the deadline to the reviewer if it was currently the owner's turn
    if review.owner_deadline is not None:
        review.reviewer_deadline = datetime.now(timezone.utc) + timedelta(hours=48)
        # review.reviewer_deadline = datetime.now(timezone.utc) + timedelta(minutes=10)
        review.owner_deadline = None

    reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
    create_notification(
        db, reviewer.id, "review_message",
        f"{current_user.username} sent you a message about your review of {app.name}",
        app_id=app.id, review_id=review.id,
        action_url=f"{loops.FRONTEND_URL}/reviews/{review.id}",
    )

    db.commit()
    db.refresh(msg)
    return schemas.MessageOut(
        id=msg.id,
        review_id=msg.review_id,
        sender_id=msg.sender_id,
        sender_username=current_user.username,
        body=msg.body,
        created_at=msg.created_at,
    )


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
            is_expired=review.is_expired,
            review_requested=review.review_requested,
            created_date=review.created_date,
            reviewer_deadline=review.reviewer_deadline,
            owner_deadline=review.owner_deadline,
        )
        for review, user in rows
    ]


@router.get("/by-owner/{username}", response_model=List[schemas.AppOut])
def list_apps_by_owner(username: str, db: Session = Depends(get_db)):
    from sqlalchemy import func
    user = db.query(models.User).filter(func.lower(models.User.username) == username.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    apps = (
        db.query(models.App)
        .filter(models.App.owner_id == user.id, models.App.is_hidden == False)
        .order_by(models.App.id)
        .all()
    )
    return _build_app_outs(apps, db)


@router.delete("/{app_id}", status_code=204)
def delete_app(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    if app.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(app)
    db.commit()


@router.get("/{app_id}", response_model=schemas.AppOut)
def get_app(app_id: int, db: Session = Depends(get_db)):
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    return _build_app_outs([app], db)[0]
