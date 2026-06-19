require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = 3002;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;

app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
}));

function requireAuth(req, res, next) {
  if (req.session.authed) return next();
  res.redirect('/login');
}

app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'login.html')));

app.post('/login', (req, res) => {
  if (req.body.password === DASHBOARD_PASSWORD) {
    req.session.authed = true;
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

const pool = new Pool({
  host: process.env.DB_HOST || '172.236.21.178',
  port: process.env.DB_PORT || 5442,
  database: process.env.DB_NAME || 'nitpickr',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: false,
});

// Serve login page assets (the login.html itself is handled by the route above)
// Protect index.html and all API routes
app.get('/', requireAuth, (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use('/api', requireAuth);

app.get('/api/users-per-day', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        DATE(created_at) AS day,
        COUNT(*) AS count
      FROM users
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reviews-completed-per-day', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        DATE(created_date) AS day,
        COUNT(*) AS count
      FROM reviews
      WHERE is_complete = TRUE
      GROUP BY DATE(created_date)
      ORDER BY day ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/active-reviews', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        a.name AS app_name,
        u_reviewer.username AS reviewer,
        u_owner.username AS app_owner,
        r.created_date,
        r.reviewer_deadline,
        r.owner_deadline,
        r.is_submitted,
        r.review_requested,
        r.feedback,
        r.owner_message,
        a.request AS app_request,
        COALESCE(
          (SELECT json_agg(json_build_object('sender', u_s.username, 'body', m.body, 'created_at', m.created_at) ORDER BY m.created_at ASC)
           FROM messages m JOIN users u_s ON m.sender_id = u_s.id WHERE m.review_id = r.id),
          '[]'::json
        ) AS messages
      FROM reviews r
      JOIN apps a ON r.app_id = a.id
      JOIN users u_reviewer ON r.reviewer_id = u_reviewer.id
      JOIN users u_owner ON a.owner_id = u_owner.id
      WHERE r.is_complete = FALSE AND r.is_rejected = FALSE AND r.is_expired = FALSE
      ORDER BY r.created_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/completed-reviews', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        a.name AS app_name,
        u_reviewer.username AS reviewer,
        u_owner.username AS app_owner,
        r.created_date,
        r.owner_deadline,
        r.reviewer_deadline,
        r.review_requested,
        r.feedback,
        r.owner_message,
        a.request AS app_request,
        COALESCE(
          (SELECT json_agg(json_build_object('sender', u_s.username, 'body', m.body, 'created_at', m.created_at) ORDER BY m.created_at ASC)
           FROM messages m JOIN users u_s ON m.sender_id = u_s.id WHERE m.review_id = r.id),
          '[]'::json
        ) AS messages
      FROM reviews r
      JOIN apps a ON r.app_id = a.id
      JOIN users u_reviewer ON r.reviewer_id = u_reviewer.id
      JOIN users u_owner ON a.owner_id = u_owner.id
      WHERE r.is_complete = TRUE
      ORDER BY r.created_date DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/failed-reviews', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        a.name AS app_name,
        u_reviewer.username AS reviewer,
        u_owner.username AS app_owner,
        r.created_date,
        r.is_rejected,
        r.is_expired,
        r.feedback,
        r.owner_message,
        a.request AS app_request,
        COALESCE(
          (SELECT json_agg(json_build_object('sender', u_s.username, 'body', m.body, 'created_at', m.created_at) ORDER BY m.created_at ASC)
           FROM messages m JOIN users u_s ON m.sender_id = u_s.id WHERE m.review_id = r.id),
          '[]'::json
        ) AS messages
      FROM reviews r
      JOIN apps a ON r.app_id = a.id
      JOIN users u_reviewer ON r.reviewer_id = u_reviewer.id
      JOIN users u_owner ON a.owner_id = u_owner.id
      WHERE r.is_rejected = TRUE OR r.is_expired = TRUE
      ORDER BY r.created_date DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/apps', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id,
        a.name AS app_name,
        u.username AS owner,
        COUNT(DISTINCT r_recv.id) AS reviews_received,
        COUNT(DISTINCT r_given.id) AS reviews_given
      FROM apps a
      JOIN users u ON a.owner_id = u.id
      LEFT JOIN reviews r_recv ON r_recv.app_id = a.id
      LEFT JOIN reviews r_given ON r_given.reviewer_id = a.owner_id
      GROUP BY a.id, a.name, u.username
      ORDER BY a.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.created_at,
        u.credits,
        u.is_banned,
        COUNT(DISTINCT a.id) AS apps_count,
        COUNT(DISTINCT r_given.id) AS reviews_given,
        COUNT(DISTINCT r_recv.id) AS reviews_received,
        COALESCE(
          (SELECT json_agg(json_build_object('id', a2.id, 'name', a2.name) ORDER BY a2.id DESC)
           FROM apps a2 WHERE a2.owner_id = u.id),
          '[]'::json
        ) AS apps
      FROM users u
      LEFT JOIN apps a ON a.owner_id = u.id
      LEFT JOIN reviews r_given ON r_given.reviewer_id = u.id AND r_given.is_complete = TRUE
      LEFT JOIN reviews r_recv ON r_recv.app_id = a.id AND r_recv.is_complete = TRUE
      GROUP BY u.id, u.username, u.created_at, u.credits, u.is_banned
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/completed-reviews-count', async (_req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) AS total FROM reviews WHERE is_complete = TRUE');
    res.json({ total: parseInt(result.rows[0].total) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/app-count', async (_req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) AS total FROM apps');
    res.json({ total: result.rows[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/credits-in-circulation', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT SUM(credits) + SUM(escrow_credits) AS total
      FROM users
      WHERE username NOT IN ('JamesC', 'jc')
    `);
    res.json({ total: result.rows[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/banned-users', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.created_at,
        u.credits,
        COUNT(DISTINCT a.id) AS apps_count,
        COUNT(DISTINCT r_given.id) AS reviews_given,
        COUNT(DISTINCT r_recv.id) AS reviews_received,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', r.id,
            'app_name', a2.name,
            'app_owner', u_owner.username,
            'feedback', r.feedback,
            'created_date', r.created_date
          ) ORDER BY r.created_date DESC)
          FROM reviews r
          JOIN apps a2 ON r.app_id = a2.id
          JOIN users u_owner ON a2.owner_id = u_owner.id
          WHERE r.reviewer_id = u.id AND r.is_complete = TRUE),
          '[]'::json
        ) AS reviews
      FROM users u
      LEFT JOIN apps a ON a.owner_id = u.id
      LEFT JOIN reviews r_given ON r_given.reviewer_id = u.id AND r_given.is_complete = TRUE
      LEFT JOIN reviews r_recv ON r_recv.app_id = a.id AND r_recv.is_complete = TRUE
      WHERE u.is_banned = TRUE
      GROUP BY u.id, u.username, u.created_at, u.credits
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/credit-holders', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.credits,
        u.escrow_credits,
        COUNT(DISTINCT r_given.id) AS reviews_given,
        COUNT(DISTINCT r_recv.id) AS reviews_received,
        COALESCE(
          (SELECT json_agg(json_build_object('id', a2.id, 'name', a2.name) ORDER BY a2.id DESC)
           FROM apps a2 WHERE a2.owner_id = u.id),
          '[]'::json
        ) AS apps
      FROM users u
      LEFT JOIN apps a ON a.owner_id = u.id
      LEFT JOIN reviews r_given ON r_given.reviewer_id = u.id AND r_given.is_complete = TRUE
      LEFT JOIN reviews r_recv ON r_recv.app_id = a.id AND r_recv.is_complete = TRUE
      WHERE u.credits > 0 OR u.escrow_credits > 0
      GROUP BY u.id, u.username, u.credits, u.escrow_credits
      ORDER BY (u.credits + u.escrow_credits) DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/unverified-users', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, created_at
      FROM users
      WHERE email_verified = FALSE
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/llm-rejections', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        a.name AS app_name,
        u_reviewer.username AS reviewer,
        u_owner.username AS owner,
        r.created_at,
        r.feedback,
        r.app_request
      FROM llm_judge_rejections r
      JOIN apps a ON r.app_id = a.id
      JOIN users u_reviewer ON r.reviewer_id = u_reviewer.id
      JOIN users u_owner ON r.owner_id = u_owner.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/onboarding', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ob.user_id,
        u.username,
        u.created_at,
        ob.step_1_complete,
        ob.step_2_complete,
        ob.step_3_complete,
        ob.onboarding_bonus_credit_awarded
      FROM onboarding ob
      JOIN users u ON ob.user_id = u.id
      ORDER BY ob.user_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/streaks', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.username,
        s.streak_start,
        s.streak_deadline,
        s.streak_total,
        s.is_complete,
        s.is_expired
      FROM streaks s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.streak_start DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/feedback-exchanges', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        fe.id,
        fe.status,
        fe.created_at,
        fe.expires_at,
        fe.message,
        u_requester.username AS requester,
        u_requestee.username AS requestee,
        a_requester.name     AS requester_app,
        a_requestee.name     AS requestee_app
      FROM feedback_exchanges fe
      JOIN users u_requester ON fe.requester_id = u_requester.id
      JOIN users u_requestee ON fe.requestee_id = u_requestee.id
      JOIN apps  a_requester ON fe.requester_app_id = a_requester.id
      LEFT JOIN apps a_requestee ON fe.requestee_app_id = a_requestee.id
      ORDER BY fe.created_at DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
});
