from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas, loops
from ..database import get_db
from ..dependencies import get_current_user
from .notifications import create_notification

router = APIRouter(prefix="/exchanges", tags=["exchanges"])

EXCHANGE_REQUEST_DAYS = 7
EXCHANGE_REVIEW_DAYS = 7


def _review_status_fields(review_id: int | None, db: Session, prefix: str) -> dict:
    """Return status fields for a review, prefixed with ror_ or rod_."""
    if not review_id:
        return {f"{prefix}is_submitted": None, f"{prefix}is_complete": None,
                f"{prefix}is_rejected": None, f"{prefix}is_expired": None,
                f"{prefix}review_requested": None}
    r = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not r:
        return {f"{prefix}is_submitted": None, f"{prefix}is_complete": None,
                f"{prefix}is_rejected": None, f"{prefix}is_expired": None,
                f"{prefix}review_requested": None}
    return {f"{prefix}is_submitted": r.is_submitted, f"{prefix}is_complete": r.is_complete,
            f"{prefix}is_rejected": r.is_rejected, f"{prefix}is_expired": r.is_expired,
            f"{prefix}review_requested": r.review_requested}


def _to_out(exchange: models.FeedbackExchange, db: Session) -> schemas.ExchangeOut:
    requester = db.query(models.User).filter(models.User.id == exchange.requester_id).first()
    requestee = db.query(models.User).filter(models.User.id == exchange.requestee_id).first()
    req_app   = db.query(models.App).filter(models.App.id == exchange.requester_app_id).first()
    rec_app   = db.query(models.App).filter(models.App.id == exchange.requestee_app_id).first() if exchange.requestee_app_id else None
    ror = _review_status_fields(exchange.review_of_requester, db, "ror_")
    rod = _review_status_fields(exchange.review_of_requestee, db, "rod_")
    return schemas.ExchangeOut(
        id=exchange.id,
        requester_id=exchange.requester_id,
        requestee_id=exchange.requestee_id,
        requester_username=requester.username if requester else "",
        requestee_username=requestee.username if requestee else "",
        requester_app_id=exchange.requester_app_id,
        requester_app_name=req_app.name if req_app else "",
        requester_app_initials=req_app.initials if req_app else "",
        requester_app_color=req_app.color if req_app else "#000",
        requestee_app_id=exchange.requestee_app_id,
        requestee_app_name=rec_app.name if rec_app else None,
        requestee_app_initials=rec_app.initials if rec_app else None,
        requestee_app_color=rec_app.color if rec_app else None,
        review_of_requester=exchange.review_of_requester,
        review_of_requestee=exchange.review_of_requestee,
        **ror,
        **rod,
        status=exchange.status,
        message=exchange.message,
        created_at=exchange.created_at,
        expires_at=exchange.expires_at,
    )


