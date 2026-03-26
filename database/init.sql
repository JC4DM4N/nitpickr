-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,          -- bcrypt hash, never plain text
    username   VARCHAR(50)  UNIQUE NOT NULL
                   CHECK (username ~ '^[A-Za-z0-9_]+$'),  -- single word, no spaces
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed data ───────────────────────────────────────────────────────────────
-- Plain-text password for all seed users: "password123"
INSERT INTO users (email, password, username) VALUES
    ('cadmcorp@aol.com', '$2b$12$VUhFzGSdd2uzlAXt60B25Oc0kRadUdx3xE4Wl/V0f/DnYktm.BNLK', 'JamesC')
ON CONFLICT (email) DO NOTHING;
