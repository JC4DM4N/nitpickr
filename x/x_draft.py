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
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

MY_USERNAME = "jam_thecreator"

DRAFT_REPLY = (
    "Hey! For getting early feedback on your product you should check out https://nitpickr.dev\n\n"
    "You will get users, and completely free user testing + feedback.\n\n"
    "All you have to do is give feedback on someone else's product, and you'll get the same in return.\n\n"
    "Plus, it's free to use!"
)

DATA_DIR    = Path(__file__).parent / "data"
DRAFTS_FILE = DATA_DIR / "drafts.json"
SENT_FILE   = DATA_DIR / "sent.json"


# ── LLM classifier ────────────────────────────────────────────────────────────

CLASSIFIER_PROMPT = (
    "You analyse replies to 'what are you building?' threads on X (Twitter). "
    "Return is_promo=true if the reply is promoting, showcasing, or describing "
    "their product, app, tool, or startup the author is building or has built. "
    "Return is_promo=false for vague one-liners, general encouragement, discussion threads, "
    "engagement farming, questions, or off-topic comments that aren't actually promoting anything."
)


# EDITOR_PROMPT = (
#     "You are personalising a marketing reply on X (Twitter). "
#     "Given the author's display name, username, and tweet, write a short personalised opening line "
#     "to replace 'Hey!' at the start of the reply. "
#     "Use their first name where it makes sense ('Hey James!', 'Nice work James!'), "
#     "or a compliment tied to their product if you have enough context "
#     "('Looks awesome!', 'Really cool idea!', 'This looks super useful!'). "
#     "Don't say things too enthusiastic like, 'looks like a game changer!'. "
#     "If the tweet gives enough detail about what they are building, you may also append one short "
#     "sentence that shows you read their post — but only if it flows naturally. "
#     "Keep it concise (1–2 sentences max) and friendly. Return only the opening line, nothing else."
# )

EDITOR_PROMPT = (
    "You are personalising a marketing reply on X (Twitter). "
    "Given the author's display name, username, and tweet, write a short personalised opening line "
    "to replace 'Hey! For getting early feedback on your product you should check out https://nitpickr.dev' "
    "at the start of the reply, with a 'Hey NAME! For getting early feedback on your product you should check out https://nitpickr.dev'. "
    "Only use their first name where it makes sense, and only if it is an actual person's name. "
    "Do not replace it with the name of their company, product or twitter handle, unless it is an actual person's name. "
    "If you cannot determine their name, don't force it, just use 'Hey!'. "
    "If you can determine the name of their product, or if you can find a more appropraite term "
    "(such as 'your tool', 'your app') then you can also replace 'your product' too, but I prefer 'your product' " 
    "if there's no other obvious fit, as it is more polite. For example, if their company or product's name is "
    "'NitPickr', you would replace 'your product' with 'NitPickr'."
)

SUPER_TAILORED_PROMPT = (
    "You are writing a personalised reply on X (Twitter) to someone who has shared what they are building. "
    "You will be given a draft reply as a starting point and context about their product. "
    "\n\n"
    "Your reply must promote Nitpickr as a way to get early feedback and user testing — these two terms are "
    "core to Nitpickr's brand and must appear naturally. The concept to convey: Nitpickr is a free platform "
    "where founders get real user feedback and user testing by giving feedback on someone else's product in return. "
    "Always frame what they RECEIVE (feedback + user testing) as the primary benefit — not what they have to do. "
    "\n\n"
    "VARY YOUR STRUCTURE — do not follow the same pattern every time:\n"
    "- Opening: sometimes use their first name, sometimes open directly with a comment on their product, "
    "sometimes open with a question about their early feedback plans. Do not always start with 'Hey [Name]!'.\n"
    "- URL placement: sometimes include https://nitpickr.dev early, sometimes at the end, and roughly one "
    "reply in three just refer to it as 'Nitpickr' or 'nitpickr.dev' without the full URL — phrased more "
    "as a casual mention ('worth checking out Nitpickr') than a hard sell.\n"
    "- Closing: end differently every time. Do not reuse 'Happy building!', 'Best of luck!', "
    "'Wishing you great success', 'Excited to see how X evolves', 'And the best part?', or any fixed sign-off. "
    "Sometimes just end on the value statement with no closing line at all.\n"
    "\n\n"
    "Only use their first name if it is clearly a real person's name — not a company name, product name, "
    "or Twitter handle. If unsure, skip the name. "
    "Do not use words like 'game-changer', 'revolutionary', 'incredible', 'awesome', 'amazing', 'fantastic', "
    "'powerful', 'the best part?', or 'insights' (use 'feedback' instead). "
    "Do not use the sentence pattern 'It's a [X] way to...' — it appears too formulaic. "
    "Do not use 'Can't wait to see how X evolves' or any variation of that phrase. "
    "Mentioning that Nitpickr is free is fine — but only say it in roughly one reply in three, "
    "and vary how you say it ('no cost', 'free to use', 'at no cost to you', etc.). "
    "Sound like a real person — warm and direct, not a marketing bot. "
    "3-5 sentences total. Return only the reply text, nothing else. "
    "Include line breaks between paragraphs as in the original draft."
)


