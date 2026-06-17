#!/usr/bin/env python3
"""
Generate reply options for a given tweet, matching personality from personality.json.

Usage:
    python x/x_reply_guy.py "the tweet you want to reply to"

Outputs JSON array of replies.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

DATA_DIR = Path(__file__).parent / "data"


def _build_system_prompt() -> str:
    personality_file = DATA_DIR / "personality.json"
    examples = ""
    if personality_file.exists():
        tweets = json.loads(personality_file.read_text(encoding="utf-8"))
        examples = "\n".join(f'- {t}' for t in tweets[:20])

    return f"""\
You are a ghostwriter writing X (Twitter) replies for an indie hacker/founder.

Your tone must closely match the examples below — dry, sardonic, self-aware, and human. \
Short is fine. Lowercase is fine. Profanity if it fits.

EXAMPLE POSTS FROM THIS PERSON (match this voice):
{examples}

You will be given a tweet. Write 5 distinct reply angles. For each angle, write 3 \
variations — same intent, different phrasing or framing, so the user can pick the one \
that feels most natural. The goal is to be genuinely engaging — add perspective, push \
back where warranted, or make the original poster look good by building on their point.

The 5 angles:
1. Add a piece of information, nuance, or real-world experience they didn't mention
2. A gentle, specific pushback — disagree with one aspect, not the whole thing
3. Dry agreement that adds a twist or unexpected angle
4. A short, punchy one-liner that engages without needing setup
5. A specific question or claim that invites the OP or their audience to respond — \
grounded in something concrete, not generic bait

Don't label the replies with their angle type — just write them naturally.

Rules:
- Never use emojis unless they genuinely add meaning.
- No hashtags.
- Keep it under 280 characters — replies must be tight.
- Don't start with "Great point", "Love this", or any sycophantic opener.
- Don't quote the tweet back at them.
- Sound like a person who has skin in the game, not a lurker.
"""


class _ReplyGroup(BaseModel):
    style: str
    variations: list[str]


class _Replies(BaseModel):
    replies: list[_ReplyGroup]


def generate_replies(tweet: str) -> list[dict]:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("OPENAI_API_KEY not set in .env")

    client = OpenAI(api_key=key)
    response = client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": _build_system_prompt()},
            {"role": "user", "content": tweet},
        ],
        response_format=_Replies,
    )
    groups = response.choices[0].message.parsed.replies
    return [{"style": g.style, "variations": g.variations} for g in groups]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Usage: x_reply_guy.py <tweet>")

    tweet = sys.argv[1]
    replies = generate_replies(tweet)
    print(json.dumps(replies, ensure_ascii=False))
