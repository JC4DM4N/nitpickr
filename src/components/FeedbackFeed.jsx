import { ReviewStatusBadge } from './ReviewStatusBadge'
import '../pages/dashboard/MyAppDetailPage.css'
import '../pages/dashboard/ExplorePage.css'
import { formatTimeRemaining } from '../utils/time'

export function FeedbackFeed({ reviews, onOpenReview }) {
  if (reviews.length === 0) {
    return <p className="feed-empty">No feedback yet.</p>
  }

  return (
    <div className="feedback-feed">
      {reviews.map(r => {
        const timeLeft = r.is_rejected || r.is_complete || r.is_expired
          ? null
          : r.is_submitted
            ? formatTimeRemaining(r.owner_deadline)
            : formatTimeRemaining(r.reviewer_deadline)
        const deadlineLabel = r.is_submitted ? 'to approve' : 'reviewer has'

        return (
        <div
          key={r.id}
          className="feed-item"
          onClick={() => onOpenReview(r.id)}
          style={{ cursor: 'pointer' }}
        >
          <div className="feed-item-header">
            <div className="feed-avatar">{r.reviewer_username[0].toUpperCase()}</div>
            <div className="feed-meta">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="feed-username">{r.reviewer_username}</span>
                <a
                  className="feed-profile-link"
                  href={`/${r.reviewer_username}`}
                  onClick={e => e.stopPropagation()}
                >
                  Profile →
                </a>
              </div>
              <span className="feed-date">
                {new Date(r.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="feed-item-header-right">
              <ReviewStatusBadge
                is_submitted={r.is_submitted}
                is_complete={r.is_complete}
                is_rejected={r.is_rejected}
                is_expired={r.is_expired}
                review_requested={r.review_requested}
                changes_requested={r.is_submitted && !!r.reviewer_deadline}
              />
              {timeLeft && (
                <span className="feed-time-left">
                  {deadlineLabel === 'to approve' ? `${timeLeft} to approve` : `${timeLeft} left`}
                </span>
              )}
            </div>
          </div>
          {r.feedback
            ? <p className="feed-text">{r.feedback}</p>
            : <p className="feed-text feed-text--empty">No feedback written yet.</p>
          }
        </div>
      )
      })}
    </div>
  )
}
