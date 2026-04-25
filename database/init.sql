-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,          -- bcrypt hash, never plain text
    username   VARCHAR(50)  UNIQUE NOT NULL
                   CHECK (username ~ '^[A-Za-z0-9_]+$'),  -- single word, no spaces
    credits          INTEGER     NOT NULL DEFAULT 1,
    escrow_credits   INTEGER     NOT NULL DEFAULT 0,
    twitter_username VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed data ───────────────────────────────────────────────────────────────
-- Plain-text password for all seed users: "password123"
INSERT INTO users (email, password, username) VALUES
    ('cadmcorp@aol.com', '$2b$12$VUhFzGSdd2uzlAXt60B25Oc0kRadUdx3xE4Wl/V0f/DnYktm.BNLK', 'JamesC')
ON CONFLICT (email) DO NOTHING;

-- ── Apps ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apps (
    id        SERIAL PRIMARY KEY,
    owner_id  INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name      VARCHAR(100) NOT NULL,
    initials  VARCHAR(4)   NOT NULL,
    color     VARCHAR(7)   NOT NULL,
    url       VARCHAR(255) NOT NULL,
    category  VARCHAR(100) NOT NULL,
    stage     VARCHAR(20)  NOT NULL CHECK (stage IN ('Pre-launch', 'Beta', 'Live')),
    description TEXT       NOT NULL,
    request     TEXT       NOT NULL,
    credits         INTEGER      NOT NULL DEFAULT 1,
    is_hidden       BOOLEAN      NOT NULL DEFAULT FALSE,
    is_multi_review BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Feedback exchanges ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback_exchanges (
    id                   SERIAL PRIMARY KEY,
    requester_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requestee_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_app_id     INTEGER NOT NULL REFERENCES apps(id)  ON DELETE CASCADE,
    requestee_app_id     INTEGER          REFERENCES apps(id)  ON DELETE SET NULL,
    review_of_requester  INTEGER,          -- FK to reviews added after reviews table
    review_of_requestee  INTEGER,          -- FK to reviews added after reviews table
    status               VARCHAR(20) NOT NULL DEFAULT 'pending',
    message              TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at           TIMESTAMPTZ NOT NULL
);

-- ── Reviews ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id            SERIAL PRIMARY KEY,
    app_id        INTEGER     NOT NULL REFERENCES apps(id)  ON DELETE CASCADE,
    reviewer_id   INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_submitted       BOOLEAN     NOT NULL DEFAULT FALSE,
    is_complete        BOOLEAN     NOT NULL DEFAULT FALSE,
    is_rejected        BOOLEAN     NOT NULL DEFAULT FALSE,
    is_expired         BOOLEAN     NOT NULL DEFAULT FALSE,
    review_requested   BOOLEAN     NOT NULL DEFAULT FALSE,
    is_exchange        BOOLEAN     NOT NULL DEFAULT FALSE,
    exchange_id        INTEGER     REFERENCES feedback_exchanges(id) ON DELETE SET NULL,
    feedback      TEXT,
    owner_message TEXT,
    created_date       TIMESTAMPTZ DEFAULT NOW(),
    reviewer_deadline  TIMESTAMPTZ,
    owner_deadline     TIMESTAMPTZ,
    tested_platform    VARCHAR(10),
    test_duration      TEXT,
    created_account    BOOLEAN
);

-- Add deferred FKs from feedback_exchanges back to reviews
ALTER TABLE feedback_exchanges
    ADD CONSTRAINT fk_ror FOREIGN KEY (review_of_requester) REFERENCES reviews(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_rod FOREIGN KEY (review_of_requestee) REFERENCES reviews(id) ON DELETE SET NULL;

-- ── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50)  NOT NULL,
    message     TEXT         NOT NULL,
    app_id      INTEGER      REFERENCES apps(id)    ON DELETE CASCADE,
    review_id   INTEGER      REFERENCES reviews(id) ON DELETE CASCADE,
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id          SERIAL PRIMARY KEY,
    review_id   INTEGER      NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    sender_id   INTEGER      NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    body        TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Review screenshots ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_screenshots (
    id          SERIAL PRIMARY KEY,
    review_id   INTEGER      NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    filename    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);
