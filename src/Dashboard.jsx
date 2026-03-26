import { useState, useEffect } from 'react'
import './Dashboard.css'


const CATEGORIES = ['All', 'Productivity', 'SaaS Tools', 'Developer Tools', 'Design', 'Mobile', 'E-commerce']
const STAGES = ['All', 'Pre-launch', 'Beta', 'Live']
const SORTS = [
  { value: 'popular', label: 'Most viewed' },
  { value: 'newest', label: 'Newest first' },
  { value: 'most-feedback', label: 'Most feedback' },
]

/* ── Icons ── */
function IconExplore() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
}
function IconApps() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}
function IconReviews() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
function IconCredits() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3H15"/></svg>
}
function IconSearch() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}

/* ── Nav config ── */
const NAV = [
  { id: 'explore', label: 'Explore', Icon: IconExplore },
  { id: 'my-apps', label: 'My Apps', Icon: IconApps },
  { id: 'reviews', label: 'Reviews', Icon: IconReviews },
  { id: 'credits', label: 'Credits', Icon: IconCredits },
]

/* ── Root ── */
export default function Dashboard({ user, onLogout }) {
  const [page, setPage] = useState('explore')

  return (
    <div className="dashboard">
      <Sidebar page={page} setPage={setPage} user={user} onLogout={onLogout} />
      <main className="dash-main">
        {page === 'explore' && <ExplorePage />}
        {page === 'reviews' && <ReviewsPage />}
        {page !== 'explore' && page !== 'reviews' && <ComingSoon label={NAV.find(n => n.id === page)?.label} />}
      </main>
    </div>
  )
}

