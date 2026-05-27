#!/usr/bin/env bash
# Sync x/data/ ← R2 bucket: x, folder: data
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/.env"

aws s3 sync "s3://x/data/" "$DIR/data/" \
  --endpoint-url "https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --region auto \
  --no-progress \
  2>&1

echo "Sync complete ← s3://x/data/"
