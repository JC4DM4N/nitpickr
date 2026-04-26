from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, SessionLocal
from . import models
from .routers import users, auth, apps, reviews, notifications, exchanges
from .routers.notifications import create_notification
from . import loops

models.Base.metadata.create_all(bind=engine)


def _expire_reviews():
    """
    Runs every minute.
    1. Reviewer deadline expired (not submitted) → mark expired, return escrow credits.
    2. Reviewer deadline expired (submitted, in conversation) → mark expired, return escrow credits.
    3. Owner deadline expired (submitted, not actioned) → auto-approve, transfer credits.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # ── Expired reviewer deadlines (not yet submitted) ────────────────────
        expired_reviewer = (
            db.query(models.Review)
            .filter(
                models.Review.reviewer_deadline.isnot(None),
                models.Review.reviewer_deadline < now,
                models.Review.is_submitted == False,
                models.Review.is_complete == False,
                models.Review.is_rejected == False,
                models.Review.is_expired == False,
                models.Review.is_exchange == False,
            )
            .all()
        )
        for review in expired_reviewer:
            app = db.query(models.App).filter(models.App.id == review.app_id).first()
            reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
            if app:
                owner = db.query(models.User).filter(models.User.id == app.owner_id).first()
                if owner:
                    owner.escrow_credits -= app.credits
                    owner.credits += app.credits
                    create_notification(
                        db, owner.id, "reviewer_deadline_expired_owner",
                        f"A reviewer did not submit their review of {app.name} in time — your credit has been returned.",
                        app_id=app.id,
                        action_url=f"{loops.FRONTEND_URL}/my-apps/{app.id}",
                    )
                if reviewer:
                    create_notification(
                        db, reviewer.id, "reviewer_deadline_expired",
                        f"Your review of {app.name} expired because the deadline passed without submission.",
                        app_id=app.id, review_id=review.id,
                        action_url=f"{loops.FRONTEND_URL}/reviews/{review.id}",
                    )
            review.is_expired = True
            review.reviewer_deadline = None

        # ── Expired reviewer deadlines (submitted, mid-conversation) ──────────
        expired_conversation = (
            db.query(models.Review)
            .filter(
                models.Review.reviewer_deadline.isnot(None),
                models.Review.reviewer_deadline < now,
                models.Review.is_submitted == True,
                models.Review.is_complete == False,
                models.Review.is_rejected == False,
                models.Review.is_expired == False,
                models.Review.is_exchange == False,
            )
            .all()
        )
        for review in expired_conversation:
            app = db.query(models.App).filter(models.App.id == review.app_id).first()
            reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
            if app:
                owner = db.query(models.User).filter(models.User.id == app.owner_id).first()
                if owner:
                    owner.escrow_credits -= app.credits
                    owner.credits += app.credits
                    create_notification(
                        db, owner.id, "reviewer_deadline_expired_owner",
                        f"The reviewer did not reply in time on their review of {app.name} — your credit has been returned.",
                        app_id=app.id, review_id=review.id,
                        action_url=f"{loops.FRONTEND_URL}/my-apps/{app.id}/reviews/{review.id}",
                    )
                if reviewer:
                    create_notification(
                        db, reviewer.id, "reviewer_deadline_expired",
                        f"Your review of {app.name} expired because you did not reply in time.",
                        app_id=app.id, review_id=review.id,
                        action_url=f"{loops.FRONTEND_URL}/reviews/{review.id}",
                    )
            review.is_expired = True
            review.reviewer_deadline = None

        # ── Expired owner deadlines (auto-approve) ────────────────────────────
        expired_owner = (
            db.query(models.Review)
            .filter(
                models.Review.owner_deadline.isnot(None),
                models.Review.owner_deadline < now,
                models.Review.is_submitted == True,
                models.Review.is_complete == False,
                models.Review.is_rejected == False,
                models.Review.is_expired == False,
                models.Review.is_exchange == False,
            )
            .all()
        )
        for review in expired_owner:
            app = db.query(models.App).filter(models.App.id == review.app_id).first()
            if app:
                owner = db.query(models.User).filter(models.User.id == app.owner_id).first()
                reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
                if owner and reviewer:
                    owner.escrow_credits -= app.credits
                    reviewer.credits += app.credits
                    create_notification(
                        db, reviewer.id, "owner_deadline_expired",
                        f"Your review of {app.name} was auto-approved after 48 hours — credit earned.",
                        app_id=app.id, review_id=review.id,
                        action_url=f"{loops.FRONTEND_URL}/reviews/{review.id}",
                    )
                    create_notification(
                        db, owner.id, "owner_deadline_expired",
                        f"Your 48 hour window to approve the review of {app.name} passed — it was auto-approved.",
                        app_id=app.id, review_id=review.id,
                        action_url=f"{loops.FRONTEND_URL}/my-apps/{app.id}/reviews/{review.id}",
                    )
            review.is_complete = True
            review.owner_deadline = None

        db.commit()
    finally:
        db.close()


def _expire_exchanges():
    """
    Runs every minute.
    1. Pending exchanges past expires_at → mark expired, notify both parties.
    2. Accepted exchange reviews past reviewer_deadline → mark expired, compensate the other party.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # ── Expire pending requests ───────────────────────────────────────────
        expired_pending = (
            db.query(models.FeedbackExchange)
            .filter(
                models.FeedbackExchange.status == "pending",
                models.FeedbackExchange.expires_at < now,
            )
            .all()
        )
        for exchange in expired_pending:
            exchange.status = "expired"
            requester = db.query(models.User).filter(models.User.id == exchange.requester_id).first()
            requestee = db.query(models.User).filter(models.User.id == exchange.requestee_id).first()
            if requester:
                create_notification(
                    db, requester.id, "exchange_expired",
                    f"Your feedback exchange request to {requestee.username if requestee else 'the user'} expired without a response.",
                    action_url=f"{loops.FRONTEND_URL}/exchanges",
                )
            if requestee:
                create_notification(
                    db, requestee.id, "exchange_expired",
                    f"A feedback exchange request from {requester.username if requester else 'a user'} expired.",
                    action_url=f"{loops.FRONTEND_URL}/exchanges",
                )

        # ── Expire accepted exchange reviews (reviewer missed deadline) ───────
        expired_exchange_reviews = (
            db.query(models.Review)
            .filter(
                models.Review.is_exchange == True,
                models.Review.is_expired == False,
                models.Review.is_complete == False,
                models.Review.is_rejected == False,
                models.Review.is_submitted == False,
                models.Review.reviewer_deadline.isnot(None),
                models.Review.reviewer_deadline < now,
            )
            .all()
        )
        for review in expired_exchange_reviews:
            review.is_expired = True
            review.is_exchange = False
            review.reviewer_deadline = None

            app = db.query(models.App).filter(models.App.id == review.app_id).first()
            failing_reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()

            # Find the other review in this exchange to identify the other party
            exchange = db.query(models.FeedbackExchange).filter(
                models.FeedbackExchange.id == review.exchange_id
            ).first() if review.exchange_id else None

            if exchange:
                other_review_id = (
                    exchange.review_of_requestee
                    if exchange.review_of_requester == review.id
                    else exchange.review_of_requester
                )
                other_review = db.query(models.Review).filter(models.Review.id == other_review_id).first()
                other_party = db.query(models.User).filter(
                    models.User.id == other_review.reviewer_id
                ).first() if other_review else None

                if other_party:
                    other_party.credits += 1
                    create_notification(
                        db, other_party.id, "exchange_compensated",
                        f"{failing_reviewer.username if failing_reviewer else 'The other user'} did not submit their review in time — you've been awarded 1 credit.",
                        action_url=f"{loops.FRONTEND_URL}/exchanges",
                    )
                if failing_reviewer:
                    # Net zero: deduct only if they have credits
                    if failing_reviewer.credits > 0:
                        failing_reviewer.credits -= 1
                    create_notification(
                        db, failing_reviewer.id, "exchange_expired",
                        f"Your exchange review of {app.name if app else 'an app'} expired — you did not submit in time.",
                        action_url=f"{loops.FRONTEND_URL}/exchanges",
                    )

        db.commit()
    finally:
        db.close()


scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(_expire_reviews,   "interval", minutes=1, id="expire_reviews")
    scheduler.add_job(_expire_exchanges, "interval", minutes=1, id="expire_exchanges")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Nitpickr API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://nitpickr.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(apps.router)
app.include_router(reviews.router)
app.include_router(notifications.router)
app.include_router(exchanges.router)


@app.get("/health")
def health():
    return {"status": "ok"}
