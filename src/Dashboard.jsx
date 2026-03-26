import { useState } from 'react'
import './Dashboard.css'

/* ── Placeholder data ── */
const APPS = [
  {
    id: 1,
    name: 'NoteStack',
    initials: 'N',
    color: '#4f46e5',
    url: 'notestack.app',
    category: 'Productivity',
    stage: 'Beta',
    desc: 'A minimalist note-taking app with nested pages, markdown support, and offline sync. Built for focused thinkers who hate clutter.',
    views: 1240,
    feedbacks: 14,
    credits: 2,
  },
  {
    id: 2,
    name: 'Pricewise',
    initials: 'P',
    color: '#0ea5e9',
    url: 'pricewise.io',
    category: 'SaaS Tools',
    stage: 'Pre-launch',
    desc: 'Pricing page A/B testing for indie SaaS founders. No code required — just drop in a script tag and start testing in minutes.',
    views: 890,
    feedbacks: 8,
    credits: 3,
  },
  {
    id: 3,
    name: 'CalPal',
    initials: 'C',
    color: '#10b981',
    url: 'calpal.co',
    category: 'Productivity',
    stage: 'Live',
    desc: 'Smart scheduling for freelancers. Set your rules, share your link, and let clients book without the back-and-forth emails.',
    views: 3210,
    feedbacks: 22,
    credits: 1,
  },
  {
    id: 4,
    name: 'Shiplog',
    initials: 'S',
    color: '#f59e0b',
    url: 'shiplog.dev',
    category: 'Developer Tools',
    stage: 'Beta',
    desc: 'Changelog and release notes tool for indie developers. Beautiful public pages, email digests, and one-click embeds for your site.',
    views: 2100,
    feedbacks: 18,
    credits: 2,
  },
  {
    id: 5,
    name: 'Folio',
    initials: 'F',
    color: '#ec4899',
    url: 'getfolio.io',
    category: 'Design',
    stage: 'Pre-launch',
    desc: 'Portfolio builder for designers and freelancers. Pick a template, drop in your work, and go live in under five minutes.',
    views: 670,
    feedbacks: 5,
    credits: 3,
  },
  {
    id: 6,
    name: 'Stackwise',
    initials: 'S',
    color: '#8b5cf6',
    url: 'stackwise.app',
    category: 'Developer Tools',
    stage: 'Live',
    desc: 'Tech stack discovery and comparison tool. See what other indie developers are using to build their products, filtered by category.',
    views: 4500,
    feedbacks: 31,
    credits: 1,
  },
  {
    id: 7,
    name: 'Feedr',
    initials: 'F',
    color: '#ef4444',
    url: 'feedr.app',
    category: 'Mobile',
    stage: 'Beta',
    desc: 'RSS reader reimagined for curious people. Digest mode, AI summaries, and a clean reading experience across all your devices.',
    views: 1580,
    feedbacks: 11,
    credits: 2,
  },
  {
    id: 8,
    name: 'Checkout Kit',
    initials: 'C',
    color: '#14b8a6',
    url: 'checkoutkit.io',
    category: 'E-commerce',
    stage: 'Live',
    desc: 'Embeddable checkout components for indie makers selling digital products. Stripe-powered, zero backend required.',
    views: 2870,
    feedbacks: 24,
    credits: 2,
  },
]

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
export default function Dashboard({ onLogout }) {
  const [page, setPage] = useState('explore')

  return (
    <div className="dashboard">
      <Sidebar page={page} setPage={setPage} onLogout={onLogout} />
      <main className="dash-main">
        {page === 'explore' && <ExplorePage />}
        {page !== 'explore' && <ComingSoon label={NAV.find(n => n.id === page)?.label} />}
      </main>
    </div>
  )
}

/* ── Sidebar ── */
function Sidebar({ page, setPage, onLogout }) {
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
          <div className="sidebar-avatar">J</div>
          <div>
            <div className="sidebar-name">Jamie D.</div>
            <div className="sidebar-handle">@jamied</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  )
}

/* ── Explore page ── */
function ExplorePage() {
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('All')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('popular')

  const filtered = APPS
    .filter(app =>
      (stage === 'All' || app.stage === stage) &&
      (category === 'All' || app.category === category) &&
      (search === '' ||
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.desc.toLowerCase().includes(search.toLowerCase()))
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
            {filtered.map(app => <AppCard key={app.id} app={app} />)}
            {filtered.length === 0 && (
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
      <p className="app-desc">{app.desc}</p>
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