# ── Banned terms (super tailored only) ───────────────────────────────────────
# Edit this list to add/remove terms. All checks are case-insensitive substring matches.

BANNED_TERMS: list[str] = [
    # Banned words
    "insights",
    "insightful",
    "game-changer",
    "game changer",
    "revolutionary",
    "incredible",
    "awesome",
    "amazing",
    "fantastic",
    "powerful",
    "fascinating",
    "intriguing",
    # Banned phrases
    "and the best part?",
    "win-win",
    "can't wait to see",
    "happy building",
    "best of luck",
    "wishing you",       # covers "wishing you great success", "wishing you lots of success", etc.
    "excited to see",    # catches "excited to see X in action!" and "excited to see how"
    # Formulaic sentence patterns — add variants as you discover them
    "it's a great way to",
    "it's a simple way to",
    "it's an easy way to",
    "it's a helpful way to",
    "it's a straightforward way to",
    "it's a wonderful way to",
    "it's a win-win",
    "a great way to do this",
    "an easy way to",
    "a smart way to",
    "a great way to",    # catches the prefix-less version
    "a nifty way to",
]


_FIXER_PROMPT = (
    "You are editing a reply for X (Twitter). It contains banned terms that must be removed. "
    "Rewrite the reply so that none of the banned terms appear — not even close synonyms or rewordings of them. "
    "Keep the same overall tone, length, structure, and core message. "
    "Return only the rewritten reply text, nothing else."
)


def _strip_markdown(text: str) -> str:
    # X doesn't render markdown — convert [label](url) → label (url)
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'\1 (\2)', text)


def _banned_violations(text: str) -> list[str]:
    lower = text.lower()
    return [term for term in BANNED_TERMS if term.lower() in lower]


def _fix_violations(text: str, violations: list[str]) -> str:
    prompt = f"Banned terms to eliminate: {', '.join(violations)}\n\nReply to fix:\n{text}"
    response = _get_openai().beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": _FIXER_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format=_SuperTailoredReply,
    )
    return _strip_markdown(response.choices[0].message.parsed.reply.strip().replace("—", "-").replace("—", "-"))


class _PromoResult(BaseModel):
    is_promo: bool
    reason: str


class _TailoredOpener(BaseModel):
    opening_line: str


class _SuperTailoredReply(BaseModel):
    reply: str


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
    # return DRAFT_REPLY.replace("Hey! For getting early feedback on your product", opening, 1)
    return DRAFT_REPLY.replace(
        "Hey! For getting early feedback on your product you should check out https://nitpickr.dev", 
        opening, 
        1
    ).replace("\u2014", "-").replace("—", "-")


def super_tailor_response(reply: dict) -> str | None:
    name = reply.get("name") or reply.get("username", "")
    username = reply.get("username", "")
    tweet = reply.get("tweet", "")

    response = _get_openai().beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SUPER_TAILORED_PROMPT},
            {"role": "user", "content": f"Draft reply:\n{DRAFT_REPLY}\n\nName: {name}\nUsername: @{username}\nTweet: {tweet}"},
        ],
        response_format=_SuperTailoredReply,
    )
    text = _strip_markdown(response.choices[0].message.parsed.reply.strip().replace("\u2014", "-").replace("—", "-"))

    # Fix any violations with a targeted edit call rather than regenerating from scratch
    for fix_attempt in range(2):
        violations = _banned_violations(text)
        if not violations:
            return text
        print(f"  ! banned terms found ({', '.join(violations)}), fixing...", flush=True)
        text = _fix_violations(text, violations)

    violations = _banned_violations(text)
    if violations:
        print(f"  ! could not eliminate banned terms ({', '.join(violations)}) — skipping draft", flush=True)
        return None
    return text

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

        print(f"  ✓ promo — generating drafts")
        super_tailored = super_tailor_response(reply)
        if super_tailored is None:
            skipped["banned_terms"] = skipped.get("banned_terms", 0) + 1
            continue

        draft = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "reply_to_href": href,
            "thread_href": thread_href,
            "reply_to_username": username,
            "reply_to_name": name,
            "original_text": tweet,
            "draft_text": f"{DRAFT_REPLY}",
            "draft_text_tailored": tailor_response(reply),
            "draft_text_super_tailored": super_tailored,
            "status": "draft",
        }
        new_drafts.append(draft)
        drafted_hrefs.add(href)
        replied_usernames.add(username.lower())

    print(f"\nSkipped: {skipped['already_replied']} already replied · "
          f"{skipped['already_drafted']} already drafted · "
          f"{skipped['not_promo']} not a promo · "
          f"{skipped.get('banned_terms', 0)} banned terms (unfixable)")

    if new_drafts:
        save_drafts(existing_drafts + new_drafts)
        print(f"Saved {len(new_drafts)} new draft(s) → {DRAFTS_FILE}")
    else:
        print("No new drafts.")


if __name__ == "__main__":
    main()
