import { useState } from 'react'
import '../pages/dashboard/OwnerReviewPage.css'

const MODAL_CONFIG = {
  'approve': {
    title: 'Approve this review',
    placeholder: 'e.g. Thanks for the thorough feedback, really helpful!',
    confirmLabel: 'Approve review →',
    confirmClass: 'owner-approve-btn',
  },
  'request-changes': {
    title: 'Request changes',
    placeholder: 'e.g. Could you go into more detail about the onboarding flow?',
    confirmLabel: 'Send request',
    confirmClass: 'owner-request-btn',
  },
  'reject': {
    title: 'Reject this review',
    placeholder: "e.g. This feedback doesn't address the areas I asked about.",
    confirmLabel: 'Reject review',
    confirmClass: 'owner-reject-btn',
  },
}

export function ActionModal({ action, onConfirm, onClose, description }) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const config = MODAL_CONFIG[action]

  async function handleSubmit() {
    if (!message.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(message.trim())
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <p className="modal-title">{config.title}</p>
        {description && <p className="modal-description" style={{ padding: '0 0 12px', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>{description}</p>}
        <textarea
          className="modal-action-input"
          placeholder={config.placeholder}
          value={message}
          onChange={e => setMessage(e.target.value)}
          autoFocus
        />
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className={config.confirmClass}
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
          >
            {submitting ? 'Saving…' : config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
