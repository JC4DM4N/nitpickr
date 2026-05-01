#!/usr/bin/env python3
"""
Scans "what are you building" threads on X, identifies product-promoting replies,
checks if jam_thecreator has already replied to them, and saves draft replies locally.

Usage:
    cd scripts/
    pip install -r requirements.txt
    cp .env.example .env  # then fill in your keys
    python x.py
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import tweepy
from agents import Agent, Runner
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

# ── Config ───────────────────────────────────────────────────────────────────

MY_USERNAME = "jam_thecreator"

DRAFT_REPLY = (
    "Hey! You should check out https://nitpickr.dev\n\n"
    "You will get users, and completely free user testing + feedback.\n\n"
    "All you have to do is review someone else's app, and you'll get the same in return.\n\n"
    "Completely free to use too!"
)

# Add more tweet IDs here as you find new "what are you building" threads
TARGET_TWEET_IDS = [
    "2050166713073750231",  # @soloceoai "Who's building what today?"
    # "2050136597811843477",  # @DevenPatil_007 "What are you building?"
]

DRAFTS_FILE = Path(__file__).parent / "drafts.json"


# ── LLM classifier ────────────────────────────────────────────────────────────

class _PromoResult(BaseModel):
    is_promo: bool
    reason: str


_promo_agent = Agent(
    name="PromoClassifier",
    instructions=(
        "You analyse replies to 'what are you building?' threads on X (Twitter). "
        "Return is_promo=true if the reply is promoting, showcasing, or describing "
        "a product, app, tool, or startup the author is building or has built. "
        "Return is_promo=false for vague one-liners, general encouragement, "
        "questions, or off-topic comments that aren't actually promoting anything."
    ),
    output_type=_PromoResult,
    model="gpt-4o-mini",
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_client() -> tweepy.Client:
    token = os.environ.get("X_BEARER_TOKEN")
    if not token:
        sys.exit(
            "Error: X_BEARER_TOKEN not set.\n"
            "Copy scripts/.env.example to scripts/.env and fill in your credentials."
        )
    return tweepy.Client(bearer_token=token, wait_on_rate_limit=True)


def load_drafts() -> list:
    if DRAFTS_FILE.exists():
        return json.loads(DRAFTS_FILE.read_text())
    return []


def save_drafts(drafts: list) -> None:
    DRAFTS_FILE.write_text(json.dumps(drafts, indent=2, default=str))


def is_product_promo(text: str) -> bool:
    result = Runner.run_sync(_promo_agent, text)
    return result.final_output.is_promo


def get_replies(client: tweepy.Client, tweet_id: str) -> tuple[list, dict, str]:
    """
    Returns (replies, users_by_id, conversation_id).
    Fetches up to 500 replies from the thread, excluding the root author.
    """
    root = client.get_tweet(
        tweet_id,
        tweet_fields=["conversation_id", "author_id"],
        expansions=["author_id"],
        user_fields=["username"],
    )
    if not root.data:
        print(f"  Warning: tweet {tweet_id} not found or inaccessible")
        return [], {}, ""

    conv_id = str(root.data.conversation_id)
    root_username = root.includes["users"][0].username

    replies: list = []
    users: dict = {}

    paginator = tweepy.Paginator(
        client.search_recent_tweets,
        query=f"conversation_id:{conv_id} -from:{root_username} is:reply",
        tweet_fields=["author_id", "text", "created_at", "in_reply_to_user_id"],
        expansions=["author_id"],
        user_fields=["username", "name"],
        max_results=100,
        limit=5,  # 5 pages × 100 = 500 replies max
    )

    for page in paginator:
        if page.includes and "users" in page.includes:
            for u in page.includes["users"]:
                users[str(u.id)] = u
        if page.data:
            replies.extend(page.data)

    return replies, users, conv_id


def get_my_reply_targets(client: tweepy.Client, conv_id: str) -> set[str]:
    """
    Returns the set of user IDs that jam_thecreator has already replied to
    in this conversation. One API call per thread instead of one per reply.
    """
    resp = client.search_recent_tweets(
        query=f"conversation_id:{conv_id} from:{MY_USERNAME}",
        tweet_fields=["in_reply_to_user_id"],
        max_results=100,
    )
    if not resp.data:
        return set()
    return {str(t.in_reply_to_user_id) for t in resp.data if t.in_reply_to_user_id}


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("X Reply Drafter — nitpickr.dev\n")
    client = get_client()

    me = client.get_user(username=MY_USERNAME)
    if not me.data:
        sys.exit(f"Could not find user @{MY_USERNAME}")
    my_id = str(me.data.id)
    print(f"Authenticated as @{MY_USERNAME} (id: {my_id})\n")

    existing = load_drafts()
    drafted_ids = {d["reply_to_tweet_id"] for d in existing}
    new_drafts: list = []

    for tweet_id in TARGET_TWEET_IDS:
        print(f"Scanning tweet {tweet_id} ...")
        replies, users, conv_id = get_replies(client, tweet_id)
        if not conv_id:
            continue
        print(f"  {len(replies)} replies found in thread")

        already_replied_to = get_my_reply_targets(client, conv_id)

        for reply in replies:
            author_id = str(reply.author_id)

            if author_id == my_id:
                continue

            reply_id = str(reply.id)
            if reply_id in drafted_ids:
                continue

            if not is_product_promo(reply.text):
                continue

            user = users.get(author_id)
            username = user.username if user else author_id
            name = user.name if user else username

            print(f"  + Promo detected: @{username}: {reply.text[:70].strip()}...")

            if author_id in already_replied_to:
                print(f"    Already replied to @{username} — skipping")
                continue

            draft = {
                "id": f"{tweet_id}_{reply_id}",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "source_tweet_id": tweet_id,
                "reply_to_tweet_id": reply_id,
                "reply_to_username": username,
                "reply_to_name": name,
                "original_text": reply.text,
                "draft_text": f"@{username} {DRAFT_REPLY}",
                "status": "draft",
            }
            new_drafts.append(draft)
            drafted_ids.add(reply_id)
            print(f"    Draft queued for @{username}")

    print()
    if new_drafts:
        save_drafts(existing + new_drafts)
        print(f"Saved {len(new_drafts)} new draft(s) → {DRAFTS_FILE}")
    else:
        print("No new drafts to save.")


if __name__ == "__main__":
    main()
