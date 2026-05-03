#!/usr/bin/env python3
"""
Reads data/thread.json, filters out anyone already replied to or drafted,
classifies remaining replies with an LLM, and appends drafts to data/drafts.json.

Workflow:
    1. x_parse_thread.py  →  data/thread.json   (parse saved HTML)
    2. x_draft.py         →  data/drafts.json    (this script)
    3. x_post.py          →  interactive review  (manual posting)
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

MY_USERNAME = "jam_thecreator"

DRAFT_REPLY = (
    "Hey! For getting early feedback you should check out https://nitpickr.dev\n\n"
    "You will get users, and completely free user testing + feedback.\n\n"
    "All you have to do is review someone else's app, and you'll get the same in return.\n\n"
    "Completely free to use too!"
)

DATA_DIR    = Path(__file__).parent / "data"
DRAFTS_FILE = DATA_DIR / "drafts.json"
SENT_FILE   = DATA_DIR / "sent.json"


# ── LLM classifier ────────────────────────────────────────────────────────────

CLASSIFIER_PROMPT = (
    "You analyse replies to 'what are you building?' threads on X (Twitter). "
    "Return is_promo=true if the reply is promoting, showcasing, or describing "
    "a product, app, tool, or startup the author is building or has built. "
    "Return is_promo=false for vague one-liners, general encouragement, "
    "questions, or off-topic comments that aren't actually promoting anything."
)


EDITOR_PROMPT = (
    "You are personalising a marketing reply on X (Twitter). "
    "Given the author's display name, username, and tweet, write a short personalised opening line "
    "to replace 'Hey!' at the start of the reply. "
    "Use their first name where it makes sense ('Hey James!', 'Nice work James!'), "
    "or a compliment tied to their product if you have enough context "
    "('Looks awesome!', 'Really cool idea!', 'This looks super useful!'). "
    "If the tweet gives enough detail about what they are building, you may also append one short "
    "sentence that shows you read their post — but only if it flows naturally. "
    "Keep it concise (1–2 sentences max) and friendly. Return only the opening line, nothing else."
)


class _PromoResult(BaseModel):
    is_promo: bool
    reason: str


class _TailoredOpener(BaseModel):
    opening_line: str


_openai: OpenAI | None = None


def _get_openai() -> OpenAI:
    global _openai
    if _openai is None:
        key = os.environ.get("OPENAI_API_KEY")
        if not key:
            sys.exit("OPENAI_API_KEY not set in .env")
        _openai = OpenAI(api_key=key)
    return _openai


def is_product_promo(text: str) -> bool:
    response = _get_openai().beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": CLASSIFIER_PROMPT},
            {"role": "user", "content": text},
        ],
        response_format=_PromoResult,
    )
    return response.choices[0].message.parsed.is_promo


def tailor_response(reply: dict) -> str:
    name = reply.get("name") or reply.get("username", "")
    username = reply.get("username", "")
    tweet = reply.get("tweet", "")

    response = _get_openai().beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": EDITOR_PROMPT},
            {"role": "user", "content": f"Name: {name}\nUsername: @{username}\nTweet: {tweet}"},
        ],
        response_format=_TailoredOpener,
    )
    opening = response.choices[0].message.parsed.opening_line.strip()
    return DRAFT_REPLY.replace("Hey!", opening, 1)

# ── tweets.js ─────────────────────────────────────────────────────────────────

def load_replied_usernames(tweets_js: Path) -> set[str]:
    """Returns lowercase set of every username ever replied to."""
    text = tweets_js.read_text(encoding="utf-8")
    items = json.loads(text[text.index("["):])
    return {
        item.get("tweet", {}).get("in_reply_to_screen_name", "").lower()
        for item in items
        if item.get("tweet", {}).get("in_reply_to_screen_name")
    }


# ── Drafts ────────────────────────────────────────────────────────────────────

def load_drafts() -> list:
    if DRAFTS_FILE.exists():
        return json.loads(DRAFTS_FILE.read_text())
    return []


def save_drafts(drafts: list) -> None:
    DRAFTS_FILE.write_text(json.dumps(drafts, indent=2, default=str))


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    replies_file = DATA_DIR / "thread.json"
    tweets_js    = DATA_DIR / "tweets.js"

    if not replies_file.exists():
        sys.exit(f"Replies file not found: {replies_file}")

    replies = json.loads(replies_file.read_text(encoding="utf-8"))
    print(f"X Reply Drafter — nitpickr.dev\n")
    print(f"Loaded {len(replies)} replies from {replies_file}")

    # Build sets for skip checks
    replied_usernames: set[str] = set()
    if tweets_js.exists():
        replied_usernames |= load_replied_usernames(tweets_js)
        print(f"Loaded {len(replied_usernames)} usernames from tweet history")

    existing_drafts = load_drafts()
    drafted_hrefs = {d.get("reply_to_href") for d in existing_drafts}
    replied_usernames |= {d.get("reply_to_username", "").lower() for d in existing_drafts}

    if SENT_FILE.exists():
        sent = json.loads(SENT_FILE.read_text(encoding="utf-8"))
        replied_usernames |= {d.get("reply_to_username", "").lower() for d in sent}

    print(f"Loaded {len(existing_drafts)} existing draft(s)\n")

    new_drafts: list = []
    skipped = {"already_replied": 0, "already_drafted": 0, "not_promo": 0}

    for reply in replies:
        username = reply.get("username", "")
        name = reply.get("name", username)
        tweet = reply.get("tweet", "")
        href = reply.get("href", "")
        thread_href = reply.get("thread_href", "")

        if username.lower() == MY_USERNAME.lower():
            continue

        if username.lower() in replied_usernames:
            skipped["already_replied"] += 1
            continue

        if href in drafted_hrefs:
            skipped["already_drafted"] += 1
            continue

        print(f"Classifying @{username}: {tweet[:60].strip()}...")
        if not is_product_promo(tweet):
            skipped["not_promo"] += 1
            print(f"  ✗ not a promo")
            continue

        print(f"  ✓ promo — draft queued")
        draft = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "reply_to_href": href,
            "thread_href": thread_href,
            "reply_to_username": username,
            "reply_to_name": name,
            "original_text": tweet,
            "draft_text": f"{DRAFT_REPLY}",
            "draft_text_tailored": tailor_response(reply),
            "status": "draft",
        }
        new_drafts.append(draft)
        drafted_hrefs.add(href)
        replied_usernames.add(username.lower())

    print(f"\nSkipped: {skipped['already_replied']} already replied · "
          f"{skipped['already_drafted']} already drafted · "
          f"{skipped['not_promo']} not a promo")

    if new_drafts:
        save_drafts(existing_drafts + new_drafts)
        print(f"Saved {len(new_drafts)} new draft(s) → {DRAFTS_FILE}")
    else:
        print("No new drafts.")


if __name__ == "__main__":
    main()
