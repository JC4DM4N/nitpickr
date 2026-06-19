CREATE TABLE IF NOT EXISTS streaks (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_start     TIMESTAMPTZ  NOT NULL,
    streak_deadline  TIMESTAMPTZ  NOT NULL,
    streak_total     INTEGER      NOT NULL DEFAULT 1,
    is_complete      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_expired       BOOLEAN      NOT NULL DEFAULT FALSE
);
