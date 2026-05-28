#!/usr/bin/env python3
"""
Generate 5 viral X posts from a topic/idea prompt.

Usage:
    python x/x_draft_posts.py "my servers are causing me trouble"

Outputs JSON array of posts, ordered from least to most viral.
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


SYSTEM_PROMPT = """\
You are a ghostwriter who specialises in viral X (Twitter) posts for indie hackers and founders.

Given a topic or situation, write 5 different posts about it — each with a different virality style.
All posts should sound like a real person wrote them (not a marketer), be concise (under 280 characters unless a thread format suits), and feel authentic.

Write them in this order, from least to most viral:

1. GENUINE — honest, conversational, no hooks. Just sharing how it is.
2. RELATABLE — slightly broader appeal, taps into a shared feeling or frustration.
3. STORY — short narrative arc or "I used to think X, now Y" structure.
4. HOT TAKE — contrarian, thought-provoking, or an unexpected angle on the situation.
5. VIRAL — bold hook, punchy format, highly shareable. Can be a short thread opener, a list, or a strong claim.

Rules:
- Never use emojis unless they genuinely add meaning.
- Never start with "I've been" or "Let me tell you".
- Avoid corporate buzzwords (game-changer, disruptive, revolutionary, etc).
- Keep it first-person and grounded.
- Each post should feel like a distinct creative choice, not a variation of the same sentence.
"""


class _Post(BaseModel):
    style: str
    text: str


class _Posts(BaseModel):
    posts: list[_Post]


def generate_posts(prompt: str) -> list[dict]:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("OPENAI_API_KEY not set in .env")

    client = OpenAI(api_key=key)
    response = client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format=_Posts,
    )
    posts = response.choices[0].message.parsed.posts
    return [{"style": p.style, "text": p.text} for p in posts]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Usage: x_draft_posts.py <prompt>")

    prompt = " ".join(sys.argv[1:])
    posts = generate_posts(prompt)
    print(json.dumps(posts, ensure_ascii=False))
