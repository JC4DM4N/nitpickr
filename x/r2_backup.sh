#!/usr/bin/env bash
# Backup x/data/ → R2 bucket: x, folder: data
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/.env"

aws s3 sync "$DIR/data/" "s3://x/data/" \
  --endpoint-url "https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --region auto \
  --delete \
  --no-progress \
  --exclude "*.DS_Store" \
  --exclude "twitter-*/**" \
  2>&1

echo "Backup complete → s3://x/data/"
