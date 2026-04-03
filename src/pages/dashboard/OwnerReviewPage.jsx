import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './ReviewAppPage.css'
import './OwnerReviewPage.css'

import { AppPageHeader } from '../../components/AppPageHeader'
import { FeedbackRequestSection } from '../../components/FeedbackRequestSection'
import { ReviewStatusBadge } from '../../components/ReviewStatusBadge'
import { OwnerMessageBanner } from '../../components/OwnerMessageBanner'
import { ActionModal } from '../../components/ActionModal'
import { ImageLightbox } from '../../components/ImageLightbox'
import { ReviewerDeadlineBanner, OwnerDeadlineBanner } from '../../components/DeadlineBanner'

export default function OwnerReviewPage() {
  const { appId, reviewId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [expandedImg, setExpandedImg] = useState(null)
  const [modal, setModal] = useState(null) // 'approve' | 'request-changes' | 'reject'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`http://localhost:8000/apps/${appId}/reviews/${reviewId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setDetail(data); setLoading(false) })
      .catch(() => { setError('Failed to load review'); setLoading(false) })
  }, [appId, reviewId])

  async function handleAction(action, message) {
    const token = localStorage.getItem('token')
    const res = await fetch(`http://localhost:8000/apps/${appId}/reviews/${reviewId}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.detail || 'Something went wrong')
    }
    setDetail(await res.json())
    setModal(null)
  }

  if (loading) return <div className="review-app-loading">Loading…</div>
  if (error) return <div className="review-app-loading">{error}</div>

  const canAct = detail.is_submitted && !detail.is_complete && !detail.is_rejected

  return (
    <>
      <ImageLightbox src={expandedImg} onClose={() => setExpandedImg(null)} />

      {modal && (
        <ActionModal
          action={modal}
          onConfirm={msg => handleAction(modal, msg)}
          onClose={() => setModal(null)}
        />
      )}

      <div className="review-app-page">
        <AppPageHeader
          backLabel="← Back to app"
          onBack={() => navigate(`/my-apps/${appId}`)}
          color={detail.app_color}
          initials={detail.app_initials}
          name={detail.app_name}
          stage={detail.app_stage}
          url={detail.app_url}
        >
          <ReviewStatusBadge
            is_submitted={detail.is_submitted}
            is_complete={detail.is_complete}
            is_rejected={detail.is_rejected}
            review_requested={detail.review_requested}
          />
        </AppPageHeader>

        <div className="review-app-body">
          <div className="review-app-main">

            {!detail.is_submitted && !detail.is_complete && !detail.is_rejected && (
              <ReviewerDeadlineBanner deadline={detail.reviewer_deadline} isOwnerView />
            )}
            {canAct && (
              <OwnerDeadlineBanner deadline={detail.owner_deadline} isOwnerView />
            )}
            
            <FeedbackRequestSection value={detail.app_request} />

            <OwnerMessageBanner
              message={detail.owner_message}
              is_complete={detail.is_complete}
              is_rejected={detail.is_rejected}
              isOwnerView
            />

            <section className="review-section">
              <p className="review-section-label">REVIEWER'S FEEDBACK</p>
              <textarea
                className="review-feedback-input"
                value={detail.feedback || ''}
                readOnly
                disabled
                placeholder="No feedback written yet."
              />
            </section>

            {canAct && (
              <div className="review-app-actions">
                <button className="owner-reject-btn" onClick={() => setModal('reject')}>
                  Reject review
                </button>
                <div className="owner-right-actions">
                  <button className="owner-request-btn" onClick={() => setModal('request-changes')}>
                    Request changes
                  </button>
                  <button className="owner-approve-btn" onClick={() => setModal('approve')}>
                    Approve review →
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="review-app-sidebar">
            <section className="review-section">
              <p className="review-section-label">SCREENSHOTS</p>
              {detail.screenshots.length === 0 ? (
                <p className="review-screenshots-hint">No screenshots attached.</p>
              ) : (
                <div className="screenshots-grid">
                  {detail.screenshots.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="screenshot-thumb screenshot-thumb--clickable"
                      onClick={() => setExpandedImg(url)}
                    />
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </>
  )
}
