import '../pages/dashboard/ReviewAppPage.css'

export function OwnerMessageBanner({ message, is_complete, is_rejected, isOwnerView = false }) {
  if (!message) return null

  const modifier = is_rejected ? ' owner-message-banner--rejected'
    : is_complete ? ' owner-message-banner--approved'
    : ''

  const label = is_rejected
    ? (isOwnerView ? 'You rejected this review' : 'Review rejected')
    : is_complete
    ? (isOwnerView ? 'You approved this review' : 'Review approved')
    : (isOwnerView ? 'You requested changes' : 'Changes requested')

  return (
    <div className={`owner-message-banner${modifier}`}>
      <span className="owner-message-label">{label}</span>
      <p className="owner-message-text">{message}</p>
    </div>
  )
}
