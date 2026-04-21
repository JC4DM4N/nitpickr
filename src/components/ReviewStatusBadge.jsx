import '../pages/dashboard/ReviewAppPage.css'

export function ReviewStatusBadge({ is_submitted, is_complete, is_rejected, is_expired, review_requested, changes_requested }) {
  const cls = is_expired        ? 'expired'
    : is_rejected               ? 'rejected'
    : is_complete               ? 'complete'
    : changes_requested         ? 'changes-requested'
    : is_submitted              ? 'awaiting'
    : 'in-progress'

  const label = is_expired      ? 'Expired'
    : is_rejected               ? 'Rejected'
    : is_complete               ? 'Approved'
    : changes_requested         ? 'Changes requested'
    : is_submitted              ? 'Awaiting approval'
    : review_requested          ? 'Review Requested'
    : 'In progress'

  return <span className={`review-status-badge ${cls}`}>{label}</span>
}
