import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './ReviewsPage.css'
import { STAGE_STYLES } from '../../constants'
import { formatTimeRemaining } from '../../utils/time'
import { authFetch } from '../../utils/authFetch'

function statusClass(r) {
  if (r.is_expired) return 'expired'
  if (r.is_rejected) return 'rejected'
  if (r.is_complete) return 'complete'
  if (r.is_submitted && r.reviewer_deadline) return 'changes-requested'
  if (r.is_submitted) return 'awaiting'
  return 'in-progress'
}

function statusLabel(r) {
  if (r.is_expired) return 'Expired'
  if (r.is_rejected) return 'Rejected'
  if (r.is_complete) return 'Approved'
  if (r.is_submitted && r.reviewer_deadline) return 'Changes requested'
  if (r.is_submitted) return 'Awaiting approval'
  if (r.review_requested) return 'Review Requested'
  return 'In progress'
}

export default function ReviewsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('given')
  const [given, setGiven] = useState([])
  const [received, setReceived] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      authFetch('/reviews/me',       { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      authFetch('/reviews/received', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([givenData, receivedData]) => {
        setGiven(givenData)
        setReceived(receivedData)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load reviews'); setLoading(false) })
  }, [])

  const reviews = tab === 'given' ? given : received

  return (
    <div className="reviews-page">
      <div className="reviews-header">
        <h1 className="reviews-title">Reviews</h1>
      </div>
      <div className="reviews-body">
        <div className="reviews-tabs">
          <button
            className={`reviews-tab${tab === 'given' ? ' reviews-tab--active' : ''}`}
            onClick={() => setTab('given')}
          >
            Reviews given
          </button>
          <button
            className={`reviews-tab${tab === 'received' ? ' reviews-tab--active' : ''}`}
            onClick={() => setTab('received')}
          >
            Reviews received
          </button>
        </div>
        {loading && <p className="reviews-empty">Loading…</p>}
        {error && <p className="reviews-empty">{error}</p>}
        {!loading && !error && reviews.length === 0 && (
          <p className="reviews-empty">
            {tab === 'given'
              ? 'No reviews yet. Head to Explore to get started.'
              : 'No reviews received yet.'}
          </p>
        )}
        {!loading && !error && reviews.length > 0 && (
          <table className="reviews-table">
            <thead>
              <tr>
                <th>App</th>
                <th>Stage</th>
                <th>{tab === 'given' ? 'Status' : 'Reviewer'}</th>
                <th>Status</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => {
                const timeLeft = r.is_rejected || r.is_complete
                  ? null
                  : r.is_submitted
                    ? formatTimeRemaining(r.owner_deadline)
                    : formatTimeRemaining(r.reviewer_deadline)
                const isUrgent = timeLeft && (timeLeft.startsWith('0') || (!timeLeft.includes('d') && !timeLeft.includes('h')))
                const dest = tab === 'given'
                  ? `/reviews/${r.id}`
                  : `/my-apps/${r.app_id}/reviews/${r.id}`

                return (
                  <tr key={r.id} onClick={() => navigate(dest)} style={{ cursor: 'pointer' }}>
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
                      <span className="app-stage-badge" style={STAGE_STYLES[r.app_stage]}>
                        {r.app_stage}
                      </span>
                    </td>
                    {tab === 'received' && (
                      <td className="reviews-date">{r.reviewer_username}</td>
                    )}
                    <td>
                      <span className={`review-status-badge ${statusClass(r)}`}>
                        {statusLabel(r)}
                      </span>
                      {timeLeft && (
                        <span className={`reviews-time-left${isUrgent ? ' reviews-time-left--urgent' : ''}`}>
                          {timeLeft} left
                        </span>
                      )}
                    </td>
                    <td className="reviews-date">
                      {new Date(r.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