/* ── Sidebar ── */
function Sidebar({ page, setPage, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">◎</span>
          <span className="sidebar-logo-text">FeedbackPal</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`sidebar-item${page === id ? ' active' : ''}`}
              onClick={() => setPage(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-credits-widget">
          <div className="credits-widget-top">
            <span className="credits-widget-label">Your Credits</span>
            <span className="credits-widget-icon">⚡</span>
          </div>
          <div className="credits-widget-value">3</div>
          <p className="credits-widget-hint">Review an app to earn more</p>
        </div>
      </div>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <div>
            <div className="sidebar-name">{user?.username}</div>
            <div className="sidebar-handle">{user?.email}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  )
}

/* ── Explore page ── */
function ExplorePage() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('All')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('popular')
  const [reviewApp, setReviewApp] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      fetch('http://localhost:8000/apps/').then(r => r.json()),
      fetch('http://localhost:8000/reviews/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(r => r.json()),
    ])
      .then(([allApps, myReviews]) => {
        const reviewedIds = new Set(myReviews.map(r => r.app_id))
        setApps(allApps.filter(a => !reviewedIds.has(a.id)))
        setLoading(false)
      })
      .catch(() => { setError('Failed to load apps'); setLoading(false) })
  }, [])

  const filtered = apps
    .filter(app =>
      (stage === 'All' || app.stage === stage) &&
      (category === 'All' || app.category === category) &&
      (search === '' ||
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.description.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sort === 'popular') return b.views - a.views
      if (sort === 'newest') return b.id - a.id
      if (sort === 'most-feedback') return b.feedbacks - a.feedbacks
      return 0
    })

  return (
    <>
    {reviewApp && (
      <ReviewModal
        app={reviewApp}
        onClose={() => setReviewApp(null)}
        onReviewCreated={appId => {
          setApps(prev => prev.filter(a => a.id !== appId))
          setReviewApp(null)
        }}
      />
    )}
    <div className="explore">
      <div className="explore-hero">
        <h1 className="explore-title">Discover Apps to Review</h1>
        <p className="explore-sub">Give honest feedback. Earn credits. Get better feedback on your own apps — completely free.</p>
        <div className="explore-search-row">
          <div className="explore-search">
            <IconSearch />
            <input
              type="text"
              placeholder='"productivity app" or "pre-launch SaaS"'
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-submit-app">+ Submit your app</button>
        </div>
      </div>

      <div className="explore-body">
        <aside className="explore-filters">
          <p className="filters-heading">FILTERS</p>

          <div className="filter-group">
            <label className="filter-label">Category</label>
            <select
              className="filter-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Stage</label>
            {STAGES.map(s => (
              <label key={s} className="filter-radio">
                <input
                  type="radio"
                  name="stage"
                  checked={stage === s}
                  onChange={() => setStage(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </aside>

        <div className="explore-results">
          <div className="results-bar">
            <span className="results-count">{filtered.length} apps found</span>
            <select
              className="sort-select"
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="app-grid">
            {loading && <p className="no-results">Loading apps…</p>}
            {error && <p className="no-results">{error}</p>}
            {!loading && !error && filtered.map(app => (
              <AppCard key={app.id} app={app} onReview={() => setReviewApp(app)} />
            ))}
            {!loading && !error && filtered.length === 0 && (
              <p className="no-results">No apps match your filters.</p>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

/* ── App card ── */
const STAGE_STYLES = {
  'Pre-launch': { bg: '#fef3c7', color: '#92400e' },
  'Beta':       { bg: '#dbeafe', color: '#1e40af' },
  'Live':       { bg: '#d1fae5', color: '#065f46' },
}

function AppCard({ app, onReview }) {
  const stage = STAGE_STYLES[app.stage]
  return (
    <div className="app-card">
      <div className="app-card-header">
        <div className="app-icon" style={{ background: app.color }}>{app.initials}</div>
        <div className="app-name-block">
          <div className="app-name">{app.name}</div>
          <div className="app-url">{app.url}</div>
        </div>
        <span className="app-category-tag">{app.category}</span>
      </div>
      <p className="app-desc">{app.description}</p>
      <div className="app-card-footer">
        <div className="app-footer-stat">
          <span className="app-footer-label">STAGE</span>
          <span className="app-stage-badge" style={{ background: stage.bg, color: stage.color }}>{app.stage}</span>
        </div>
        <div className="app-footer-stat">
          <span className="app-footer-label">CREDITS</span>
          <span className="app-footer-value">{app.credits}</span>
        </div>
        <div className="app-footer-stat">
          <span className="app-footer-label">FEEDBACK</span>
          <span className="app-footer-value">{app.feedbacks}</span>
        </div>
        <button className="app-review-btn" onClick={onReview}>Leave feedback →</button>
      </div>
    </div>
  )
}

/* ── Review modal ── */
function ReviewModal({ app, onClose, onReviewCreated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:8000/reviews/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ app_id: app.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Failed to start review')
        return
      }
      onReviewCreated(app.id)
    } catch {
      setError('Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <div className="app-icon" style={{ background: app.color }}>{app.initials}</div>
          <div>
            <div className="modal-title">Start a review for <strong>{app.name}</strong></div>
            <div className="modal-url">{app.url}</div>
          </div>
        </div>
        <p className="modal-section-label">WHAT THE DEVELOPER IS LOOKING FOR</p>
        <textarea className="modal-request" value={app.request} readOnly />
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn-start" onClick={handleStart} disabled={loading}>
            {loading ? 'Starting…' : 'Start review →'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Reviews page ── */
const STAGE_STYLES_REVIEWS = {
  'Pre-launch': { bg: '#fef3c7', color: '#92400e' },
  'Beta':       { bg: '#dbeafe', color: '#1e40af' },
  'Live':       { bg: '#d1fae5', color: '#065f46' },
}

function ReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('http://localhost:8000/reviews/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setReviews(data); setLoading(false) })
      .catch(() => { setError('Failed to load reviews'); setLoading(false) })
  }, [])

  return (
    <div className="reviews-page">
      <div className="reviews-header">
        <h1 className="reviews-title">My Reviews</h1>
        <p className="reviews-sub">Apps you have started reviewing.</p>
      </div>
      <div className="reviews-body">
        {loading && <p className="reviews-empty">Loading…</p>}
        {error && <p className="reviews-empty">{error}</p>}
        {!loading && !error && reviews.length === 0 && (
          <p className="reviews-empty">No reviews yet. Head to Explore to get started.</p>
        )}
        {!loading && !error && reviews.length > 0 && (
          <table className="reviews-table">
            <thead>
              <tr>
                <th>App</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="reviews-app-cell">
                      <div className="reviews-app-icon" style={{ background: r.app_color }}>{r.app_initials}</div>
                      <div>
                        <div className="reviews-app-name">{r.app_name}</div>
                        <div className="reviews-app-url">{r.app_url}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="app-stage-badge" style={STAGE_STYLES_REVIEWS[r.app_stage]}>
                      {r.app_stage}
                    </span>
                  </td>
                  <td>
                    <span className={`review-status-badge ${r.is_complete ? 'complete' : 'in-progress'}`}>
                      {r.is_complete ? 'Complete' : 'In progress'}
                    </span>
                  </td>
                  <td className="reviews-date">
                    {new Date(r.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ── Coming soon placeholder ── */
function ComingSoon({ label }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-icon">🚧</div>
      <h2>{label}</h2>
      <p>This page is coming soon.</p>
    </div>
  )
}
