import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './ReviewAppPage.css'
import { STAGE_STYLES } from '../../constants'
import { OwnerMessageBanner } from '../../components/OwnerMessageBanner'
import { ImageLightbox } from '../../components/ImageLightbox'
import { ReviewerDeadlineBanner, OwnerDeadlineBanner } from '../../components/DeadlineBanner'

export default function ReviewAppPage() {
  const { reviewId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [screenshots, setScreenshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedImg, setExpandedImg] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`/reviews/${reviewId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => {
        setDetail(data)
        setFeedback(data.feedback || '')
        setScreenshots(data.screenshots || [])
        setLoading(false)
      })
      .catch(() => { setError('Failed to load review'); setLoading(false) })
  }, [reviewId])

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback, is_submitted: true }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Failed to submit review')
        return
      }
      const data = await res.json()
      setDetail(data)
    } catch {
      setError('Could not connect to server')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this review? This cannot be undone.')) return
    try {
      const token = localStorage.getItem('token')
      await fetch(`/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      navigate('/reviews')
    } catch {
      setError('Could not connect to server')
    }
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`/reviews/${reviewId}/screenshots`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: form,
        })
        if (res.ok) {
          const data = await res.json()
          setScreenshots(prev => [...prev, data.url])
        }
      }
    } catch {
      setError('Failed to upload screenshot')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (loading) return <div className="review-app-loading">Loading…</div>
  if (error && !detail) return <div className="review-app-loading">{error}</div>

  const stage = STAGE_STYLES[detail.app_stage]

  return (
    <div className="review-app-page">
      <ImageLightbox src={expandedImg} onClose={() => setExpandedImg(null)} />
      <div className="review-app-header">
        <button className="review-app-back" onClick={() => navigate('/reviews')}>← Back to reviews</button>
        <div className="review-app-title-row">
          <div className="review-app-icon" style={{ background: detail.app_color }}>
            {detail.app_initials}
          </div>
          <div className="review-app-title-block">
            <h1 className="review-app-name">{detail.app_name}</h1>
            <div className="review-app-meta">
              <span className="app-stage-badge" style={stage}>
                {detail.app_stage}
              </span>
              {detail.is_rejected  && <span className="review-status-badge rejected">Rejected</span>}
              {detail.is_complete  && <span className="review-status-badge complete">Approved</span>}
              {detail.is_submitted && !detail.is_complete && !detail.is_rejected && (
                <span className="review-status-badge awaiting">Awaiting approval</span>
              )}
              {!detail.is_submitted && !detail.is_complete && !detail.is_rejected && detail.review_requested && (
                <span className="review-status-badge in-progress">Review Requested</span>
              )}
            </div>
          </div>
          <a
            href={detail.app_url.startsWith('http') ? detail.app_url : `https://${detail.app_url}`}
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

          {!detail.is_complete && !detail.is_rejected && !detail.is_submitted && (
            <ReviewerDeadlineBanner deadline={detail.reviewer_deadline} />
          )}
          {!detail.is_complete && !detail.is_rejected && detail.is_submitted && (
            <OwnerDeadlineBanner deadline={detail.owner_deadline} />
          )}
          
          <section className="review-section">
            <p className="review-section-label">ABOUT THIS APP</p>
            <textarea className="review-request-text" value={detail.app_description} readOnly />
          </section>

          <section className="review-section">
            <p className="review-section-label">WHAT THE DEVELOPER IS LOOKING FOR</p>
            <textarea className="review-request-text" value={detail.app_request} readOnly />
          </section>

          <OwnerMessageBanner
            message={detail.owner_message}
            is_complete={detail.is_complete}
            is_rejected={detail.is_rejected}
          />

          <section className="review-section">
            <p className="review-section-label">YOUR FEEDBACK</p>
            <textarea
              className="review-feedback-input"
              placeholder="Write your honest, constructive feedback here…"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              disabled={detail.is_complete || detail.is_submitted || detail.is_rejected}
            />
          </section>

          {error && <p className="review-app-error">{error}</p>}

          <div className="review-app-actions">
            {!detail.is_complete && (
              <button className="review-delete-btn" onClick={handleDelete}>
                Delete review
              </button>
            )}
            <button
              className="review-submit-btn"
              onClick={handleSubmit}
              disabled={saving || detail.is_complete || detail.is_submitted || detail.is_rejected || !feedback.trim()}
            >
              {saving ? 'Submitting…'
                : detail.is_complete ? 'Approved'
                : detail.is_rejected ? 'Rejected'
                : detail.is_submitted ? 'Awaiting approval'
                : 'Submit review →'}
            </button>
          </div>
        </div>

        <aside className="review-app-sidebar">
          <section className="review-section">
            <p className="review-section-label">SCREENSHOTS</p>
            <p className="review-screenshots-hint">
              Attach screenshots to illustrate your feedback.
            </p>

            {screenshots.length > 0 && (
              <div className="screenshots-grid">
                {screenshots.map((url, i) => (
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

            {!detail.is_complete && (
              <>
                <div
                  className={`upload-zone${uploading ? ' uploading' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? 'Uploading…' : (
                    <>
                      <span className="upload-zone-icon">📎</span>
                      <span>Click to upload</span>
                      <span className="upload-zone-sub">PNG, JPG, GIF up to 10MB</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
