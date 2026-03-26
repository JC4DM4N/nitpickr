import { useState, useEffect } from 'react'
import './ReviewsPage.css'

const STAGE_STYLES = {
  'Pre-launch': { bg: '#fef3c7', color: '#92400e' },
  'Beta':       { bg: '#dbeafe', color: '#1e40af' },
  'Live':       { bg: '#d1fae5', color: '#065f46' },
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('http://localhost:8000/reviews/me', {
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
              {reviews.map(r => (
                <tr key={r.id}>
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
                    <span className={`review-status-badge ${r.is_complete ? 'complete' : 'in-progress'}`}>
                      {r.is_complete ? 'Complete' : 'In progress'}
                    </span>
                  </td>
                  <td className="reviews-date">
                    {new Date(r.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
