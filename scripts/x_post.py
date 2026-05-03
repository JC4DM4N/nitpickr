#!/usr/bin/env python3
"""
Interactively review draft replies and open them for manual posting.

Usage:
    python x_post.py

Controls:
    1 — copy draft_text to clipboard and open tweet in Chrome
    2 — copy draft_text_tailored to clipboard and open tweet in Chrome
    3 — pass (remove from drafts without sending)
    q — quit
"""

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR   = Path(__file__).parent / "data"
DRAFTS_FILE = DATA_DIR / "drafts.json"
SENT_FILE   = DATA_DIR / "sent.json"


def load_json(path: Path) -> list:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return []


def save_json(path: Path, data: list) -> None:
    path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")


def copy_to_clipboard(text: str) -> None:
    subprocess.run(["pbcopy"], input=text.encode(), check=True)


def open_in_chrome(url: str) -> None:
    subprocess.run(["open", "-a", "Google Chrome", url], check=True)


def move_to_sent(draft: dict, drafts: list, sent: list, sent_text: str | None) -> tuple[list, list]:
    updated_drafts = [d for d in drafts if d.get("reply_to_href") != draft["reply_to_href"]]
    if sent_text is not None:
        entry = {**draft, "sent_at": datetime.now(timezone.utc).isoformat(), "sent_text": sent_text}
        sent.append(entry)
    return updated_drafts, sent


def main() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    drafts = load_json(DRAFTS_FILE)
    sent   = load_json(SENT_FILE)

    pending = [d for d in drafts if d.get("status") == "draft"]
    if not pending:
        print("No pending drafts.")
        return

    print(f"X Reply Poster — {len(pending)} pending draft(s)\n")

    sent_this_session = 0

    for draft in pending:
        href           = draft.get("reply_to_href", "")
        username       = draft.get("reply_to_username", "")
        name           = draft.get("reply_to_name", username)
        original       = draft.get("original_text", "")
        text_plain     = draft.get("draft_text", "")
        text_tailored  = draft.get("draft_text_tailored") or text_plain

        print("─" * 64)
        print(f"@{username} ({name})")
        print(f"\nTheir post:\n{original}\n")
        print(f"1 — draft_text:\n{text_plain}\n")
        print(f"2 — draft_text_tailored:\n{text_tailored}\n")
        print(f"URL: {href}")
        print()

        while True:
            choice = input("Action [1/2/3/q]: ").strip().lower()
            if choice in ("1", "2", "3", "q"):
                break
            print("  Enter 1, 2, 3, or q.")

        if choice == "q":
            print("Quitting.")
            break

        if choice == "3":
            drafts, sent = move_to_sent(draft, drafts, sent, sent_text=None)
            save_json(DRAFTS_FILE, drafts)
            print("Passed.")
            continue

        selected_text = text_plain if choice == "1" else text_tailored
        copy_to_clipboard(selected_text)
        open_in_chrome(href)
        drafts, sent = move_to_sent(draft, drafts, sent, sent_text=selected_text)
        save_json(DRAFTS_FILE, drafts)
        save_json(SENT_FILE, sent)
        sent_this_session += 1
        print(f"Copied ({'plain' if choice == '1' else 'tailored'}) — Chrome opened. Paste and post manually.")

    remaining = sum(1 for d in drafts if d.get("status") == "draft")
    print(f"\nDone. {sent_this_session} sent this session · {remaining} draft(s) remaining.")


if __name__ == "__main__":
    main()
