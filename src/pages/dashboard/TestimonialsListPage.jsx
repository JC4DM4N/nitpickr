import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from '../../utils/authFetch'
import './TestimonialsListPage.css'

export default function TestimonialsListPage() {
  const navigate = useNavigate()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    authFetch('/apps/reviews/completed', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setReviews(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setError('Failed to load reviews'); setLoading(false) })
  }, [])

  return (
    <div className="tlist-page">
      <div className="tlist-header">
        {/* <h1 className="tlist-title">Testimonials</h1> */}
        <h1 className="reviews-title testimonial-title">Testimonials Studio</h1>

        <p className="tlist-subtitle">
          Select a completed review to create a verified testimonial embed for your landing page.
        </p>
      </div>

      <div className="tlist-body">
        {loading && <p className="tlist-empty">Loading…</p>}
        {error && <p className="tlist-empty">{error}</p>}
        {!loading && !error && reviews.length === 0 && (
          <p className="tlist-empty">No approved reviews yet. Once a reviewer's feedback is approved, it will appear here.</p>
        )}
        {!loading && !error && reviews.length > 0 && (
          <div className="tlist-feed">
            {reviews.map(r => (
              <button
                key={r.id}
                className="tlist-card"
                onClick={() => navigate(`/my-apps/${r.app_id}/reviews/${r.id}/testimonial`)}
              >
                <div className="tlist-card-top">
                  <div className="tlist-app-icon" style={{ background: r.app_color }}>
                    {r.app_initials}
                  </div>
                  <div className="tlist-card-meta">
                    <span className="tlist-app-name">{r.app_name}</span>
                    <span className="tlist-reviewer">by {r.reviewer_username}</span>
                  </div>
                  <span className="tlist-date">
                    {new Date(r.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {r.feedback && (
                  <p className="tlist-feedback-snippet">
                    {r.feedback.length > 180 ? r.feedback.slice(0, 180) + '…' : r.feedback}
                  </p>
                )}
                <span className="tlist-cta">Create testimonial →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
