-- Create exchanges table first (reviews.exchange_id references it)
CREATE TABLE IF NOT EXISTS feedback_exchanges (
    id                   SERIAL PRIMARY KEY,
    requester_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requestee_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_app_id     INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    requestee_app_id     INTEGER REFERENCES apps(id) ON DELETE SET NULL,
    review_of_requester  INTEGER REFERENCES reviews(id) ON DELETE SET NULL,
    review_of_requestee  INTEGER REFERENCES reviews(id) ON DELETE SET NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'pending',
    message              TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at           TIMESTAMPTZ NOT NULL
);

-- Add exchange columns to reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_exchange BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS exchange_id INTEGER REFERENCES feedback_exchanges(id) ON DELETE SET NULL;
