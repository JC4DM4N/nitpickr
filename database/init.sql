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

-- ── Apps ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apps (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    initials  VARCHAR(4)   NOT NULL,
    color     VARCHAR(7)   NOT NULL,
    url       VARCHAR(255) NOT NULL,
    category  VARCHAR(100) NOT NULL,
    stage     VARCHAR(20)  NOT NULL CHECK (stage IN ('Pre-launch', 'Beta', 'Live')),
    description TEXT       NOT NULL,
    views     INTEGER      NOT NULL DEFAULT 0,
    feedbacks INTEGER      NOT NULL DEFAULT 0,
    credits   INTEGER      NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO apps (name, initials, color, url, category, stage, description, views, feedbacks, credits) VALUES
    ('NoteStack',    'N', '#4f46e5', 'notestack.app',    'Productivity',    'Beta',       'A minimalist note-taking app with nested pages, markdown support, and offline sync. Built for focused thinkers who hate clutter.',                                    1240, 14,  2),
    ('Pricewise',    'P', '#0ea5e9', 'pricewise.io',     'SaaS Tools',      'Pre-launch', 'Pricing page A/B testing for indie SaaS founders. No code required — just drop in a script tag and start testing in minutes.',                                        890,  8,   3),
    ('CalPal',       'C', '#10b981', 'calpal.co',        'Productivity',    'Live',       'Smart scheduling for freelancers. Set your rules, share your link, and let clients book without the back-and-forth emails.',                                           3210, 22,  1),
    ('Shiplog',      'S', '#f59e0b', 'shiplog.dev',      'Developer Tools', 'Beta',       'Changelog and release notes tool for indie developers. Beautiful public pages, email digests, and one-click embeds for your site.',                                    2100, 18,  2),
    ('Folio',        'F', '#ec4899', 'getfolio.io',      'Design',          'Pre-launch', 'Portfolio builder for designers and freelancers. Pick a template, drop in your work, and go live in under five minutes.',                                              670,  5,   3),
    ('Stackwise',    'S', '#8b5cf6', 'stackwise.app',    'Developer Tools', 'Live',       'Tech stack discovery and comparison tool. See what other indie developers are using to build their products, filtered by category.',                                   4500, 31,  1),
    ('Feedr',        'F', '#ef4444', 'feedr.app',        'Mobile',          'Beta',       'RSS reader reimagined for curious people. Digest mode, AI summaries, and a clean reading experience across all your devices.',                                         1580, 11,  2),
    ('Checkout Kit', 'C', '#14b8a6', 'checkoutkit.io',   'E-commerce',      'Live',       'Embeddable checkout components for indie makers selling digital products. Stripe-powered, zero backend required.',                                                     2870, 24,  2)
ON CONFLICT DO NOTHING;
