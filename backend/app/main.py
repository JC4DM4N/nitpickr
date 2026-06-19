import html as _html
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session

from .database import engine, SessionLocal, get_db
from . import models
from .routers import users, auth, apps, reviews, notifications, exchanges, testimonials, payments
from .routers.notifications import create_notification
from . import loops
from . import llm_judge

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

            # Ask the LLM whether the owner implicitly approved the review before
            # falling back to the standard expiry path.
            verdict = None
            if app:
                owner_msg_count = (
                    db.query(models.Message)
                    .filter(
                        models.Message.review_id == review.id,
                        models.Message.sender_id == app.owner_id,
                    )
                    .count()
                )
                if owner_msg_count > 0:
                    all_messages = (
                        db.query(models.Message)
                        .filter(models.Message.review_id == review.id)
                        .order_by(models.Message.created_at)
                        .all()
                    )
                    formatted = [
                        {
                            "role": "owner" if m.sender_id == app.owner_id else "reviewer",
                            "body": m.body,
                        }
                        for m in all_messages
                    ]
                    verdict = llm_judge.judge_conversation(
                        feedback=review.feedback or "",
                        messages=formatted,
                        app_name=app.name,
                    )

            if verdict == "approve":
                owner = db.query(models.User).filter(models.User.id == app.owner_id).first()
                if owner and reviewer:
                    owner.escrow_credits -= app.credits
                    reviewer.credits += app.credits
                review.is_complete = True
                review.reviewer_deadline = None
                review.owner_message = "Review was auto-approved by agent as it was judged to be complete. "
                if reviewer:
                    create_notification(
                        db, reviewer.id, "review_approved",
                        f"Your review of {app.name} was auto-approved — credit earned.",
                        app_id=app.id, review_id=review.id,
                        action_url=f"{loops.FRONTEND_URL}/reviews/{review.id}",
                    )
                if owner:
                    create_notification(
                        db, owner.id, "review_approved",
                        f"Your review of {app.name} was auto-approved.",
                        app_id=app.id, review_id=review.id,
                        action_url=f"{loops.FRONTEND_URL}/my-apps/{app.id}/reviews/{review.id}",
                    )
                continue

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
                        f"Your review of {app.name} was auto-approved after 24 hours — credit earned.",
                        app_id=app.id, review_id=review.id,
                        action_url=f"{loops.FRONTEND_URL}/reviews/{review.id}",
                    )
                    create_notification(
                        db, owner.id, "owner_deadline_expired",
                        f"Your 24 hour window to approve the review of {app.name} passed — it was auto-approved.",
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

        # ── Auto-approve exchange reviews (owner missed deadline) ─────────────
        expired_owner_exchange = (
            db.query(models.Review)
            .filter(
                models.Review.is_exchange == True,
                models.Review.is_expired == False,
                models.Review.is_complete == False,
                models.Review.is_rejected == False,
                models.Review.is_submitted == True,
                models.Review.owner_deadline.isnot(None),
                models.Review.owner_deadline < now,
            )
            .all()
        )
        for review in expired_owner_exchange:
            app = db.query(models.App).filter(models.App.id == review.app_id).first()
            owner = db.query(models.User).filter(models.User.id == app.owner_id).first() if app else None
            reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
            if reviewer:
                create_notification(
                    db, reviewer.id, "owner_deadline_expired",
                    f"Your exchange review of {app.name if app else 'an app'} was auto-approved.",
                    app_id=app.id if app else None, review_id=review.id,
                    action_url=f"{loops.FRONTEND_URL}/reviews/{review.id}",
                )
            if owner:
                create_notification(
                    db, owner.id, "owner_deadline_expired",
                    f"Your 24 hour window to approve the exchange review of {app.name if app else 'your app'} passed — it was auto-approved.",
                    app_id=app.id if app else None, review_id=review.id,
                    action_url=f"{loops.FRONTEND_URL}/my-apps/{app.id}/reviews/{review.id}" if app else f"{loops.FRONTEND_URL}/exchanges",
                )
            review.is_complete = True
            review.owner_deadline = None

        db.commit()
    finally:
        db.close()


def _expire_streaks():
    """Runs every minute. Marks streaks whose deadline has passed as expired."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        expired = (
            db.query(models.Streak)
            .filter(
                models.Streak.is_complete == False,
                models.Streak.is_expired == False,
                models.Streak.streak_deadline < now,
            )
            .all()
        )
        for streak in expired:
            streak.is_expired = True
        db.commit()
    finally:
        db.close()


scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(_expire_reviews,   "interval", minutes=1, id="expire_reviews")
    scheduler.add_job(_expire_exchanges, "interval", minutes=1, id="expire_exchanges")
    scheduler.add_job(_expire_streaks,   "interval", minutes=1, id="expire_streaks")
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
app.include_router(testimonials.router)
app.include_router(payments.router)


@app.get("/health")
def health():
    return {"status": "ok"}


_SITEMAP_STATIC = [
    ("/", "weekly", "1.0"),
    ("/how-it-works", "monthly", "0.7"),
    ("/signup", "monthly", "0.6"),
    ("/login", "monthly", "0.4"),
]


@app.get("/sitemap.xml", response_class=Response)
def sitemap(db: Session = Depends(get_db)):
    base = loops.FRONTEND_URL
    public_apps = (
        db.query(models.App)
        .join(models.User, models.App.owner_id == models.User.id)
        .filter(models.App.is_hidden == False, models.User.is_banned == False)
        .all()
    )
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entries = []
    for path, changefreq, priority in _SITEMAP_STATIC:
        entries.append(
            f"  <url>\n"
            f"    <loc>{base}{path}</loc>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            f"  </url>"
        )
    for a in public_apps:
        path = f"/discover/{a.slug}" if a.slug else f"/discover/{a.id}"
        entries.append(
            f"  <url>\n"
            f"    <loc>{base}{path}</loc>\n"
            f"    <lastmod>{today}</lastmod>\n"
            f"    <changefreq>weekly</changefreq>\n"
            f"    <priority>0.8</priority>\n"
            f"  </url>"
        )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>"
    )
    return Response(content=xml, media_type="application/xml")


_STAGE_STYLES = {
    'Pre-launch': 'background:#fef3c7;color:#92400e',
    'Beta':       'background:#dbeafe;color:#1e40af',
    'Live':       'background:#d1fae5;color:#065f46',
}

_e = _html.escape


@app.get("/discover/{slug}", response_class=Response)
def discover_app_page(slug: str, db: Session = Depends(get_db)):
    from .routers.apps import _build_app_outs
    app_obj = (
        db.query(models.App)
        .join(models.User, models.App.owner_id == models.User.id)
        .filter(
            models.App.slug == slug,
            models.App.is_hidden == False,
            models.User.is_banned == False,
        )
        .first()
    )
    if not app_obj:
        return Response(content=_discover_404_html(), media_type="text/html", status_code=404)
    app_data = _build_app_outs([app_obj], db)[0]
    return Response(content=_discover_page_html(app_data), media_type="text/html")


def _discover_404_html() -> str:
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>App not found — NitPickr</title>
{_discover_shared_styles()}
</head><body>
{_discover_header()}
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:80px 24px;color:#6b7280;font-family:system-ui">
  <h1 style="color:#0f0e0b;margin:0">App not found</h1>
  <p style="margin:0">This app may have been removed or made private.</p>
  <a href="/" style="font-family:ui-monospace,Consolas,monospace;font-size:13px;font-weight:600;color:#fff;background:#0f0e0b;padding:10px 20px;border-radius:8px">Back to NitPickr</a>
</div>
{_discover_footer()}
</body></html>"""


def _discover_page_html(app) -> str:
    app_url = app.url if app.url.startswith('http') else f'https://{app.url}'
    stage_css = _STAGE_STYLES.get(app.stage, 'background:#f3f4f6;color:#374151')
    page_title = _e(f"{app.name} — developer feedback on NitPickr")
    page_desc  = _e(f"{app.description} Get real feedback from indie developers on NitPickr — a free, credit-based feedback community.")
    page_url   = f"https://nitpickr.dev/discover/{_e(app.slug or str(app.id))}"
    json_ld    = json.dumps({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": app.name,
        "url": app_url,
        "applicationCategory": app.category,
        "description": app.description,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
    })

    rating_hero = ""
    rating_stat = f'<span class="stat-value">—</span>'
    if app.owner_reviewer_rating is not None:
        r = _e(str(app.owner_reviewer_rating))
        rating_hero = f'<span class="rating-badge">{r} <img src="/star.png" width="16" height="16" alt="star"> reviewer rating</span>'
        rating_stat = f'<span class="stat-value stat-value--row">{r} <img src="/star.png" width="16" height="16" alt="star"> / 5</span>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{page_title}</title>
  <meta name="description" content="{page_desc}">
  <meta property="og:title" content="{page_title}">
  <meta property="og:description" content="{page_desc}">
  <meta property="og:url" content="{page_url}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="{page_title}">
  <meta name="twitter:description" content="{page_desc}">
  <link rel="canonical" href="{page_url}">
  <link rel="icon" href="/favicon.ico">
  <script type="application/ld+json">{json_ld}</script>
  {_discover_shared_styles()}
</head>
<body>
  {_discover_header()}

  <div class="hero">
    <div class="hero-inner">
      <div class="app-icon" style="background:{_e(app.color)}">{_e(app.initials)}</div>
      <h1 class="hero-name">{_e(app.name)}</h1>
      <a class="hero-url" href="{_e(app_url)}" target="_blank" rel="noopener noreferrer">{_e(app.url)} ↗</a>
      <div class="meta-row">
        <span class="owner-text">by <a href="/{_e(app.owner_username)}" class="owner-link">{_e(app.owner_username)}</a></span>
      </div>
      <div class="meta-row">
        <span class="category-tag">{_e(app.category)}</span>
        <span class="stage-badge" style="{stage_css}">{_e(app.stage)}</span>
        {rating_hero}
      </div>
    </div>
  </div>

  <div class="body">
    <div class="results">
      <div class="card">
        <div class="stat-row">
          <div class="stat">
            <span class="stat-label">STAGE</span>
            <span class="stage-badge" style="{stage_css}">{_e(app.stage)}</span>
          </div>
          <div class="stat">
            <span class="stat-label">REVIEWS RECEIVED</span>
            <span class="stat-value">{_e(str(app.approved_count))}</span>
          </div>
          <div class="stat">
            <span class="stat-label">CREDITS PER REVIEW</span>
            <span class="stat-value">{_e(str(app.credits))}</span>
          </div>
          <div class="stat">
            <span class="stat-label">REVIEWER RATING</span>
            {rating_stat}
          </div>
        </div>

        <p class="section-label">ABOUT THIS APP</p>
        <p class="description">{_e(app.description)}</p>

        <p class="section-label">WHAT THE DEVELOPER IS LOOKING FOR</p>
        <div class="request">{_e(app.request)}</div>

        <div class="card-actions">
          <a href="{_e(app_url)}" target="_blank" rel="noopener noreferrer" class="btn-secondary">Visit {_e(app.name)} ↗</a>
          <a href="/signup" class="btn-primary">Sign up to leave feedback →</a>
        </div>
      </div>

      <div class="how-section">
        <p class="section-label">HOW NITPICKR WORKS</p>
        <ol class="how-steps">
          <li><strong>Review apps</strong> — Try other developers' apps and leave honest, actionable feedback.</li>
          <li><strong>Earn credits</strong> — Each approved review earns you one credit.</li>
          <li><strong>Get feedback</strong> — Spend credits to receive feedback on your own app.</li>
        </ol>
        <p class="how-note">No subscriptions. No credit card. Just developers helping developers.</p>
      </div>
    </div>
  </div>

  {_discover_footer()}
</body>
</html>"""


def _discover_header() -> str:
    return """<header class="header">
  <a href="/" class="header-logo"><img src="/nitpickr_logo.svg" alt="NitPickr" height="22"></a>
  <div class="header-actions">
    <a href="/login" class="btn-ghost">Sign in</a>
    <a href="/" class="btn-primary">Explore apps →</a>
  </div>
</header>"""


def _discover_footer() -> str:
    return """<footer>
  <a href="/">NitPickr</a><span>·</span>
  <a href="/signup">Get free feedback</a><span>·</span>
  <a href="/how-it-works">How it works</a><span>·</span>
  <a href="/explore">Explore apps</a>
</footer>"""


def _discover_shared_styles() -> str:
    return """<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --mono: ui-monospace, Consolas, monospace; --sans: system-ui, 'Segoe UI', Roboto, sans-serif; --border: #e8e6e0; }
  body { font-family: var(--sans); color: #0f0e0b; background: #fafaf8; -webkit-font-smoothing: antialiased; min-height: 100vh; display: flex; flex-direction: column; }
  a { text-decoration: none; }

  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; background: #fff; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10; }
  .header-logo { display: flex; align-items: center; }
  .header-actions { display: flex; gap: 10px; align-items: center; }
  .btn-ghost { font-family: var(--mono); font-size: 13px; font-weight: 500; color: #6b7280; padding: 8px 12px; border-radius: 8px; }
  .btn-ghost:hover { color: #0f0e0b; }
  .btn-primary { font-family: var(--mono); font-size: 13px; font-weight: 600; color: #fff; background: #0f0e0b; padding: 9px 18px; border-radius: 8px; white-space: nowrap; }
  .btn-primary:hover { opacity: 0.8; }
  .btn-secondary { font-family: var(--mono); font-size: 13px; font-weight: 500; color: #6b7280; background: transparent; padding: 9px 16px; border-radius: 8px; border: 1.5px solid var(--border); white-space: nowrap; }
  .btn-secondary:hover { background: #f6f5f1; }

  /* Hero */
  .hero { background: #fff; border-bottom: 1px solid var(--border); padding: 48px 24px 36px; text-align: center; }
  .hero-inner { display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .app-icon { width: 72px; height: 72px; border-radius: 16px; color: #fff; font-size: 26px; font-weight: 800; display: flex; align-items: center; justify-content: center; font-family: var(--mono); flex-shrink: 0; }
  .hero-name { font-size: clamp(28px, 5vw, 44px); font-weight: 800; letter-spacing: -1.5px; color: #0f0e0b; line-height: 1.1; }
  .hero-url { font-family: var(--mono); font-size: 13px; color: #9ca3af; }
  .hero-url:hover { color: #4b5563; }
  .meta-row { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px; }
  .owner-text { font-size: 13px; color: #6b7280; font-family: var(--mono); }
  .owner-link { color: #6b7280; font-weight: 600; }
  .owner-link:hover { color: #0f0e0b; }
  .category-tag { background: #f6f5f1; color: #6b7280; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--border); font-family: var(--mono); }
  .stage-badge { font-size: 12px; font-weight: 600; padding: 3px 8px; border-radius: 6px; font-family: var(--mono); }
  .rating-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px solid var(--border); border-radius: 20px; font-size: 12px; font-weight: 600; color: #0f0e0b; font-family: var(--mono); }

  /* Body */
  .body { display: flex; justify-content: center; padding: 28px 16px 64px; }
  .results { width: 100%; max-width: 720px; display: flex; flex-direction: column; gap: 32px; }

  /* Card */
  .card { background: #fff; border-radius: 16px; border: 1.5px solid var(--border); padding: 28px; display: flex; flex-direction: column; gap: 18px; }
  .stat-row { display: flex; gap: 24px; flex-wrap: wrap; padding: 14px 0; border-top: 1px solid #f0ede6; border-bottom: 1px solid #f0ede6; }
  .stat { display: flex; flex-direction: column; gap: 4px; }
  .stat-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #9ca3af; font-family: var(--mono); }
  .stat-value { font-size: 17px; font-weight: 700; color: #0f0e0b; font-family: var(--mono); letter-spacing: -0.5px; }
  .stat-value--row { display: inline-flex; align-items: center; gap: 5px; }
  .section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #9ca3af; font-family: var(--mono); }
  .description { font-size: 14px; line-height: 1.7; color: #374151; }
  .request { background: #fafaf8; border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; font-size: 14px; line-height: 1.7; color: #374151; }
  .card-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }

  /* How it works */
  .how-section { display: flex; flex-direction: column; gap: 12px; }
  .how-steps { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }
  .how-steps li { font-size: 14px; line-height: 1.6; color: #374151; }
  .how-note { font-size: 13px; color: #9ca3af; font-family: var(--mono); }

  /* Footer */
  footer { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px 24px; border-top: 1px solid var(--border); background: #fff; font-size: 13px; font-family: var(--mono); color: #9ca3af; flex-wrap: wrap; margin-top: auto; }
  footer a { color: #6b7280; }
  footer a:hover { color: #0f0e0b; }

  @media (max-width: 640px) {
    .header { padding: 12px 16px; }
    .hero { padding: 32px 16px 24px; }
    .card { padding: 20px 16px; border-radius: 0; border-left: none; border-right: none; }
  }
</style>"""
