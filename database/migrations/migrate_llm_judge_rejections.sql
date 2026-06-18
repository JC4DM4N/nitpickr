CREATE TABLE IF NOT EXISTS llm_judge_rejections (
    id          SERIAL PRIMARY KEY,
    review_id   INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    app_id      INTEGER NOT NULL REFERENCES apps(id)    ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    owner_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    feedback    TEXT    NOT NULL,
    app_request TEXT    NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
