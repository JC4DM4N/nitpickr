-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,          -- bcrypt hash, never plain text
    username   VARCHAR(50)  UNIQUE NOT NULL
                   CHECK (username ~ '^[A-Za-z0-9_]+$'),  -- single word, no spaces
    credits         INTEGER NOT NULL DEFAULT 1,
    escrow_credits  INTEGER NOT NULL DEFAULT 0,
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
    credits   INTEGER      NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSERT INTO apps (owner_id, name, initials, color, url, category, stage, description, request, credits) VALUES
--     (1, 'NoteStack',    'N', '#4f46e5', 'notestack.app',    'Productivity',    'Beta',       'A minimalist note-taking app with nested pages, markdown support, and offline sync. Built for focused thinkers who hate clutter.',                                    'I''d love feedback on the onboarding flow — does it clearly explain the nested pages concept? Also curious whether the offline sync feels reliable or if there are any confusing moments around sync status.',           1),
--     (1, 'Pricewise',    'P', '#0ea5e9', 'pricewise.io',     'SaaS Tools',      'Pre-launch', 'Pricing page A/B testing for indie SaaS founders. No code required — just drop in a script tag and start testing in minutes.',                                        'Looking for feedback on the landing page clarity — does the value proposition make sense immediately? Does the setup flow feel simple enough for a non-technical founder?',                                              1),
--     (1, 'CalPal',       'C', '#10b981', 'calpal.co',        'Productivity',    'Live',       'Smart scheduling for freelancers. Set your rules, share your link, and let clients book without the back-and-forth emails.',                                           'Please focus on the booking page experience — is it clear what''s being booked and when? Also any thoughts on mobile usability would be really helpful.',                                                                1),
--     (1, 'Shiplog',      'S', '#f59e0b', 'shiplog.dev',      'Developer Tools', 'Beta',       'Changelog and release notes tool for indie developers. Beautiful public pages, email digests, and one-click embeds for your site.',                                    'Keen to hear whether the public changelog page design feels professional enough to share with customers. Does the email digest format feel readable? Any friction in the embed setup?',                                   1),
--     (2, 'Folio',        'F', '#ec4899', 'getfolio.io',      'Design',          'Pre-launch', 'Portfolio builder for designers and freelancers. Pick a template, drop in your work, and go live in under five minutes.',                                              'Does the template selection feel intuitive? I want to know if the five-minute promise feels realistic after going through the setup. Any confusing steps would be great to know about.',                                 1),
--     (2, 'Stackwise',    'S', '#8b5cf6', 'stackwise.app',    'Developer Tools', 'Live',       'Tech stack discovery and comparison tool. See what other indie developers are using to build their products, filtered by category.',                                   'Mainly looking for UX feedback on the filtering and search — does it feel fast and useful? Are the category labels intuitive? Would love to know if anything feels missing from the stack profiles.',                    1),
--     (2, 'Feedr',        'F', '#ef4444', 'feedr.app',        'Mobile',          'Beta',       'RSS reader reimagined for curious people. Digest mode, AI summaries, and a clean reading experience across all your devices.',                                         'Feedback on the digest mode would be most valuable — does the AI summary feel accurate and useful? Is the reading experience comfortable for longer sessions? Any issues on smaller screen sizes?',                      1),
--     (2, 'Checkout Kit', 'C', '#14b8a6', 'checkoutkit.io',   'E-commerce',      'Live',       'Embeddable checkout components for indie makers selling digital products. Stripe-powered, zero backend required.',                                                     'Please try the checkout flow and let me know if anything feels untrustworthy or confusing — especially around payment input. Does it feel polished enough to put in front of real customers?',                           1)
-- ON CONFLICT DO NOTHING;

-- ── Reviews ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id            SERIAL PRIMARY KEY,
    app_id        INTEGER     NOT NULL REFERENCES apps(id)  ON DELETE CASCADE,
    reviewer_id   INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_submitted       BOOLEAN     NOT NULL DEFAULT FALSE,
    is_complete        BOOLEAN     NOT NULL DEFAULT FALSE,
    is_rejected        BOOLEAN     NOT NULL DEFAULT FALSE,
    review_requested   BOOLEAN     NOT NULL DEFAULT FALSE,
    feedback      TEXT,
    owner_message TEXT,
    created_date  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Review screenshots ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_screenshots (
    id          SERIAL PRIMARY KEY,
    review_id   INTEGER      NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    filename    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);
