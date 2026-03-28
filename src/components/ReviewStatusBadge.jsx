import '../pages/dashboard/ReviewAppPage.css'

export function ReviewStatusBadge({ is_submitted, is_complete, is_rejected, review_requested }) {
  const cls = is_rejected ? 'rejected'
    : is_complete  ? 'complete'
    : is_submitted ? 'awaiting'
    : 'in-progress'

  const label = is_rejected ? 'Rejected'
    : is_complete  ? 'Approved'
    : is_submitted ? 'Awaiting approval'
    : review_requested ? 'Review Requested'
    : 'In progress'

  return <span className={`review-status-badge ${cls}`}>{label}</span>
}
