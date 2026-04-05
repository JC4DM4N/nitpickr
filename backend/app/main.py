from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, SessionLocal
from . import models
from .routers import users, auth, apps, reviews, notifications
from .routers.notifications import create_notification

models.Base.metadata.create_all(bind=engine)


def _expire_reviews():
    """
    Runs every 5 minutes.
    1. Reviewer deadline expired (not submitted) → delete review, return escrow credits, notify owner.
    2. Owner deadline expired (submitted, not actioned) → auto-approve, transfer credits, notify reviewer.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # ── Expired reviewer deadlines ────────────────────────────────────────
        expired_reviewer = (
            db.query(models.Review)
            .filter(
                models.Review.reviewer_deadline.isnot(None),
                models.Review.reviewer_deadline < now,
                models.Review.is_submitted == False,
                models.Review.is_complete == False,
                models.Review.is_rejected == False,
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
                        db, owner.id, "reviewer_deadline_expired",
                        f"A reviewer did not submit their review of {app.name} in time — your credit has been returned.",
                        app_id=app.id,
                    )
                if reviewer:
                    create_notification(
                        db, reviewer.id, "reviewer_deadline_expired",
                        f"Your review of {app.name} was removed because the 24-hour deadline passed without submission.",
                        app_id=app.id,
                    )
            db.delete(review)

        # ── Expired owner deadlines (auto-approve) ────────────────────────────
        expired_owner = (
            db.query(models.Review)
            .filter(
                models.Review.owner_deadline.isnot(None),
                models.Review.owner_deadline < now,
                models.Review.is_submitted == True,
                models.Review.is_complete == False,
                models.Review.is_rejected == False,
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
                        f"Your review of {app.name} was auto-approved after 7 days — credit earned.",
                        app_id=app.id, review_id=review.id,
                    )
                    create_notification(
                        db, owner.id, "owner_deadline_expired",
                        f"Your 7-day window to approve the review of {app.name} passed — it was auto-approved.",
                        app_id=app.id, review_id=review.id,
                    )
            review.is_complete = True
            review.owner_deadline = None

        db.commit()
    finally:
        db.close()


scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(_expire_reviews, "interval", minutes=5, id="expire_reviews")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Nitpickr API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(apps.router)
app.include_router(reviews.router)
app.include_router(notifications.router)


@app.get("/health")
def health():
    return {"status": "ok"}
