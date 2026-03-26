#!/bin/bash
docker compose -f "$(dirname "$0")/../docker-compose.yml" exec db psql -U postgres feedbackpal
