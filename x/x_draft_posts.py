#!/usr/bin/env python3
"""
Generate 5 X posts from a context/news story, matching a personality from personality.json.

Usage:
    python x/x_draft_posts.py "trending news story or context here"

Outputs JSON array of posts.
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


def _build_system_prompt(opinion: str = "") -> str:
    personality_file = DATA_DIR / "personality.json"
    examples = ""
    if personality_file.exists():
        tweets = json.loads(personality_file.read_text(encoding="utf-8"))
        examples = "\n".join(f'- {t}' for t in tweets[:20])

    opinion_block = f"\nMY STANCE ON THIS TOPIC: {opinion}\nDo not write posts that contradict this stance.\n" if opinion else ""

    return f"""\
You are a ghostwriter writing X (Twitter) posts for an indie hacker/founder.

Your tone must closely match the examples below — dry, sardonic, self-aware, and human. \
The humour is understated or deadpan. Posts can be blunt, slightly absurd, or deliberately \
anti-hype. They feel like something a real person dashed off, not a marketer. \
Short is fine. Lowercase is fine. Profanity if it fits.

EXAMPLE POSTS (match this voice):
{examples}
{opinion_block}
Given a context or news story, write 6 post angles reacting to or riffing on it. \
For each angle, write 3 variations — same intent, different phrasing or framing, \
so the user can pick the one that feels most natural.

The 6 angles:
1. a dry, deadpan observation
2. a hot take — commit to an actual side, not a vibe
3. a self-deprecating riff
4. a contrarian take — push against the obvious narrative
5. a punchy one-liner, no setup
6. a reply-magnet — a specific, slightly provocative claim or question that makes people want \
to argue, correct you, or chime in with their own experience. The specificity should do the \
work — never end with generic bait like "thoughts?", "agree?", or "retweet if...".

Don't label them with their angle type, just write the post naturally.

Rules:
- Never use emojis unless they genuinely add meaning.
- Avoid corporate buzzwords (game-changer, disruptive, revolutionary, etc).
- No hashtags, no links in the body.
- Keep it concise — under 280 characters unless a multi-line format genuinely helps.
- Sharp or contrarian is good. Dunking for its own sake isn't — every post needs a real point, not just noise.
- Each post must feel like a distinct creative choice.
- Sound like a person, not a content creator.
"""


class _PostGroup(BaseModel):
    style: str
    variations: list[str]


class _Posts(BaseModel):
    posts: list[_PostGroup]


def generate_posts(prompt: str, opinion: str = "") -> list[dict]:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("OPENAI_API_KEY not set in .env")

    client = OpenAI(api_key=key)
    response = client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": _build_system_prompt(opinion)},
            {"role": "user", "content": prompt},
        ],
        response_format=_Posts,
    )
    groups = response.choices[0].message.parsed.posts
    return [{"style": g.style, "variations": g.variations} for g in groups]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Usage: x_draft_posts.py <prompt> [opinion]")

    prompt = sys.argv[1]
    opinion = sys.argv[2] if len(sys.argv) > 2 else ""
    posts = generate_posts(prompt, opinion)
    print(json.dumps(posts, ensure_ascii=False))
