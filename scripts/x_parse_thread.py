#!/usr/bin/env python3
"""
Parse a saved X thread HTML page and extract replies, automatically
excluding the original poster.

Usage:
    python x_parse_thread.py data/thread.html
    python x_parse_thread.py data/thread.html --out data/thread.json
    python x_parse_thread.py data/thread.html --exclude someuser  # manual override

How to get the HTML:
    Open the thread in your browser, scroll to the bottom to load all replies,
    then File → Save Page As → "Webpage, HTML Only".

Output: JSON list of dicts with keys: username, tweet, href
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

from bs4 import BeautifulSoup

_AVATAR_RE = re.compile(r"^UserAvatar-Container-")


def parse_thread(html: str, exclude: str = "") -> tuple[list[dict], str]:
    """
    Returns (replies, op_username).
    Automatically detects and excludes the original poster unless `exclude` is given.
    """
    soup = BeautifulSoup(html, "html.parser")
    articles = soup.find_all("article", attrs={"data-testid": "tweet"})

    all_tweets = []
    seen_hrefs: set[str] = set()

    for article in articles:
        avatar = article.find(attrs={"data-testid": _AVATAR_RE})
        if not avatar:
            continue
        testid = avatar.get("data-testid", "")
        username = testid[len("UserAvatar-Container-"):]

        # Display name — first text node of User-Name element (e.g. "Isaac" from "Isaac | @Isaacdev0 | · | May 1")
        name_el = article.find(attrs={"data-testid": "User-Name"})
        name = name_el.get_text(separator="|").split("|")[0].strip() if name_el else username

        text_el = article.find(attrs={"data-testid": "tweetText"})
        tweet_text = text_el.get_text(separator=" ").strip() if text_el else ""

        href = ""
        for a in article.find_all("a", href=True):
            h = a["href"]
            if "/status/" in h and "/analytics" not in h and "/photo/" not in h and "/video/" not in h:
                href = f"https://x.com{h}"
                break

        if not href or href in seen_hrefs:
            continue
        seen_hrefs.add(href)

        if username and tweet_text and href:
            all_tweets.append({"username": username, "name": name, "tweet": tweet_text, "href": href})

    # Detect OP as most frequent username (they reply to every response)
    op = exclude.lstrip("@").lower() if exclude else ""
    if not op and all_tweets:
        counts = Counter(t["username"].lower() for t in all_tweets)
        op = counts.most_common(1)[0][0]

    # Thread href is the OP's root tweet (first tweet by the OP)
    thread_href = next((t["href"] for t in all_tweets if t["username"].lower() == op), "")

    replies = [
        {**t, "thread_href": thread_href}
        for t in all_tweets
        if t["username"].lower() != op
    ]
    return replies, op


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse a saved X thread HTML page.")
    parser.add_argument("html_file", type=Path, help="Path to saved HTML file")
    parser.add_argument("--out", type=Path, default=None, help="Output JSON path (default: same name as input)")
    parser.add_argument("--exclude", default="", help="Override the auto-detected original poster username")
    args = parser.parse_args()

    if not args.html_file.exists():
        sys.exit(f"File not found: {args.html_file}")

    html = args.html_file.read_text(encoding="utf-8")
    replies, op = parse_thread(html, exclude=args.exclude)

    out_path = args.out or args.html_file.with_suffix(".json")
    out_path.write_text(json.dumps(replies, indent=2, ensure_ascii=False))

    print(f"Extracted {len(replies)} repl{'y' if len(replies) == 1 else 'ies'} → {out_path}")


if __name__ == "__main__":
    main()
