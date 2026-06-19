CREATE TABLE IF NOT EXISTS onboarding (
    id                              SERIAL PRIMARY KEY,
    user_id                         INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    step_1_complete                 BOOLEAN  NOT NULL DEFAULT FALSE,
    step_2_complete                 BOOLEAN  NOT NULL DEFAULT FALSE,
    step_3_complete                 BOOLEAN  NOT NULL DEFAULT FALSE,
    onboarding_bonus_credit_awarded BOOLEAN  NOT NULL DEFAULT FALSE
);

-- Seed existing users who have already completed steps.
-- onboarding_bonus_credit_awarded is derived entirely from the computed steps
-- (not copied from users.onboarding_bonus_credit_awarded) to avoid awarding
-- the bonus to anyone who doesn't genuinely have all three steps complete.
INSERT INTO onboarding (user_id, step_1_complete, step_2_complete, step_3_complete, onboarding_bonus_credit_awarded)
SELECT
    u.id,
    (SELECT COUNT(*) FROM reviews r
     WHERE r.reviewer_id = u.id AND r.is_submitted = TRUE AND r.is_rejected = FALSE AND r.is_expired = FALSE) >= 1 AS step_1_complete,
    (SELECT COUNT(*) FROM apps a WHERE a.owner_id = u.id) >= 1 AS step_2_complete,
    (SELECT COUNT(*) FROM reviews r
     WHERE r.reviewer_id = u.id AND r.is_submitted = TRUE AND r.is_rejected = FALSE AND r.is_expired = FALSE) >= 2 AS step_3_complete,
    (
        (SELECT COUNT(*) FROM reviews r
         WHERE r.reviewer_id = u.id AND r.is_submitted = TRUE AND r.is_rejected = FALSE AND r.is_expired = FALSE) >= 1
        AND (SELECT COUNT(*) FROM apps a WHERE a.owner_id = u.id) >= 1
        AND (SELECT COUNT(*) FROM reviews r
             WHERE r.reviewer_id = u.id AND r.is_submitted = TRUE AND r.is_rejected = FALSE AND r.is_expired = FALSE) >= 2
    ) AS onboarding_bonus_credit_awarded
FROM users u
ON CONFLICT (user_id) DO NOTHING;
