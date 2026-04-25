-- Add messages table for conversational reviews
CREATE TABLE IF NOT EXISTS messages (
    id          SERIAL PRIMARY KEY,
    review_id   INTEGER      NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    sender_id   INTEGER      NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    body        TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);
