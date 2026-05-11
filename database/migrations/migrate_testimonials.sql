-- Add testimonials table for NitPickr-verified embed badges
CREATE TABLE IF NOT EXISTS testimonials (
    id          SERIAL PRIMARY KEY,
    review_id   INTEGER      NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    app_id      INTEGER      NOT NULL REFERENCES apps(id)    ON DELETE CASCADE,
    owner_id    INTEGER      NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    quote_text  TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);
