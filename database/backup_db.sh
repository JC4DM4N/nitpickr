#!/bin/bash
set -e

# Load R2 credentials
source "$(dirname "$0")/../backend/.env"

FILENAME="backup_$(date +%Y%m%d_%H%M%S).sql"
LOCAL_PATH="$(dirname "$0")/backups/$FILENAME"

# Dump
echo "Dumping database..."
docker exec -t $(docker ps -q --filter ancestor=postgres:15) pg_dump -U postgres -d nitpickr > "$LOCAL_PATH"
echo "Saved to $LOCAL_PATH"

# Upload to R2
echo "Uploading to Cloudflare R2..."
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
aws s3 cp "$LOCAL_PATH" \
  "s3://${R2_BUCKET}/backups/$FILENAME" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --region auto

echo "Done: $FILENAME uploaded to R2."
