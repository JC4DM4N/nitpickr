import { formatTimeRemaining } from '../utils/time'
import '../pages/dashboard/ReviewAppPage.css'

/**
 * Shown to the reviewer while they still have time to submit.
 * Shown to the owner as "The reviewer has X to respond" when awaiting submission.
 *
 * Props:
 *   deadline    – ISO string or Date, the reviewer's submission deadline
 *   isOwnerView – if true, renders "The reviewer has X to respond"
 *                 if false (default), renders "You have X remaining to submit this review"
 */
export function ReviewerDeadlineBanner({ deadline, isOwnerView = false }) {
  const t = formatTimeRemaining(deadline)
  if (!t) return null
  const isUrgent = !t.includes('d') && !t.includes('h')
  return (
    <div className={`deadline-banner${isUrgent ? ' deadline-banner--urgent' : ''}`}>
      <span className="deadline-banner-icon">⏱</span>
      {isOwnerView
        ? <>The reviewer has <strong>{t}</strong> to respond.</>
        : <>You have <strong>{t}</strong> remaining to submit this review.</>
      }
    </div>
  )
}

/**
 * Shown to the owner while they still have time to approve.
 * Shown to the reviewer as "The owner has X to approve" while awaiting approval.
 *
 * Props:
 *   deadline    – ISO string or Date, the owner's approval deadline
 *   isOwnerView – if true, renders "You have X to approve this review"
 *                 if false (default), renders "The owner has X to approve this review"
 */
export function OwnerDeadlineBanner({ deadline, isOwnerView = false }) {
  const t = formatTimeRemaining(deadline)
  if (!t) return null
  return (
    <div className="deadline-banner deadline-banner--owner">
      <span className="deadline-banner-icon">⏳</span>
      {isOwnerView
        ? <>You have <strong>{t}</strong> to approve this review — it will auto-approve after 2 days.</>
        : <>The owner has <strong>{t}</strong> to approve this review — it will auto-approve after 2 days.</>
      }
    </div>
  )
}
