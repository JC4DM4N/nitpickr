#!/usr/bin/env python3
"""
Ban a user by username.

Usage:
    python scripts/ban_user.py <username> [reason]

    reason  Optional rejection message (default: "banned for AI review")

Effects:
  - Sets is_banned = true on the user
  - Rejects all in-progress reviews (not yet complete or rejected):
      is_rejected = true, owner_message = "banned for AI review"
  - Returns each affected app owner's escrowed credit back to their credits
"""

import os
import sys

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5442/nitpickr")

def ban_user(username: str, reason: str = "banned for AI review"):
    engine = create_engine(DATABASE_URL)
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT id FROM users WHERE username = :u"),
            {"u": username},
        ).fetchone()

        if not row:
            print(f"User '{username}' not found.")
            sys.exit(1)

        user_id = row[0]

        conn.execute(
            text("UPDATE users SET is_banned = TRUE WHERE id = :id"),
            {"id": user_id},
        )

        # Return escrowed credits to each app owner before rejecting
        conn.execute(
            text("""
                UPDATE users
                SET escrow_credits = users.escrow_credits - a.credits,
                    credits        = users.credits        + a.credits
                FROM reviews r
                JOIN apps a ON r.app_id = a.id
                WHERE r.reviewer_id = :id
                  AND r.is_complete  = FALSE
                  AND r.is_rejected  = FALSE
                  AND users.id = a.owner_id
            """),
            {"id": user_id},
        )

        result = conn.execute(
            text("""
                UPDATE reviews
                SET is_rejected   = TRUE,
                    owner_message = :reason
                WHERE reviewer_id = :id
                  AND is_complete  = FALSE
                  AND is_rejected  = FALSE
            """),
            {"id": user_id, "reason": reason},
        )

        print(f"Banned '{username}' (id={user_id}).")
        print(f"Rejected {result.rowcount} in-progress review(s), escrow returned to owners.")

if __name__ == "__main__":
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        print("Usage: python scripts/ban_user.py <username> [reason]")
        sys.exit(1)
    ban_user(sys.argv[1], sys.argv[2] if len(sys.argv) == 3 else "banned for AI review")
