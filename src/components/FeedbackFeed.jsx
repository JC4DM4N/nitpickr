import { ReviewStatusBadge } from './ReviewStatusBadge'
import '../pages/dashboard/MyAppDetailPage.css'

export function FeedbackFeed({ reviews, onOpenReview }) {
  if (reviews.length === 0) {
    return <p className="feed-empty">No feedback yet.</p>
  }

  return (
    <div className="feedback-feed">
      {reviews.map(r => (
        <div
          key={r.id}
          className="feed-item"
          onClick={() => onOpenReview(r.id)}
          style={{ cursor: 'pointer' }}
        >
          <div className="feed-item-header">
            <div className="feed-avatar">{r.reviewer_username[0].toUpperCase()}</div>
            <div className="feed-meta">
              <span className="feed-username">{r.reviewer_username}</span>
              <span className="feed-date">
                {new Date(r.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <ReviewStatusBadge
              is_submitted={r.is_submitted}
              is_complete={r.is_complete}
              is_rejected={r.is_rejected}
              review_requested={r.review_requested}
            />
          </div>
          {r.feedback
            ? <p className="feed-text">{r.feedback}</p>
            : <p className="feed-text feed-text--empty">No feedback written yet.</p>
          }
        </div>
      ))}
    </div>
  )
}
