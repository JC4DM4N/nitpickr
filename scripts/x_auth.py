#!/usr/bin/env python3
"""
One-time OAuth 2.0 setup — run this before x.py.

Before running:
  1. In the X developer portal, enable OAuth 2.0 on your app
  2. Add  http://localhost  as a callback URI
  3. Enable scopes: bookmark.read, tweet.read, users.read, offline.access

Then:
    python x_auth.py
"""

import json
import os
import time
import webbrowser
from pathlib import Path

import tweepy
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

TOKEN_FILE = Path(__file__).parent / ".token.json"
REDIRECT_URI = "http://localhost"
SCOPES = ["bookmark.read", "tweet.read", "users.read", "offline.access"]


def main() -> None:
    client_id = os.environ.get("X_CLIENT_ID") or input("X_CLIENT_ID: ").strip()
    client_secret = os.environ.get("X_CLIENT_SECRET") or None

    handler = tweepy.OAuth2UserHandler(
        client_id=client_id,
        redirect_uri=REDIRECT_URI,
        scope=SCOPES,
        client_secret=client_secret,
    )

    url = handler.get_authorization_url()
    print(f"\nOpening browser to authorise...")
    print(f"If it doesn't open automatically, visit:\n{url}\n")
    webbrowser.open(url)

    print("After clicking Authorise, your browser will redirect to http://localhost/...")
    print("The page won't load — that's fine. Copy the full URL from the address bar.\n")
    response_url = input("Paste the redirect URL here: ").strip()

    token = handler.fetch_token(response_url)

    token_data = {
        "access_token": token["access_token"],
        "refresh_token": token.get("refresh_token"),
        "expires_at": time.time() + token.get("expires_in", 7200),
    }
    TOKEN_FILE.write_text(json.dumps(token_data, indent=2))
    print(f"\nSaved to {TOKEN_FILE}. You can now run x.py.")


if __name__ == "__main__":
    main()
