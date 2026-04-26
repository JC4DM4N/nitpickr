import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './ReviewAppPage.css'
import './OwnerReviewPage.css'

import { AppPageHeader } from '../../components/AppPageHeader'
import { FeedbackRequestSection } from '../../components/FeedbackRequestSection'
import { ReviewStatusBadge } from '../../components/ReviewStatusBadge'
import { OwnerMessageBanner } from '../../components/OwnerMessageBanner'
import { ActionModal } from '../../components/ActionModal'
import { authFetch } from '../../utils/authFetch'
import { ImageLightbox } from '../../components/ImageLightbox'
import { ReviewerDeadlineBanner, OwnerDeadlineBanner } from '../../components/DeadlineBanner'

export default function OwnerReviewPage() {
  const { appId, reviewId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [expandedImg, setExpandedImg] = useState(null)
  const [modal, setModal] = useState(null) // 'approve' | 'reject'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgError, setMsgError] = useState(null)
  const chatBottomRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      authFetch(`/apps/${appId}/reviews/${reviewId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(r => r.json()),
      authFetch(`/apps/${appId}/reviews/${reviewId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(r => r.json()),
    ])
      .then(([reviewData, msgData]) => {
        setDetail(reviewData)
        setMessages(Array.isArray(msgData) ? msgData : [])
        setLoading(false)
      })
      .catch(() => { setError('Failed to load review'); setLoading(false) })
  }, [appId, reviewId])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleAction(action, message) {
    const token = localStorage.getItem('token')
    const res = await authFetch(`/apps/${appId}/reviews/${reviewId}/${action}`, {
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

  async function handleSendMessage() {
    if (!msgInput.trim()) return
    setSendingMsg(true)
    setMsgError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await authFetch(`/apps/${appId}/reviews/${reviewId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ body: msgInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsgError(data.detail || 'Failed to send message')
        return
      }
      setMessages(prev => [...prev, data])
      setMsgInput('')
      // Refresh detail so deadline banners update immediately
      const token2 = localStorage.getItem('token')
      const updated = await authFetch(`/apps/${appId}/reviews/${reviewId}`, {
        headers: { 'Authorization': `Bearer ${token2}` },
      }).then(r => r.json())
      setDetail(updated)
    } catch {
      setMsgError('Could not connect to server')
    } finally {
      setSendingMsg(false)
    }
  }

  if (loading) return <div className="review-app-loading">Loading…</div>
  if (error) return <div className="review-app-loading">{error}</div>

  const canAct = detail.is_submitted && !detail.is_complete && !detail.is_rejected && !detail.is_expired
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <>
      <ImageLightbox src={expandedImg} onClose={() => setExpandedImg(null)} />

      {modal && (
        <ActionModal
          action={modal}
          onConfirm={msg => handleAction(modal, msg)}
          onClose={() => setModal(null)}
          description={modal === 'reject' ? (
            !detail.is_exchange
              ? 'You are about to reject this review. Your credit will be removed from escrow and returned to your account.'
              : detail.sibling_is_complete
                ? `You are about to reject this review. As your review of ${detail.sibling_app_name} has already been accepted, your account will be awarded 1 credit.`
                : 'You are about to reject this review. The feedback exchange will be cancelled.'
          ) : undefined}
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
            is_expired={detail.is_expired}
            review_requested={detail.review_requested}
          />
        </AppPageHeader>

        {canAct && (
          <div className="review-app-actions review-app-actions--top">
            <button className="owner-reject-btn" onClick={() => setModal('reject')}>
              Reject review
            </button>
            <button className="owner-approve-btn" onClick={() => setModal('approve')}>
              Approve review →
            </button>
          </div>
        )}

        <div className="review-app-body">
          <div className="review-app-main">

            {!detail.is_complete && !detail.is_rejected && (
              <>
                <ReviewerDeadlineBanner deadline={detail.reviewer_deadline} isOwnerView />
                <OwnerDeadlineBanner deadline={detail.owner_deadline} isOwnerView />
              </>
            )}

            <FeedbackRequestSection value={detail.app_request} />

            <OwnerMessageBanner
              message={detail.owner_message}
              is_complete={detail.is_complete}
              is_rejected={detail.is_rejected}
              isOwnerView
            />

            <p className="review-section-label">REVIEWER'S FEEDBACK</p>

            {(detail.tested_platform || detail.test_duration || detail.created_account !== null ) && (
              <section className="review-section">
                <div className="rubric-summary">
                  {detail.tested_platform && (
                    <div className="rubric-summary-item">
                      <span className="rubric-summary-label">Platform</span>
                      <span className="rubric-summary-value">{detail.tested_platform.charAt(0).toUpperCase() + detail.tested_platform.slice(1)}</span>
                    </div>
                  )}
                  {detail.test_duration && (
                    <div className="rubric-summary-item">
                      <span className="rubric-summary-label">Time spent</span>
                      <span className="rubric-summary-value">{detail.test_duration}</span>
                    </div>
                  )}
                  {detail.created_account !== null && (
                    <div className="rubric-summary-item">
                      <span className="rubric-summary-label">Created account</span>
                      <span className="rubric-summary-value">{detail.created_account ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="review-section">
              <textarea
                className="review-feedback-input"
                value={detail.feedback || ''}
                readOnly
                disabled
                placeholder="No feedback written yet."
              />
            </section>

            {/* Conversation thread */}
            {detail.is_submitted && (
              <section className="review-section chat-section">
                <p className="review-section-label">CONVERSATION</p>
                {messages.length > 0 && (
                  <div className="chat-messages">
                    {messages.map(msg => {
                      const isMe = msg.sender_username === currentUser.username
                      return (
                        <div key={msg.id} className={`chat-bubble-wrap${isMe ? ' chat-bubble-wrap--me' : ''}`}>
                          {!isMe && <span className="chat-sender">{msg.sender_username}</span>}
                          <div className={`chat-bubble${isMe ? ' chat-bubble--me' : ''}`}>
                            {msg.body}
                          </div>
                          <span className="chat-time">{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                      )
                    })}
                    <div ref={chatBottomRef} />
                  </div>
                )}
                {canAct && (
                  <div className="chat-input-row">
                    <textarea
                      className="chat-input"
                      placeholder="Ask a question or request changes…"
                      value={msgInput}
                      onChange={e => setMsgInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
                      }}
                      rows={2}
                    />
                    <button
                      className="chat-send-btn"
                      onClick={handleSendMessage}
                      disabled={sendingMsg || !msgInput.trim()}
                    >
                      {sendingMsg ? '…' : 'Send'}
                    </button>
                  </div>
                )}
                {msgError && <p className="review-app-error">{msgError}</p>}
              </section>
            )}

          </div>

          <aside className="review-app-sidebar">
            <section className="review-section">
              <p className="review-section-label">SCREENSHOTS</p>
              {detail.screenshots.length === 0 ? (
                <p className="review-screenshots-hint">No screenshots attached.</p>
              ) : (
                <div className="screenshots-grid">
                  {detail.screenshots.map((s, i) => (
                    <img
                      key={i}
                      src={s.url}
                      alt={`Screenshot ${i + 1}`}
                      className="screenshot-thumb screenshot-thumb--clickable"
                      onClick={() => setExpandedImg(s.url)}
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
