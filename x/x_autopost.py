#!/usr/bin/env python3
"""
Auto-post reply drafts to X by controlling an existing Chrome session via Playwright CDP.

Prerequisites:
    pip install playwright
    # Chrome must be running with --remote-debugging-port=9222 (use dashboard "Launch Chrome with CDP")
    # Must be logged into X in that Chrome window

Usage:
    python x_autopost.py [--limit N] [--variant tailored|plain|super] [--min-delay S] [--max-delay S]

Output lines are prefixed with STATUS/POSTING/OK/WAIT/SKIP/ERROR/DONE for machine parsing.
"""

import argparse
import asyncio
import json
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from playwright.async_api import async_playwright, TimeoutError as PWTimeoutError
except ImportError:
    sys.exit("ERROR: Run: pip install playwright")

DATA_DIR = Path(__file__).parent / "data"
DRAFTS_FILE = DATA_DIR / "drafts.json"
SENT_FILE = DATA_DIR / "sent.json"
CDP_PORT = 9222

VARIANT_KEY = {
    "plain": "draft_text",
    "tailored": "draft_text_tailored",
    "super": "draft_text_super_tailored",
}


def load_json(path: Path) -> list:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return []


def save_json(path: Path, data: list) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


async def post_reply(page, href: str, text: str) -> None:
    await page.goto(href, wait_until="domcontentloaded", timeout=30_000)
    await asyncio.sleep(random.uniform(2.0, 3.5))

    # On a tweet permalink page there is already an inline reply box — no need
    # to click the reply icon (that opens a modal, which is wrong)
    compose = page.locator('[data-testid="tweetTextarea_0"]').first
    await compose.wait_for(state="visible", timeout=15_000)
    await compose.click()
    await asyncio.sleep(0.8)

    # Insert text via JS — keyboard simulation is unreliable on CDP-attached browsers
    await page.evaluate(
        """text => {
            const wrapper = document.querySelector('[data-testid="tweetTextarea_0"]');
            const el = (wrapper && wrapper.querySelector('[contenteditable="true"]')) || wrapper;
            if (!el) return;
            el.focus();
            const dt = new DataTransfer();
            dt.setData('text/plain', text);
            el.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true}));
        }""",
        text,
    )
    await asyncio.sleep(0.5)

    content = await compose.inner_text()
    if not content.strip():
        await page.evaluate(
            """text => {
                const wrapper = document.querySelector('[data-testid="tweetTextarea_0"]');
                const el = (wrapper && wrapper.querySelector('[contenteditable="true"]')) || wrapper;
                if (el) { el.focus(); document.execCommand('insertText', false, text); }
            }""",
            text,
        )
        await asyncio.sleep(0.5)
        content = await compose.inner_text()
        if not content.strip():
            raise RuntimeError("Text insertion failed")

    await asyncio.sleep(random.uniform(0.8, 1.5))

    post_btn = page.locator('[data-testid="tweetButtonInline"]')
    await post_btn.wait_for(state="visible", timeout=10_000)
    await post_btn.click()

    # Inline reply box stays on the page after posting (doesn't hide like a modal)
    # so just wait for the network request to land
    await asyncio.sleep(random.uniform(3.0, 4.5))


async def run(limit: int, variant: str, min_delay: float, max_delay: float) -> None:
    drafts = load_json(DRAFTS_FILE)
    sent = load_json(SENT_FILE)
    pending = [d for d in drafts if d.get("status") == "draft"][:limit]

    if not pending:
        print("STATUS: No pending drafts.", flush=True)
        return

    print(f"STATUS: {len(pending)} draft(s) queued — variant={variant} delay={min_delay:.0f}-{max_delay:.0f}s", flush=True)

    async with async_playwright() as pw:
        try:
            browser = await pw.chromium.connect_over_cdp(f"http://localhost:{CDP_PORT}")
        except Exception as e:
            print(f"ERROR: Cannot connect to Chrome on port {CDP_PORT}. Launch Chrome with CDP first. ({e})", flush=True)
            sys.exit(1)

        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        page = await context.new_page()

        posted = 0
        failed = 0

        for i, draft in enumerate(pending):
            href = draft.get("reply_to_href", "")
            username = draft.get("reply_to_username", "?")
            key = VARIANT_KEY.get(variant, "draft_text_tailored")
            text = draft.get(key) or draft.get("draft_text", "")

            if not href or not text:
                print(f"SKIP: [{i+1}/{len(pending)}] @{username} — missing href or text", flush=True)
                continue

            print(f"POSTING: [{i+1}/{len(pending)}] @{username}…", flush=True)

            try:
                await post_reply(page, href, text)

                sent.append({
                    **draft,
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "sent_text": text,
                    "auto_posted": True,
                })
                drafts = [d for d in drafts if d.get("reply_to_href") != href]
                save_json(SENT_FILE, sent)
                save_json(DRAFTS_FILE, drafts)
                posted += 1
                print(f"OK: [{i+1}/{len(pending)}] @{username} posted", flush=True)

            except PWTimeoutError as e:
                failed += 1
                print(f"TIMEOUT: [{i+1}/{len(pending)}] @{username} — {e}", flush=True)
            except Exception as e:
                failed += 1
                print(f"ERROR: [{i+1}/{len(pending)}] @{username} — {e}", flush=True)

            if i < len(pending) - 1:
                delay = random.uniform(min_delay, max_delay)
                print(f"WAIT: {delay:.0f}s…", flush=True)
                await asyncio.sleep(delay)

        await page.close()

    skipped = len(pending) - posted - failed
    print(f"DONE: {posted} posted · {failed} failed · {skipped} skipped", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Auto-post X reply drafts via Playwright CDP")
    parser.add_argument("--limit", type=int, default=50, help="Max drafts to post (default 50)")
    parser.add_argument("--variant", choices=["plain", "tailored", "super"], default="tailored")
    parser.add_argument("--min-delay", type=float, default=25.0, help="Min seconds between posts")
    parser.add_argument("--max-delay", type=float, default=45.0, help="Max seconds between posts")
    args = parser.parse_args()
    asyncio.run(run(args.limit, args.variant, args.min_delay, args.max_delay))


if __name__ == "__main__":
    main()
