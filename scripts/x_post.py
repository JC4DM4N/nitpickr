#!/usr/bin/env python3
"""
Interactively post draft replies saved by x.py.

Usage:
    python x_post.py           # review all pending drafts
    python x_post.py --limit 3 # review at most 3 drafts this session

Controls:
    y  — post this reply
    s  — skip (keep as draft for next time)
    d  — discard (remove from drafts.json permanently)
    q  — quit
"""

import argparse
import os
import sys
import time
from pathlib import Path

import tweepy
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

DRAFTS_FILE = Path(__file__).parent / "drafts.json"
SESSION_LIMIT = 25       # warn if you try to post more than this in one go
POST_DELAY_SEC = 5     # seconds to wait between posts


def get_client() -> tweepy.Client:
    required = {
        "X_API_KEY": os.environ.get("X_API_KEY"),
        "X_API_KEY_SECRET": os.environ.get("X_API_KEY_SECRET"),
        "X_ACCESS_TOKEN": os.environ.get("X_ACCESS_TOKEN"),
        "X_ACCESS_TOKEN_SECRET": os.environ.get("X_ACCESS_TOKEN_SECRET"),
    }
    missing = [k for k, v in required.items() if not v]
    if missing:
        sys.exit(
            f"Error: missing env vars: {', '.join(missing)}\n"
            "Copy scripts/.env.example to scripts/.env and fill in all four OAuth keys."
        )
    return tweepy.Client(
        consumer_key=required["X_API_KEY"],
        consumer_secret=required["X_API_KEY_SECRET"],
        access_token=required["X_ACCESS_TOKEN"],
        access_token_secret=required["X_ACCESS_TOKEN_SECRET"],
        wait_on_rate_limit=True,
    )


def load_drafts() -> list:
    import json
    if not DRAFTS_FILE.exists():
        sys.exit(f"No drafts file found at {DRAFTS_FILE}. Run x.py first.")
    return json.loads(DRAFTS_FILE.read_text())


def save_drafts(drafts: list) -> None:
    import json
    DRAFTS_FILE.write_text(json.dumps(drafts, indent=2, default=str))


def prompt(label: str, options: str) -> str:
    while True:
        choice = input(f"{label} [{options}]: ").strip().lower()
        if choice in list(options.replace("/", "")):
            return choice
        print(f"  Please enter one of: {options}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Post drafted X replies interactively.")
    parser.add_argument("--limit", type=int, default=SESSION_LIMIT,
                        help=f"Max replies to post this session (default: {SESSION_LIMIT})")
    args = parser.parse_args()

    drafts = load_drafts()
    pending = [d for d in drafts if d.get("status") == "draft"]

    if not pending:
        print("No pending drafts. Run x.py to find new replies.")
        return

    print(f"X Reply Poster — {len(pending)} pending draft(s)\n")

    if len(pending) > SESSION_LIMIT:
        print(
            f"Warning: you have {len(pending)} drafts. Posting more than ~{SESSION_LIMIT} "
            "identical replies in one session risks spam detection.\n"
            f"This session is capped at --limit {args.limit}. Run again tomorrow for the rest.\n"
        )

    client = get_client()
    posted_count = 0
    drafts_by_id = {d["id"]: d for d in drafts}

    for draft in pending:
        if posted_count >= args.limit:
            print(f"\nSession limit of {args.limit} reached. Run again later.")
            break

        print("─" * 60)
        print(f"Reply to:  @{draft['reply_to_username']} ({draft['reply_to_name']})")
        print(f"Their post: {draft['original_text']}")
        print(f"\nDraft reply:\n{draft['draft_text']}\n")

        tweet_url = f"https://x.com/i/web/status/{draft['reply_to_tweet_id']}"
        print(f"Thread:    {tweet_url}")
        print()

        choice = prompt("Action", "y/s/d/q")

        if choice == "q":
            print("Quitting.")
            break

        if choice == "s":
            print("Skipped.")
            continue

        if choice == "d":
            del drafts_by_id[draft["id"]]
            save_drafts(list(drafts_by_id.values()))
            print("Discarded.")
            continue

        # choice == "y" — post it
        try:
            response = client.create_tweet(
                text=draft["draft_text"],
                in_reply_to_tweet_id=draft["reply_to_tweet_id"],
            )
            posted_id = response.data["id"]
            del drafts_by_id[draft["id"]]
            save_drafts(list(drafts_by_id.values()))
            posted_count += 1
            print(f"Posted! https://x.com/i/web/status/{posted_id}")
        except tweepy.errors.TweepyException as e:
            print(f"Error posting: {e}")
            continue

        remaining = [d for d in pending if d["id"] in drafts_by_id]
        if remaining and posted_count < args.limit:
            print(f"Waiting {POST_DELAY_SEC}s before next post...")
            time.sleep(POST_DELAY_SEC)

    print(f"\nDone. Posted {posted_count} reply/replies this session.")


if __name__ == "__main__":
    main()
