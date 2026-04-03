import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import './Dashboard.css'
import Sidebar from '../../components/Sidebar'

export default function Dashboard({ user, onLogout }) {
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('http://localhost:8000/notifications/me', {
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
      <Sidebar user={user} onLogout={onLogout} unreadCount={unreadCount} />
      <main className="dash-main">
        <Outlet context={{ onRead: handleRead }} />
      </main>
    </div>
  )
}
