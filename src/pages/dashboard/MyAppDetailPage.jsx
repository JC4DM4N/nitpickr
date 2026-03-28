import { useState, useEffect } from 'react'
import './ReviewAppPage.css'
import './MyAppDetailPage.css'
import { AppPageHeader } from '../../components/AppPageHeader'
import { FeedbackRequestSection } from '../../components/FeedbackRequestSection'
import { FeedbackFeed } from '../../components/FeedbackFeed'

export default function MyAppDetailPage({ appId, onBack, onOpenReview }) {
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

  return (
    <div className="review-app-page">
      <AppPageHeader
        backLabel="← Back to my apps"
        onBack={onBack}
        color={app.color}
        initials={app.initials}
        name={app.name}
        stage={app.stage}
        url={app.url}
      />

      <div className="review-app-body">
        <div className="review-app-main">
          <FeedbackRequestSection value={app.request} />

          <section className="review-section">
            <p className="review-section-label">YOUR FEEDBACK</p>
            <FeedbackFeed reviews={reviews} onOpenReview={onOpenReview} />
          </section>
        </div>
      </div>
    </div>
  )
}
