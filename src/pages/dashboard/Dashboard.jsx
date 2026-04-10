import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import './Dashboard.css'
import Sidebar from '../../components/Sidebar'

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

export default function Dashboard({ user, onLogout }) {
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/notifications/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setUnreadCount(data.filter(n => !n.is_read).length))
      .catch(() => {})
  }, [location.pathname])

  function handleRead() {
    setUnreadCount(c => Math.max(0, c - 1))
  }

  return (
    <div className="dashboard">
      <Sidebar
        user={user}
        onLogout={onLogout}
        unreadCount={unreadCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="dash-main">
        <header className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <IconMenu />
          </button>
          <img src="/nitpickr_logo.svg" alt="NitPickr" height="24" />
        </header>
        <Outlet context={{ onRead: handleRead }} />
      </main>
    </div>
  )
}
