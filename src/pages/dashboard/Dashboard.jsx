import { useState } from 'react'
import './Dashboard.css'
import ExplorePage from './ExplorePage'
import ReviewsPage from './ReviewsPage'

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

const NAV = [
  { id: 'explore', label: 'Explore', Icon: IconExplore },
  { id: 'my-apps', label: 'My Apps', Icon: IconApps },
  { id: 'reviews', label: 'Reviews', Icon: IconReviews },
  { id: 'credits', label: 'Credits', Icon: IconCredits },
]

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

function ComingSoon({ label }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-icon">🚧</div>
      <h2>{label}</h2>
      <p>This page is coming soon.</p>
    </div>
  )
}
