import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ExchangesPage.css";
import { authFetch } from "../../utils/authFetch";
import { formatTimeRemaining } from "../../utils/time";
import { ReviewStatusBadge } from "../../components/ReviewStatusBadge";

function ExchangeStatusBadge({ status }) {
  const cls =
    status === "pending"
      ? "in-progress"
      : status === "accepted"
        ? "complete"
        : status === "rejected"
          ? "rejected"
          : "expired";
  const label =
    status === "pending"
      ? "Pending"
      : status === "accepted"
        ? "Accepted"
        : status === "rejected"
          ? "Declined"
          : "Expired";
  return <span className={`review-status-badge ${cls}`}>{label}</span>;
}

export default function ExchangesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab ?? "active");
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myApps, setMyApps] = useState([]);
  const [acceptModal, setAcceptModal] = useState(null);
  const [acceptAppId, setAcceptAppId] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState(null);
  const [declineModal, setDeclineModal] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      authFetch("/exchanges/", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      authFetch(`/apps/by-owner/${currentUser.username}`).then((r) => r.json()),
    ])
      .then(([exData, appsData]) => {
        setExchanges(Array.isArray(exData) ? exData : []);
        setMyApps(Array.isArray(appsData) ? appsData : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load exchanges");
        setLoading(false);
      });
  }, []);

  function reload() {
    const token = localStorage.getItem("token");
    authFetch("/exchanges/", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setExchanges(Array.isArray(data) ? data : []));
  }

  async function handleReject(exchange) {
    const token = localStorage.getItem("token");
    await authFetch(`/exchanges/${exchange.id}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    reload();
  }

  async function handleAccept() {
    if (!acceptAppId) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await authFetch(`/exchanges/${acceptModal.id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestee_app_id: parseInt(acceptAppId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAcceptError(data.detail || "Failed to accept");
        return;
      }
      setAcceptModal(null);
      setAcceptAppId("");
      reload();
    } catch {
      setAcceptError("Could not connect to server");
    } finally {
      setAccepting(false);
    }
  }

  function isReviewDone(ex, prefix) {
    return (
      ex[`${prefix}is_complete`] ||
      ex[`${prefix}is_rejected`] ||
      ex[`${prefix}is_expired`]
    );
  }

  function isExchangeComplete(ex) {
    return (
      ex.status === "accepted" &&
      isReviewDone(ex, "ror_") &&
      isReviewDone(ex, "rod_")
    );
  }

  const complete = exchanges.filter(isExchangeComplete);
  const active = exchanges.filter(
    (e) => e.status === "accepted" && !isExchangeComplete(e),
  );
  const sentReqs = exchanges.filter(
    (e) => e.requester_id === currentUser.id && e.status !== "accepted",
  );
  const recvReqs = exchanges.filter(
    (e) => e.requestee_id === currentUser.id && e.status !== "accepted",
  );

  const list =
    tab === "active"
      ? active
      : tab === "sent"
        ? sentReqs
        : tab === "received"
          ? recvReqs
          : complete;

  const TABS = [
    { key: "active", label: "Active", count: active.length },
    { key: "sent", label: "Requests sent", count: sentReqs.length },
    { key: "received", label: "Requests received", count: recvReqs.length },
    { key: "complete", label: "Complete", count: complete.length },
  ];

  const emptyMsg = {
    active: "No active exchanges.",
    sent: "No exchange requests sent.",
    received: "No exchange requests received.",
    complete: "No completed exchanges yet.",
  };

  return (
    <div className="exchanges-page">
      {declineModal && (
        <div className="modal-overlay" onClick={() => setDeclineModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDeclineModal(null)}>✕</button>
            <div className="modal-header">
              <div>
                <div className="modal-title">Decline exchange request?</div>
              </div>
            </div>
            <div className="modal-header">
              <div className="modal-subtitle">
                <p>
                  Are you sure you want to decline this feedback exchange request from <strong>{declineModal.requester_username}</strong>?
                  They will be notified that you declined.
                </p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => setDeclineModal(null)}>Cancel</button>
              <button className="modal-btn-start" style={{ background: '#dc2626' }} onClick={() => { handleReject(declineModal); setDeclineModal(null); }}>
                Decline →
              </button>
            </div>
          </div>
        </div>
      )}
      {acceptModal && (
        <div className="modal-overlay" onClick={() => setAcceptModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setAcceptModal(null)}
            >
              ✕
            </button>
            <div className="modal-header">
              <div>
                <div className="modal-title">Accept feedback exchange</div>
                <div className="modal-url">
                  {acceptModal.requester_username} will review{" "}
                  <strong>{acceptModal.requester_app_name}</strong>
                </div>
              </div>
            </div>
            <div className="modal-header">
              <div className="modal-subtitle">
                <p>
                  You are about to begin a direct feedback exchange with <strong>{acceptModal.requester_username}</strong>.
                  They will review one of your apps, and you will review <strong>{acceptModal.requester_app_name}</strong> in return.
                  Once accepted, you will both have 48 hours to submit your feedback.
                </p>
              </div>
            </div>
            {acceptModal.message && (
              <div className="exchange-modal-message">
                <p className="modal-section-label">MESSAGE</p>
                <p className="exchange-message-body">{acceptModal.message}</p>
              </div>
            )}
            <p className="modal-section-label" style={{ padding: "0 24px" }}>
              WHICH OF YOUR APPS WILL YOU REVIEW IN RETURN?
            </p>
            <div className="exchange-app-options">
              {myApps.map((app) => (
                <button
                  key={app.id}
                  className={`exchange-app-option${acceptAppId === String(app.id) ? " selected" : ""}`}
                  onClick={() => setAcceptAppId(String(app.id))}
                >
                  <div
                    className="exchange-app-option-icon"
                    style={{ background: app.color }}
                  >
                    {app.initials}
                  </div>
                  <span>{app.name}</span>
                </button>
              ))}
            </div>
            {acceptError && <p className="modal-error">{acceptError}</p>}
            <div className="modal-actions">
              <button
                className="modal-btn-cancel"
                onClick={() => {
                  setAcceptModal(null);
                  setAcceptAppId("");
                }}
              >
                Cancel
              </button>
              <button
                className="modal-btn-start"
                onClick={handleAccept}
                disabled={accepting || !acceptAppId}
              >
                {accepting ? "Accepting…" : "Accept exchange →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="exchanges-header">
        <h1 className="exchanges-title">Feedback Exchanges</h1>
      </div>
      <div className="exchanges-body">
        <div className="reviews-tabs">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              className={`reviews-tab${tab === key ? " reviews-tab--active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
              {count > 0 && <span className="exchange-tab-count">{count}</span>}
            </button>
          ))}
        </div>

        {loading && <p className="reviews-empty">Loading…</p>}
        {error && <p className="reviews-empty">{error}</p>}
        {!loading && !error && list.length === 0 && (
          <p className="reviews-empty">{emptyMsg[tab]}</p>
        )}

        {!loading && !error && list.length > 0 && (
          <div className="exchanges-list">
            {list.map((ex) => {
              const timeLeft =
                ex.status === "pending"
                  ? formatTimeRemaining(ex.expires_at)
                  : null;
              const isUrgent =
                timeLeft &&
                (timeLeft.startsWith("0") ||
                  (!timeLeft.includes("d") && !timeLeft.includes("h")));
              const isPendingReceived =
                ex.status === "pending" && ex.requestee_id === currentUser.id;

              // review_of_requester = B reviews A's app (requester_app)
              // review_of_requestee = A reviews B's app (requestee_app)
              const rorStatus =
                ex.status === "accepted"
                  ? {
                      is_submitted: ex.ror_is_submitted,
                      is_complete: ex.ror_is_complete,
                      is_rejected: ex.ror_is_rejected,
                      is_expired: ex.ror_is_expired,
                      review_requested: ex.ror_review_requested,
                    }
                  : null;
              const rodStatus =
                ex.status === "accepted"
                  ? {
                      is_submitted: ex.rod_is_submitted,
                      is_complete: ex.rod_is_complete,
                      is_rejected: ex.rod_is_rejected,
                      is_expired: ex.rod_is_expired,
                      review_requested: ex.rod_review_requested,
                    }
                  : null;

              return (
                <div key={ex.id} className="exchange-card">
                  <div className="exchange-card-main">
                    <div className="exchange-card-top">
                    <div className="exchange-card-apps">
                      <div className="exchange-app-pill">
                        <div
                          className="exchange-app-icon"
                          style={{ background: ex.requester_app_color }}
                        >
                          {ex.requester_app_initials}
                        </div>
                        <div>
                          <div className="exchange-app-name">
                            {ex.requester_app_name}
                          </div>
                          <div className="exchange-app-by">
                            by {ex.requester_username}
                          </div>
                        </div>
                      </div>
                      <span className="exchange-arrow">⇄</span>
                      <div className="exchange-app-pill">
                        {ex.requestee_app_id ? (
                          <>
                            <div
                              className="exchange-app-icon"
                              style={{ background: ex.requestee_app_color }}
                            >
                              {ex.requestee_app_initials}
                            </div>
                            <div>
                              <div className="exchange-app-name">
                                {ex.requestee_app_name}
                              </div>
                              <div className="exchange-app-by">
                                by {ex.requestee_username}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="exchange-app-tbd">
                            <div className="exchange-app-icon exchange-app-icon--tbd">
                              ?
                            </div>
                            <div>
                              <div className="exchange-app-name">
                                {ex.requestee_username}'s app
                              </div>
                              <div className="exchange-app-by">
                                pending acceptance
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    </div>

                    <div className="exchange-card-footer">
                      <div className="exchange-card-status">
                        {(tab === "sent" || tab === "received") && (
                          <ExchangeStatusBadge status={ex.status} />
                        )}
                        {timeLeft && (
                          <span
                            className={`reviews-time-left${isUrgent ? " reviews-time-left--urgent" : ""}`}
                          >
                            {timeLeft} to respond
                          </span>
                        )}
                      </div>

                      <div className="exchange-card-actions">
                        {(tab === 'sent' || tab === 'received') && (
                          <button
                            className="exchange-review-btn exchange-card-profile-btn"
                            onClick={() => navigate(`/${ex.requester_id === currentUser.id ? ex.requestee_username : ex.requester_username}`)}
                          >
                            {ex.requester_id === currentUser.id ? ex.requestee_username : ex.requester_username} →
                          </button>
                        )}
                        {isPendingReceived && (
                          <>
                            <button
                              className="exchange-decline-btn"
                              onClick={() => setDeclineModal(ex)}
                            >
                              Decline
                            </button>
                            <button
                              className="exchange-accept-btn"
                              onClick={() => {
                                setAcceptModal(ex);
                                setAcceptAppId("");
                              }}
                            >
                              Accept
                            </button>
                          </>
                        )}
                        {ex.status === "accepted" && (
                          <div className="exchange-review-links">
                            {ex.review_of_requester && (
                              <div className="exchange-review-link-row">
                                <ReviewStatusBadge {...rorStatus} />
                                <button
                                  className="exchange-review-btn"
                                  onClick={() =>
                                    navigate(
                                      // B reviews A's app — A is owner
                                      ex.requester_id === currentUser.id
                                        ? `/my-apps/${ex.requester_app_id}/reviews/${ex.review_of_requester}`
                                        : `/reviews/${ex.review_of_requester}`,
                                    )
                                  }
                                >
                                  {ex.requester_app_name} →
                                </button>
                              </div>
                            )}
                            {ex.review_of_requestee && (
                              <div className="exchange-review-link-row">
                                <ReviewStatusBadge {...rodStatus} />
                                <button
                                  className="exchange-review-btn"
                                  onClick={() =>
                                    navigate(
                                      // A reviews B's app — B is owner
                                      ex.requestee_id === currentUser.id
                                        ? `/my-apps/${ex.requestee_app_id}/reviews/${ex.review_of_requestee}`
                                        : `/reviews/${ex.review_of_requestee}`,
                                    )
                                  }
                                >
                                  {ex.requestee_app_name} →
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {ex.message && (tab === "sent" || tab === "received") && (
                    <p className="exchange-card-message">"{ex.message}"</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
