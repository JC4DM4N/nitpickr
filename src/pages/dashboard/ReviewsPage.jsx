import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './ReviewsPage.css'
import { STAGE_STYLES } from '../../constants'
import { formatTimeRemaining } from '../../utils/time'
import { authFetch } from '../../utils/authFetch'

export default function ReviewsPage() {
  const navigate = useNavigate()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    authFetch('/reviews/me', {
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
              {reviews.map(r => {
                const timeLeft = r.is_rejected || r.is_complete
                  ? null
                  : r.is_submitted
                    ? formatTimeRemaining(r.owner_deadline)
                    : formatTimeRemaining(r.reviewer_deadline)
                const isUrgent = timeLeft && timeLeft.startsWith('0') || (timeLeft && !timeLeft.includes('d') && !timeLeft.includes('h'))

                return (
                  <tr key={r.id} onClick={() => navigate(`/reviews/${r.id}`)} style={{ cursor: 'pointer' }}>
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
                    <td>
                      <span className={`review-status-badge ${r.is_expired ? 'expired' : r.is_rejected ? 'rejected' : r.is_complete ? 'complete' : (r.is_submitted && r.owner_deadline) ? 'awaiting' : (r.is_submitted && r.reviewer_deadline) ? 'changes-requested' : r.is_submitted ? 'awaiting' : 'in-progress'}`}>
                        {r.is_expired ? 'Expired' : r.is_rejected ? 'Rejected' : r.is_complete ? 'Approved' : (r.is_submitted && r.reviewer_deadline) ? 'Changes requested' : r.is_submitted ? 'Awaiting approval' : r.review_requested ? 'Review Requested' : 'In progress'}
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
