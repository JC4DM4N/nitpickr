import { useState, useEffect } from 'react'
import './ReviewAppPage.css'
import './MyAppDetailPage.css'

const STAGE_STYLES = {
  'Pre-launch': { bg: '#fef3c7', color: '#92400e' },
  'Beta':       { bg: '#dbeafe', color: '#1e40af' },
  'Live':       { bg: '#d1fae5', color: '#065f46' },
}

export default function MyAppDetailPage({ appId, onBack }) {
  const [app, setApp] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      fetch(`http://localhost:8000/apps/${appId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`http://localhost:8000/apps/${appId}/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(r => r.json()),
    ])
      .then(([appData, reviewsData]) => {
        setApp(appData)
        setReviews(reviewsData)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load app'); setLoading(false) })
  }, [appId])

  if (loading) return <div className="review-app-loading">Loading…</div>
  if (error) return <div className="review-app-loading">{error}</div>

  const stage = STAGE_STYLES[app.stage]

  return (
    <div className="review-app-page">
      <div className="review-app-header">
        <button className="review-app-back" onClick={onBack}>← Back to my apps</button>
        <div className="review-app-title-row">
          <div className="review-app-icon" style={{ background: app.color }}>
            {app.initials}
          </div>
          <div className="review-app-title-block">
            <h1 className="review-app-name">{app.name}</h1>
            <div className="review-app-meta">
              <span className="app-stage-badge" style={{ background: stage.bg, color: stage.color }}>
                {app.stage}
              </span>
            </div>
          </div>
          <a
            href={app.url.startsWith('http') ? app.url : `https://${app.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="visit-app-btn"
          >
            Visit app ↗
          </a>
        </div>
      </div>

      <div className="review-app-body">
        <div className="review-app-main">
          <section className="review-section">
            <p className="review-section-label">DESCRIBE THE FEEDBACK YOU ARE LOOKING FOR</p>
            <textarea className="review-request-text" value={app.request} readOnly />
          </section>

          <section className="review-section">
            <p className="review-section-label">YOUR FEEDBACK</p>
            {reviews.length === 0 ? (
              <p className="feed-empty">No feedback yet.</p>
            ) : (
              <div className="feedback-feed">
                {reviews.map(r => (
                  <div key={r.id} className="feed-item">
                    <div className="feed-item-header">
                      <div className="feed-avatar">{r.reviewer_username[0].toUpperCase()}</div>
                      <div className="feed-meta">
                        <span className="feed-username">{r.reviewer_username}</span>
                        <span className="feed-date">
                          {new Date(r.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <span className={`review-status-badge ${r.is_complete ? 'complete' : 'in-progress'}`}>
                        {r.is_complete ? 'Complete' : 'In progress'}
                      </span>
                    </div>
                    {r.feedback ? (
                      <p className="feed-text">{r.feedback}</p>
                    ) : (
                      <p className="feed-text feed-text--empty">No feedback written yet.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
