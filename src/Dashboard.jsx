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
        {page !== 'explore' && <ComingSoon label={NAV.find(n => n.id === page)?.label} />}
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

  useEffect(() => {
    fetch('http://localhost:8000/apps/')
      .then(r => r.json())
      .then(data => { setApps(data); setLoading(false) })
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
            {!loading && !error && filtered.map(app => <AppCard key={app.id} app={app} />)}
            {!loading && !error && filtered.length === 0 && (
              <p className="no-results">No apps match your filters.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── App card ── */
const STAGE_STYLES = {
  'Pre-launch': { bg: '#fef3c7', color: '#92400e' },
  'Beta':       { bg: '#dbeafe', color: '#1e40af' },
  'Live':       { bg: '#d1fae5', color: '#065f46' },
}

function AppCard({ app }) {
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
        <button className="app-review-btn">Leave feedback →</button>
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