# ── Create request ─────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.ExchangeOut, status_code=status.HTTP_201_CREATED)
def create_exchange(
    payload: schemas.ExchangeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from sqlalchemy import func
    requestee = db.query(models.User).filter(
        func.lower(models.User.username) == payload.requestee_username.lower()
    ).first()
    if not requestee:
        raise HTTPException(404, "User not found")
    if requestee.id == current_user.id:
        raise HTTPException(400, "You cannot request an exchange with yourself")

    # Requester must own the app
    req_app = db.query(models.App).filter(
        models.App.id == payload.requester_app_id,
        models.App.owner_id == current_user.id,
    ).first()
    if not req_app:
        raise HTTPException(404, "App not found or not yours")

    # Requestee must have at least one app
    requestee_has_apps = db.query(models.App).filter(models.App.owner_id == requestee.id).first()
    if not requestee_has_apps:
        raise HTTPException(400, f"{requestee.username} has no apps for you to review")

    # No duplicate pending/accepted exchange either direction
    existing = db.query(models.FeedbackExchange).filter(
        models.FeedbackExchange.status == "pending",
        (
            (
                (models.FeedbackExchange.requester_id == current_user.id) &
                (models.FeedbackExchange.requestee_id == requestee.id)
            ) |
            (
                (models.FeedbackExchange.requester_id == requestee.id) &
                (models.FeedbackExchange.requestee_id == current_user.id)
            )
        )
    ).first()
    if existing:
        raise HTTPException(400, "An active exchange already exists between you and this user")

    now = datetime.now(timezone.utc)
    exchange = models.FeedbackExchange(
        requester_id=current_user.id,
        requestee_id=requestee.id,
        requester_app_id=payload.requester_app_id,
        status="pending",
        message=payload.message,
        created_at=now,
        expires_at=now + timedelta(days=EXCHANGE_REQUEST_DAYS),
    )
    db.add(exchange)
    db.flush()

    create_notification(
        db, requestee.id, "exchange_requested",
        f"{current_user.username} wants to exchange feedback with you — they'll review {req_app.name}",
        action_url=f"{loops.FRONTEND_URL}/exchanges",
    )

    db.commit()
    db.refresh(exchange)
    return _to_out(exchange, db)


# ── List my exchanges ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.ExchangeOut])
def list_exchanges(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    exchanges = db.query(models.FeedbackExchange).filter(
        (models.FeedbackExchange.requester_id == current_user.id) |
        (models.FeedbackExchange.requestee_id == current_user.id)
    ).order_by(models.FeedbackExchange.created_at.desc()).all()
    return [_to_out(e, db) for e in exchanges]


# ── Check exchange status between current user and another user ────────────────

@router.get("/between/{username}", response_model=schemas.ExchangeOut | None)
def get_exchange_between(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from sqlalchemy import func
    other = db.query(models.User).filter(
        func.lower(models.User.username) == username.lower()
    ).first()
    if not other:
        raise HTTPException(404, "User not found")

    exchange = db.query(models.FeedbackExchange).filter(
        models.FeedbackExchange.status == "pending",
        (
            (
                (models.FeedbackExchange.requester_id == current_user.id) &
                (models.FeedbackExchange.requestee_id == other.id)
            ) |
            (
                (models.FeedbackExchange.requester_id == other.id) &
                (models.FeedbackExchange.requestee_id == current_user.id)
            )
        )
    ).first()
    if not exchange:
        return None
    return _to_out(exchange, db)


# ── Accept ─────────────────────────────────────────────────────────────────────

@router.post("/{exchange_id}/accept", response_model=schemas.ExchangeOut)
def accept_exchange(
    exchange_id: int,
    payload: schemas.ExchangeAccept,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    exchange = db.query(models.FeedbackExchange).filter(
        models.FeedbackExchange.id == exchange_id
    ).first()
    if not exchange:
        raise HTTPException(404, "Exchange not found")
    if exchange.requestee_id != current_user.id:
        raise HTTPException(403, "Forbidden")
    if exchange.status != "pending":
        raise HTTPException(400, f"Exchange is already {exchange.status}")

    # Validate requestee_app belongs to current user
    rec_app = db.query(models.App).filter(
        models.App.id == payload.requestee_app_id,
        models.App.owner_id == current_user.id,
    ).first()
    if not rec_app:
        raise HTTPException(404, "App not found or not yours")

    req_app = db.query(models.App).filter(models.App.id == exchange.requester_app_id).first()
    requester = db.query(models.User).filter(models.User.id == exchange.requester_id).first()

    now = datetime.now(timezone.utc)
    deadline = now + timedelta(days=EXCHANGE_REVIEW_DAYS)

    # Review: requestee (B) reviews requester's (A's) app
    review_of_requester = models.Review(
        app_id=exchange.requester_app_id,
        reviewer_id=current_user.id,
        reviewer_deadline=deadline,
        is_exchange=True,
    )
    db.add(review_of_requester)

    # Review: requester (A) reviews requestee's (B's) app
    review_of_requestee = models.Review(
        app_id=payload.requestee_app_id,
        reviewer_id=exchange.requester_id,
        reviewer_deadline=deadline,
        is_exchange=True,
    )
    db.add(review_of_requestee)
    db.flush()  # get IDs

    exchange.requestee_app_id = payload.requestee_app_id
    exchange.review_of_requester = review_of_requester.id
    exchange.review_of_requestee = review_of_requestee.id
    exchange.status = "accepted"
    # Update exchange expires_at to the review deadline (reuse for review expiry check)
    exchange.expires_at = deadline

    review_of_requester.exchange_id = exchange.id
    review_of_requestee.exchange_id = exchange.id

    create_notification(
        db, exchange.requester_id, "exchange_accepted",
        f"{current_user.username} accepted your feedback exchange — go review {rec_app.name}",
        action_url=f"{loops.FRONTEND_URL}/exchanges",
    )

    db.commit()
    db.refresh(exchange)
    return _to_out(exchange, db)


# ── Reject ─────────────────────────────────────────────────────────────────────

@router.post("/{exchange_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
def reject_exchange(
    exchange_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    exchange = db.query(models.FeedbackExchange).filter(
        models.FeedbackExchange.id == exchange_id
    ).first()
    if not exchange:
        raise HTTPException(404, "Exchange not found")
    if exchange.requestee_id != current_user.id:
        raise HTTPException(403, "Forbidden")
    if exchange.status != "pending":
        raise HTTPException(400, f"Exchange is already {exchange.status}")

    requester = db.query(models.User).filter(models.User.id == exchange.requester_id).first()
    req_app = db.query(models.App).filter(models.App.id == exchange.requester_app_id).first()

    exchange.status = "rejected"

    create_notification(
        db, exchange.requester_id, "exchange_rejected",
        f"{current_user.username} declined your feedback exchange request",
        action_url=f"{loops.FRONTEND_URL}/exchanges",
    )

    db.commit()
