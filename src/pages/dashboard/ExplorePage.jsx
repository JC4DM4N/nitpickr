import { useState, useEffect } from 'react'
import './ExplorePage.css'
import { STAGE_STYLES } from '../../constants'

const CATEGORIES = ['All', 'Productivity', 'SaaS Tools', 'Developer Tools', 'Design', 'Mobile', 'E-commerce']
const STAGES = ['All', 'Pre-launch', 'Beta', 'Live']
const SORTS = [
  { value: 'popular', label: 'Most viewed' },
  { value: 'newest', label: 'Newest first' },
  { value: 'most-feedback', label: 'Most feedback' },
]

function IconSearch() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}

export default function ExplorePage() {
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
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const reviewedIds = new Set(myReviews.map(r => r.app_id))
        setApps(allApps.filter(a => a.owner_id !== user.id && !reviewedIds.has(a.id)))
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
      if (sort === 'popular') return b.approved_count - a.approved_count
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
          <span className="app-stage-badge" style={stage}>{app.stage}</span>
        </div>
        <div className="app-footer-stat">
          <span className="app-footer-label">CREDITS</span>
          <span className="app-footer-value">{app.credits}</span>
        </div>
        <div className="app-footer-stat">
          <span className="app-footer-label">FEEDBACK</span>
          <span className="app-footer-value">{app.approved_count}</span>
        </div>
        <button className="app-review-btn" onClick={onReview}>Leave feedback →</button>
      </div>
    </div>
  )
}

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
