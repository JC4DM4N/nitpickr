#!/usr/bin/env python3
"""
X Thread Dashboard — local server, open on phone via LAN.

Usage:
    python x/dashboard.py

Then open http://<your-mac-ip>:5555 on your phone.

Phone scrape workflow (no HTTPS required):
    1. Open /bookmarklet on your phone and save the bookmarklet.
    2. Navigate to the x.com thread, scroll to load all replies.
    3. Tap the bookmarklet — it navigates to /capture which relays the HTML.
    4. You're redirected back to the dashboard automatically.

Mac scrape workflow (Chrome must have --remote-debugging-port=9222):
    1. Tap "Launch Chrome with CDP" in the dashboard.
    2. Navigate Chrome to the thread, scroll to load all replies.
    3. Tap "Scrape Open Tab".
"""

from __future__ import annotations

import json
import socket
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from flask import Flask, jsonify, redirect, request, render_template_string, url_for
except ImportError:
    sys.exit("Run: pip install flask")

try:
    import websocket
except ImportError:
    sys.exit("Run: pip install websocket-client")

import requests as _req

DATA_DIR   = Path(__file__).parent / "data"
SCRIPT_DIR = Path(__file__).parent
CDP_PORT   = 9222

app = Flask(__name__)


def _local_ip() -> str:
    try:
        return socket.gethostbyname(socket.gethostname())
    except Exception:
        return "unknown"


# ── Dashboard ─────────────────────────────────────────────────────────────────

DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>X Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f0f2f5; color: #1a1a1a; }
    .container { max-width: 520px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 1.15rem; font-weight: 700; margin: 0 0 16px; }
    .card { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .card-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #888; margin: 0 0 10px; }
    .hint { font-size: 0.8rem; color: #888; margin: 0 0 10px; line-height: 1.4; }
    .divider { border: none; border-top: 1px solid #f0f2f5; margin: 12px 0; }
    button {
      background: #1d9bf0; color: #fff; border: none; border-radius: 10px;
      padding: 13px 16px; font-size: 0.95rem; font-weight: 600;
      cursor: pointer; width: 100%; margin-top: 6px;
      -webkit-tap-highlight-color: transparent; transition: opacity .15s;
    }
    button:active { opacity: .75; }
    button.grey  { background: #6b7280; }
    button.red   { background: #dc2626; }
    button.green { background: #16a34a; }
    button.sm    { font-size: 0.8rem; padding: 9px 12px; }
    .bm-link {
      display: block; text-align: center; margin-top: 8px;
      font-size: 0.82rem; color: #1d9bf0; text-decoration: none;
    }
    .status { font-size: 0.82rem; margin-top: 8px; min-height: 18px; line-height: 1.4; color: #555; }
    .status.ok    { color: #16a34a; }
    .status.error { color: #dc2626; }
    .draft { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
    .draft-user  { font-weight: 700; font-size: 0.9rem; }
    .draft-tweet { font-size: 0.78rem; color: #666; margin: 3px 0 8px; line-height: 1.4; }
    .tabs { display: flex; gap: 6px; margin-bottom: 8px; }
    .tab { flex: 1; padding: 6px 8px; font-size: 0.78rem; font-weight: 600; border: none; border-radius: 7px; cursor: pointer; background: #f0f2f5; color: #444; transition: background .15s; }
    .tab.active { background: #1d9bf0; color: #fff; }
    .draft-text { font-size: 0.83rem; background: #f8f9fa; padding: 10px; border-radius: 8px; white-space: pre-wrap; margin-bottom: 10px; line-height: 1.5; }
    .draft-actions { display: flex; gap: 8px; }
    .draft-actions button { margin: 0; flex: 1; }
    .badge { display: inline-block; background: #1d9bf0; color: #fff; font-size: 0.7rem; font-weight: 700; border-radius: 9px; padding: 2px 7px; margin-left: 6px; vertical-align: middle; }
  </style>
</head>
<body>
<div class="container">
  <h1>X Thread Dashboard</h1>

  <!-- ① Scrape -->
  <div class="card">
    <div class="card-title">① Scrape</div>

    <p class="hint"><strong>On phone:</strong> save the bookmarklet, open the x.com thread, scroll to load all replies, then tap it.</p>
    <a class="bm-link" href="/bookmarklet">Get phone bookmarklet →</a>

    <hr class="divider">

    <p class="hint"><strong>On Mac:</strong> Chrome must be open with CDP. Tap Launch, navigate to the thread, scroll, then Scrape.</p>
    <button onclick="launchChrome()">Launch Chrome with CDP</button>
    <button class="grey" onclick="scrape()">Scrape Open Tab</button>

    <div id="scrape-status" class="status"></div>
  </div>

  <!-- ② Parse -->
  <div class="card">
    <div class="card-title">② Parse Thread</div>
    <p class="hint">Extracts replies from thread.html → thread.json, excluding the OP.</p>
    <button onclick="parse()">Parse Thread</button>
    <div id="parse-status" class="status"></div>
  </div>

  <!-- ③ Draft -->
  <div class="card">
    <div class="card-title">③ Generate Drafts (optional)</div>
    <p class="hint">Runs x_draft.py — classifies replies with OpenAI and writes drafts.json.</p>
    <button class="grey" onclick="draft()">Generate Drafts</button>
    <div id="draft-status" class="status"></div>
  </div>

  <!-- ④ Post -->
  <div class="card">
    <div class="card-title">④ Post<span id="draft-count" class="badge" style="display:none"></span></div>
    <button class="grey sm" onclick="loadDrafts()">Refresh Drafts</button>
    <div id="drafts-status" class="status"></div>
    <div id="drafts-list" style="margin-top:12px"></div>
  </div>
</div>

<script>
async function api(endpoint, body) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: body != null ? JSON.stringify(body) : undefined,
    });
    return res.json();
  } catch(e) { return {ok: false, message: String(e)}; }
}

async function launchChrome() {
  setStatus('scrape-status', 'Launching Chrome…', '');
  const r = await api('/api/launch_chrome');
  setStatus('scrape-status', r.message, r.ok ? 'ok' : 'error');
}

async function scrape() {
  setStatus('scrape-status', 'Connecting to Chrome CDP…', '');
  const r = await api('/api/scrape');
  setStatus('scrape-status', r.message, r.ok ? 'ok' : 'error');
}

async function parse() {
  setStatus('parse-status', 'Parsing…', '');
  const r = await api('/api/parse');
  setStatus('parse-status', r.message, r.ok ? 'ok' : 'error');
}

async function draft() {
  setStatus('draft-status', 'Generating drafts (this may take a while)…', '');
  const r = await api('/api/draft');
  setStatus('draft-status', r.message, r.ok ? 'ok' : 'error');
  if (r.ok) loadDrafts();
}

async function loadDrafts() {
  const res = await fetch('/api/drafts');
  const all = await res.json();
  const pending = all.filter(d => d.status === 'draft');
  const badge = document.getElementById('draft-count');
  badge.textContent = pending.length;
  badge.style.display = pending.length ? '' : 'none';
  setStatus('drafts-status', `${pending.length} pending draft(s)`, pending.length ? 'ok' : '');
  renderDrafts(pending);
}

function renderDrafts(drafts) {
  const el = document.getElementById('drafts-list');
  if (!drafts.length) { el.innerHTML = '<p style="font-size:.82rem;color:#888">No pending drafts.</p>'; return; }
  el.innerHTML = drafts.map((d, i) => {
    const plain    = esc(d.draft_text || '');
    const tailored = esc(d.draft_text_tailored || d.draft_text || '');
    const tweet    = esc((d.original_text || '').slice(0, 120)) + (d.original_text?.length > 120 ? '…' : '');
    return `
      <div class="draft" id="draft-${i}">
        <div class="draft-user">@${esc(d.reply_to_username)} &mdash; ${esc(d.reply_to_name)}</div>
        <div class="draft-tweet">${tweet}</div>
        <div class="tabs">
          <button class="tab active" onclick="showTab(${i},'plain')">Plain</button>
          <button class="tab" onclick="showTab(${i},'tailored')">Tailored</button>
        </div>
        <div class="draft-text" id="text-plain-${i}">${plain}</div>
        <div class="draft-text" id="text-tailored-${i}" style="display:none">${tailored}</div>
        <div class="draft-actions">
          <button class="green sm" onclick="useDraft(${i},'${esc(d.reply_to_href)}','plain')">Use Plain</button>
          <button class="green sm" onclick="useDraft(${i},'${esc(d.reply_to_href)}','tailored')">Use Tailored</button>
          <button class="red sm"   onclick="passDraft(${i},'${esc(d.reply_to_href)}')">Pass</button>
        </div>
      </div>`;
  }).join('');
}

function showTab(i, variant) {
  document.getElementById(`text-plain-${i}`).style.display    = variant === 'plain'    ? '' : 'none';
  document.getElementById(`text-tailored-${i}`).style.display = variant === 'tailored' ? '' : 'none';
  document.querySelectorAll(`#draft-${i} .tab`).forEach((b, j) => b.classList.toggle('active', j === (variant === 'plain' ? 0 : 1)));
}

async function useDraft(i, href, variant) {
  const textEl = document.getElementById(`text-${variant}-${i}`);
  await copyText(textEl.innerText);
  const r = await api('/api/draft/use', {href, variant});
  if (r.ok) { document.getElementById(`draft-${i}`)?.remove(); loadDrafts(); window.location.href = href; }
}

async function passDraft(i, href) {
  const r = await api('/api/draft/pass', {href});
  if (r.ok) { document.getElementById(`draft-${i}`)?.remove(); loadDrafts(); }
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return; } catch(_) {}
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;left:0;top:0;width:1px;height:1px';
  document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, 9999999);
  try { document.execCommand('copy'); } catch(_) {}
  document.body.removeChild(ta);
}

function setStatus(id, msg, cls) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'status' + (cls ? ' ' + cls : '');
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

loadDrafts();
</script>
</body>
</html>"""


# ── Bookmarklet setup page ─────────────────────────────────────────────────────

BOOKMARKLET_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>X Dashboard · Bookmarklet</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f0f2f5; color: #1a1a1a; }
    .container { max-width: 520px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 1.15rem; font-weight: 700; margin: 0 0 16px; }
    .back { font-size: 0.82rem; color: #1d9bf0; text-decoration: none; display: block; margin-bottom: 4px; }
    .card { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .card h2 { font-size: 0.9rem; font-weight: 700; margin: 0 0 10px; }
    p  { font-size: 0.85rem; line-height: 1.6; margin: 0 0 8px; color: #333; }
    ol { font-size: 0.85rem; line-height: 2; padding-left: 22px; margin: 0 0 8px; color: #333; }
    li { margin-bottom: 2px; }
    .warn { background: #fff3cd; border-left: 3px solid #f59e0b; padding: 10px 12px; border-radius: 6px; font-size: 0.82rem; color: #555; line-height: 1.5; margin-bottom: 10px; }
    .code-box {
      background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 10px; font-size: 0.72rem; font-family: monospace;
      word-break: break-all; white-space: pre-wrap; color: #333;
      max-height: 100px; overflow-y: auto; margin: 8px 0; user-select: all;
      -webkit-user-select: all;
    }
    button {
      background: #1d9bf0; color: #fff; border: none; border-radius: 10px;
      padding: 12px 16px; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; width: 100%; margin-top: 6px;
      -webkit-tap-highlight-color: transparent;
    }
    button:active { opacity: .75; }
    button.copied { background: #16a34a; }
    .step-num { display: inline-block; background: #1d9bf0; color: #fff; border-radius: 50%; width: 20px; height: 20px; font-size: 0.72rem; font-weight: 700; text-align: center; line-height: 20px; margin-right: 6px; flex-shrink: 0; }
    .step { display: flex; align-items: flex-start; margin-bottom: 12px; font-size: 0.85rem; line-height: 1.5; color: #333; }
    .step-body { flex: 1; }
    .step-body strong { color: #1a1a1a; }
    img.screenshot { width: 100%; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 6px; }
  </style>
</head>
<body>
<div class="container">
  <a class="back" href="/">← Back to dashboard</a>
  <h1>Phone Bookmarklet Setup</h1>

  <div class="warn">
    ⚠️ <strong>Safari only.</strong> Chrome on iOS blocks javascript: bookmarks entirely — use Safari.
  </div>

  <!-- Step 1: Copy the code -->
  <div class="card">
    <h2>Step 1 — Copy the code</h2>
    <p>Tap the box below to select all, then copy it.</p>
    <div class="code-box" id="bm-code" onclick="selectCode()">{{ bookmarklet_raw }}</div>
    <button id="copy-btn" onclick="copyCode()">Copy Code</button>
  </div>

  <!-- Step 2: Create bookmark -->
  <div class="card">
    <h2>Step 2 — Create the bookmark</h2>
    <div class="step"><span class="step-num">1</span><div class="step-body">In Safari, open <strong>any webpage</strong> (e.g. apple.com).</div></div>
    <div class="step"><span class="step-num">2</span><div class="step-body">Tap the <strong>Share</strong> button (box with arrow) → <strong>Add Bookmark</strong>. Name it <strong>X Thread Scraper</strong> and save.</div></div>
    <div class="step"><span class="step-num">3</span><div class="step-body">Tap the <strong>Bookmarks</strong> icon (open book) → find <strong>X Thread Scraper</strong> → tap <strong>Edit</strong>.</div></div>
    <div class="step"><span class="step-num">4</span><div class="step-body"><strong>Delete the entire URL</strong> in the Address field, then <strong>paste the code</strong> you copied in Step 1. Tap <strong>Done</strong>.</div></div>
  </div>

  <!-- Step 3: Use it -->
  <div class="card">
    <h2>Step 3 — Use it on a thread</h2>
    <div class="step"><span class="step-num">1</span><div class="step-body">Open the x.com thread in Safari.</div></div>
    <div class="step"><span class="step-num">2</span><div class="step-body"><strong>Scroll all the way down</strong> until no more replies load.</div></div>
    <div class="step"><span class="step-num">3</span><div class="step-body">Tap the <strong>Bookmarks</strong> icon → tap <strong>X Thread Scraper</strong>. The page will navigate to a confirmation screen.</div></div>
    <div class="step"><span class="step-num">4</span><div class="step-body">You'll see "Captured! N tweets" — tap <strong>Back to Dashboard</strong>.</div></div>
    <div class="step"><span class="step-num">5</span><div class="step-body">Back in the dashboard, tap <strong>Parse Thread</strong>, then <strong>Generate Drafts</strong>.</div></div>
  </div>

</div>
<script>
function selectCode() {
  const el = document.getElementById('bm-code');
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

async function copyCode() {
  const text = document.getElementById('bm-code').textContent;
  const btn = document.getElementById('copy-btn');
  try {
    await navigator.clipboard.writeText(text);
  } catch(_) {
    selectCode();
    try { document.execCommand('copy'); } catch(e2) {}
  }
  btn.textContent = 'Copied ✓';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = 'Copy Code'; btn.classList.remove('copied'); }, 2000);
}
</script>
</body>
</html>"""


# ── Capture relay page (receives base64 HTML from bookmarklet hash) ────────────

CAPTURE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>Capturing thread…</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 0; background: #f0f2f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .box { background: #fff; border-radius: 14px; padding: 24px; max-width: 340px; width: calc(100% - 32px); text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    h1 { font-size: 1.1rem; margin: 0 0 8px; }
    p  { font-size: 0.85rem; color: #555; margin: 0 0 16px; line-height: 1.5; }
    a  { display: block; background: #1d9bf0; color: #fff; text-decoration: none; border-radius: 10px; padding: 12px 16px; font-size: 0.95rem; font-weight: 600; margin-top: 8px; }
    a.grey { background: #6b7280; }
    .spin { font-size: 1.5rem; animation: s 1s linear infinite; display: inline-block; }
    @keyframes s { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
<div class="box" id="box">
  <div class="spin">⏳</div>
  <h1>Capturing…</h1>
  <p>Reading tweets from the page.</p>
</div>
<script>
(async () => {
  const box = document.getElementById('box');

  function show(icon, title, body, links) {
    box.innerHTML = `<div style="font-size:1.8rem">${icon}</div><h1>${title}</h1><p>${body}</p>${links.map(l=>`<a href="${l.href}" ${l.back?'onclick="history.back();return false"':''}>${l.label}</a>`).join('')}`;
  }

  const hash = location.hash.slice(1);
  if (!hash) {
    show('⚠️', 'No data', 'Navigate here via the bookmarklet — do not open this page directly.', [{href:'/', label:'Back to dashboard'}]);
    return;
  }

  let html;
  try {
    html = decodeURIComponent(escape(atob(hash)));
  } catch(e) {
    show('❌', 'Decode error', String(e), [{href:'/', label:'Back to dashboard'}]);
    return;
  }

  try {
    const res = await fetch('/api/scrape_push', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({html}),
    });
    const data = await res.json();
    if (data.ok) {
      show('✅', 'Captured!', data.message, [
        {href:'/', label:'Back to Dashboard'},
        {href:'#', back:true, label:'Back to X'},
      ]);
    } else {
      show('❌', 'Error', data.message, [{href:'/', label:'Back to dashboard'}]);
    }
  } catch(e) {
    show('❌', 'Network error', String(e), [{href:'/', label:'Back to dashboard'}]);
  }
})();
</script>
</body>
</html>"""


# ── API routes ─────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template_string(DASHBOARD_HTML)


@app.route("/bookmarklet")
def bookmarklet_page():
    # Use request.host so the bookmarklet points to whatever address the browser used —
    # works correctly whether accessed via localhost, LAN IP, or public IP.
    host = request.host  # e.g. "172.236.21.178:5555"
    bm_raw = (
        "javascript:(function(){"
        "var aa=document.querySelectorAll('article[data-testid=\"tweet\"]');"
        "if(!aa.length){alert('No tweets found. Scroll all the way down first, then try again.');return;}"
        "var w=document.createElement('div');"
        "aa.forEach(function(a){w.appendChild(a.cloneNode(true));});"
        "var b64=btoa(unescape(encodeURIComponent(w.outerHTML)));"
        f"window.location.href='http://{host}/capture#'+b64;"
        "})()"
    )
    return render_template_string(BOOKMARKLET_HTML, bookmarklet_raw=bm_raw)


@app.route("/capture")
def capture_page():
    return render_template_string(CAPTURE_HTML)


@app.route("/api/scrape_push", methods=["POST"])
def scrape_push():
    data = request.get_json(silent=True) or {}
    html = data.get("html", "")
    if not html:
        return jsonify(ok=False, message="No HTML received.")

    DATA_DIR.mkdir(exist_ok=True)
    (DATA_DIR / "thread.html").write_text(html, encoding="utf-8")

    from bs4 import BeautifulSoup
    soup  = BeautifulSoup(html, "html.parser")
    count = len(soup.find_all("article", attrs={"data-testid": "tweet"}))
    return jsonify(ok=True, message=f"Saved thread.html — {count} tweet(s) captured.")


@app.route("/api/launch_chrome", methods=["POST"])
def launch_chrome():
    try:
        subprocess.Popen(
            ["open", "-a", "Google Chrome", "--args", f"--remote-debugging-port={CDP_PORT}"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        return jsonify(ok=True, message=f"Chrome launched with --remote-debugging-port={CDP_PORT}. Navigate to the thread, scroll to load all replies, then tap Scrape Open Tab.")
    except Exception as e:
        return jsonify(ok=False, message=str(e))


@app.route("/api/scrape", methods=["POST"])
def scrape():
    try:
        tabs = _req.get(f"http://localhost:{CDP_PORT}/json", timeout=3).json()
    except Exception:
        return jsonify(ok=False, message=f"Chrome not reachable on port {CDP_PORT}. Tap 'Launch Chrome with CDP' first.")

    x_tabs = [t for t in tabs if "x.com" in t.get("url", "")]
    if not x_tabs:
        return jsonify(ok=False, message="No x.com tab found in Chrome.")

    ws_url = x_tabs[0].get("webSocketDebuggerUrl")
    if not ws_url:
        return jsonify(ok=False, message="Tab has no WebSocket debugger URL — try refreshing Chrome.")

    js = (
        "(() => {"
        "  const el = document.querySelector('[aria-label=\"Timeline: Conversation\"]');"
        "  return el ? el.outerHTML : document.body.outerHTML;"
        "})()"
    )
    try:
        ws = websocket.create_connection(ws_url, timeout=10)
        ws.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": {"expression": js, "returnByValue": True}}))
        result = json.loads(ws.recv())
        ws.close()
    except Exception as e:
        return jsonify(ok=False, message=f"CDP WebSocket error: {e}")

    html = result.get("result", {}).get("result", {}).get("value", "")
    if not html:
        return jsonify(ok=False, message="CDP returned empty result. Is the thread fully loaded?")

    DATA_DIR.mkdir(exist_ok=True)
    (DATA_DIR / "thread.html").write_text(html, encoding="utf-8")

    from bs4 import BeautifulSoup
    soup  = BeautifulSoup(html, "html.parser")
    count = len(soup.find_all("article", attrs={"data-testid": "tweet"}))
    msg   = f"Saved thread.html — {count} tweet(s) found."
    if "Timeline: Conversation" not in html:
        msg += " (conversation div not found; captured page body.)"
    return jsonify(ok=True, message=msg)


@app.route("/api/parse", methods=["POST"])
def parse():
    if not (DATA_DIR / "thread.html").exists():
        return jsonify(ok=False, message="thread.html not found — scrape first.")
    result = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "x_parse_thread.py")],
        capture_output=True, text=True, cwd=str(SCRIPT_DIR),
    )
    if result.returncode != 0:
        return jsonify(ok=False, message=result.stderr.strip() or "Parse failed.")
    return jsonify(ok=True, message=result.stdout.strip() or "Parse complete.")


@app.route("/api/draft", methods=["POST"])
def generate_draft():
    result = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "x_draft.py")],
        capture_output=True, text=True, cwd=str(SCRIPT_DIR),
    )
    if result.returncode != 0:
        return jsonify(ok=False, message=result.stderr.strip() or "Draft generation failed.")
    return jsonify(ok=True, message=result.stdout.strip() or "Drafts generated.")


@app.route("/api/drafts")
def get_drafts():
    f = DATA_DIR / "drafts.json"
    if not f.exists():
        return jsonify([])
    return jsonify(json.loads(f.read_text(encoding="utf-8")))


@app.route("/api/draft/use", methods=["POST"])
def draft_use():
    data = request.get_json(silent=True) or {}
    return _update_draft(data.get("href", ""), "sent", data.get("variant", "plain"))


@app.route("/api/draft/pass", methods=["POST"])
def draft_pass():
    data = request.get_json(silent=True) or {}
    return _update_draft(data.get("href", ""), "passed", None)


def _update_draft(href: str, action: str, variant: str | None):
    drafts_f = DATA_DIR / "drafts.json"
    sent_f   = DATA_DIR / "sent.json"

    drafts = json.loads(drafts_f.read_text(encoding="utf-8")) if drafts_f.exists() else []
    sent   = json.loads(sent_f.read_text(encoding="utf-8"))   if sent_f.exists()   else []

    target = next((d for d in drafts if d.get("reply_to_href") == href), None)
    if not target:
        return jsonify(ok=False, message="Draft not found.")

    if action == "sent" and variant:
        key = "draft_text" if variant == "plain" else "draft_text_tailored"
        sent.append({**target, "sent_at": datetime.now(timezone.utc).isoformat(), "sent_text": target.get(key) or target.get("draft_text", "")})
        sent_f.write_text(json.dumps(sent, indent=2, ensure_ascii=False), encoding="utf-8")

    drafts = [d for d in drafts if d.get("reply_to_href") != href]
    drafts_f.write_text(json.dumps(drafts, indent=2, ensure_ascii=False), encoding="utf-8")
    return jsonify(ok=True)


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ip = _local_ip()
    print(f"\nX Thread Dashboard")
    print(f"  Local:   http://localhost:5555")
    print(f"  Network: http://{ip}:5555")
    print(f"\n  Bookmarklet setup: http://{ip}:5555/bookmarklet\n")
    app.run(host="0.0.0.0", port=5555, debug=False)
