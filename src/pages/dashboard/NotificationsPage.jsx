import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import './NotificationsPage.css'
import './ExplorePage.css'
import { authFetch } from '../../utils/authFetch'

const TYPE_ICONS = {
  review_started:            '🔔',
  review_submitted:          '📝',
  review_resubmitted:        '📝',
  review_approved:           '✅',
  review_rejected:           '❌',
  changes_requested:         '↩️',
  reviewer_deadline_expired: '⏱',
  owner_deadline_expired:    '⏳',
}

// Notifications sent to the app owner — should open the owner review view
const OWNER_REVIEW_TYPES = new Set(['review_started', 'review_submitted', 'review_resubmitted', 'review_message_owner', 'reviewer_deadline_expired_owner'])

const DEAD_END_TYPES = new Set([])

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { onRead } = useOutletContext()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    authFetch('/notifications/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setNotifications(data); setLoading(false) })
      .catch(() => { setError('Failed to load notifications'); setLoading(false) })
  }, [])

  async function handleMarkAllRead() {
    const unread = notifications.filter(n => !n.is_read)
    if (!unread.length) return
    const token = localStorage.getItem('token')
    authFetch('/notifications/me/read', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    }).catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    onRead()
  }

  async function handleClick(n) {
    if (DEAD_END_TYPES.has(n.type)) return
    if (!n.is_read) {
      const token = localStorage.getItem('token')
      authFetch(`/notifications/${n.id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {})
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      onRead()
    }
    if (n.review_id && OWNER_REVIEW_TYPES.has(n.type)) {
      navigate(`/my-apps/${n.app_id}/reviews/${n.review_id}`)
    } else if (n.review_id) {
      navigate(`/reviews/${n.review_id}`)
    } else if (n.app_id) {
      navigate(`/my-apps/${n.app_id}`)
    }
  }

  return (
    <div className="notif-page">
      <div className="notif-header">
        <div>
          <h1 className="notif-title">Notifications</h1>
          <p className="notif-sub">Activity related to your apps and reviews.</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button className="btn-submit-app" onClick={handleMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      <div className="notif-body">
        {loading && <p className="notif-empty">Loading…</p>}
        {error && <p className="notif-empty">{error}</p>}
        {!loading && !error && notifications.length === 0 && (
          <p className="notif-empty">No notifications yet.</p>
        )}
        {!loading && !error && notifications.length > 0 && (
          <div className="notif-list">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item${n.is_read ? '' : ' notif-item--unread'}${(n.review_id || n.app_id) && !DEAD_END_TYPES.has(n.type) ? ' notif-item--clickable' : ''}`}
                onClick={() => (n.review_id || n.app_id) && handleClick(n)}
              >
                <span className="notif-icon">{TYPE_ICONS[n.type] ?? '🔔'}</span>
                <div className="notif-content">
                  <p className="notif-message">{n.message}</p>
                  <span className="notif-date">
                    {new Date(n.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                {!n.is_read && <span className="notif-dot" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
