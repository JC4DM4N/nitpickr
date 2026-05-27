#!/usr/bin/env bash
# Sync x/data/ ← R2 bucket: x, folder: data
set -eo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/.env"

for var in CF_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do
  [ -z "${!var:-}" ] && { echo "Error: $var not set in .env"; exit 1; }
done

AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
aws s3 sync "s3://x/data/" "$DIR/data/" \
  --endpoint-url "https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --region auto \
  --no-progress

echo "Sync complete ← s3://x/data/"
