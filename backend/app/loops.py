import os
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

LOOPS_API_KEY = os.getenv("LOOPS_API_KEY", "")
_API_URL = "https://app.loops.so/api/v1/transactional"


def send_transactional(email: str, transactional_id: str, data_variables: dict) -> None:
    """Send a transactional email via Loops. No-ops if LOOPS_API_KEY is not set."""
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
