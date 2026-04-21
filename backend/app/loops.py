import os
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

LOOPS_API_KEY = os.getenv("LOOPS_API_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ENV = os.getenv("ENV", "development")

_API_URL = "https://app.loops.so/api/v1/transactional"

# ── Transactional email IDs ───────────────────────────────────────────────────

ID_WELCOME                   = "cmnnbweuk00tc0i0jmr103qwy"
ID_RESET_PASSWORD            = "cmnnb2h4r1gyf0iwaw2phd9ah"
ID_REVIEW_STARTED            = "cmnnbsd7002650i1la2wk0yfs"
ID_REVIEW_SUBMITTED          = "cmnnbu8dy00pr0i0eiiuux6s3"
ID_REVIEW_RESUBMITTED        = "cmnnbr6ci00en0i1w6g2241jz"
ID_REVIEW_APPROVED           = "cmnnbog9s008b0i2k59768r87"
ID_REVIEW_REJECTED           = "cmnnbpy1t00c70iwn4fgrikq7"
ID_CHANGES_REQUESTED         = "cmnnaqi9d4dba0iybg9bgsxhw"
ID_REVIEWER_DEADLINE_EXPIRED = "cmnnbvi8500mp0i29goyg3nl9"
ID_OWNER_DEADLINE_EXPIRED    = "cmnnbn8aj005l0i11200uv1tg"
ID_REVIEW_MESSAGE            = "cmo914e5i001y0iwsf05oymy6"

_NOTIFICATION_TYPE_TO_ID = {
    "review_started":               ID_REVIEW_STARTED,
    "review_submitted":             ID_REVIEW_SUBMITTED,
    "review_resubmitted":           ID_REVIEW_RESUBMITTED,
    "review_approved":              ID_REVIEW_APPROVED,
    "review_rejected":              ID_REVIEW_REJECTED,
    "changes_requested":            ID_CHANGES_REQUESTED,
    "reviewer_deadline_expired":    ID_REVIEWER_DEADLINE_EXPIRED,
    "reviewer_deadline_expired_owner": ID_REVIEWER_DEADLINE_EXPIRED,
    "owner_deadline_expired":       ID_OWNER_DEADLINE_EXPIRED,
    "review_message":               ID_REVIEW_MESSAGE,
    "review_message_owner":         ID_REVIEW_MESSAGE,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def send_transactional(email: str, transactional_id: str, data_variables: dict) -> None:
    """Send a transactional email via Loops. No-ops in development or if LOOPS_API_KEY is not set."""
    if ENV != "production":
        print(f"[loops] ENV={ENV} — skipping email to {email}")
        return
    if not LOOPS_API_KEY:
        print("[loops] LOOPS_API_KEY is not set — skipping email")
        return
    response = httpx.post(
        _API_URL,
        headers={"Authorization": f"Bearer {LOOPS_API_KEY}"},
        json={
            "transactionalId": transactional_id,
            "email": email,
            "dataVariables": data_variables,
        },
        timeout=10,
    )
    print(f"[loops] {response.status_code} {response.text}")


def send_notification_email(
    email: str,
    username: str,
    notification_type: str,
    message: str,
    action_url: str,
) -> None:
    """Send the appropriate notification email for a given notification type."""
    transactional_id = _NOTIFICATION_TYPE_TO_ID.get(notification_type)
    if not transactional_id:
        return
    send_transactional(email, transactional_id, {
        "username": username,
        "message": message,
        "actionUrl": action_url,
    })
