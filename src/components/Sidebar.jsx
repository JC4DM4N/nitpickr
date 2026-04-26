import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../pages/dashboard/Dashboard.css'
import { authFetch } from '../utils/authFetch'

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
function IconBell() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
function IconInfo() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
}
function IconShare() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function IconExchange() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
}

const NAV = [
  { path: '/explore',       label: 'Explore',       Icon: IconExplore },
  { path: '/my-apps',       label: 'My Apps',       Icon: IconApps },
  { path: '/reviews',       label: 'Reviews',       Icon: IconReviews },
  { path: '/exchanges',     label: 'Exchanges',     Icon: IconExchange },
  { path: '/notifications', label: 'Notifications', Icon: IconBell },
  { path: '/credits',       label: 'Credits',       Icon: IconCredits },
  { path: '/how-it-works',  label: 'How it works',  Icon: IconInfo },
]

export default function Sidebar({ user, onLogout, unreadCount, isOpen, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [credits, setCredits] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    authFetch('/users/me/credits', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setCredits(data.available))
      .catch(() => {})
  }, [location.pathname])

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <img src="/nitpickr_logo.svg" alt="NitPickr" height="30" />
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ path, label, Icon }) => {
            const isActive = location.pathname === path || (path !== '/explore' && location.pathname.startsWith(path))
            return (
              <button
                key={path}
                className={`sidebar-item${isActive ? ' active' : ''}`}
                onClick={() => navigate(path)}
              >
                <Icon />
                {label}
                {path === '/notifications' && unreadCount > 0 && (
                  <span className="sidebar-notif-badge">{unreadCount}</span>
                )}
              </button>
            )
          })}
          {user?.username && (() => {
            const profilePath = `/${user.username}`
            const isActive = location.pathname === profilePath
            return (
              <button
                className={`sidebar-item${isActive ? ' active' : ''}`}
                onClick={() => navigate(profilePath)}
              >
                <IconShare />
                Profile
              </button>
            )
          })()}
        </nav>
        <div className="sidebar-credits-widget">
          <div className="credits-widget-top">
            <span className="credits-widget-label">Your Credits</span>
            <span className="credits-widget-icon">⚡</span>
          </div>
          <div className="credits-widget-value">{credits ?? '—'}</div>
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
    </>
  )
}
