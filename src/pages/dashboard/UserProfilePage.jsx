import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../dashboard/ExplorePage.css";
import "./UserProfilePage.css";
import { STAGE_STYLES } from "../../constants";
import { authFetch } from "../../utils/authFetch";

export default function UserProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewApp, setReviewApp] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isLoggedIn = !!localStorage.getItem("token");
  const isOwnProfile =
    currentUser.username?.toLowerCase() === username?.toLowerCase();

  const [exchangeModal, setExchangeModal] = useState(false);
  const [exchange, setExchange] = useState(undefined); // undefined=loading, null=none, obj=exists
  const [myApps, setMyApps] = useState([]);

  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editTwitter, setEditTwitter] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const fetches = [
      authFetch(`/users/by-username/${username}`).then((r) => r.json()),
      authFetch(`/apps/by-owner/${username}`).then((r) => r.json()),
    ];
    if (token) {
      fetches.push(
        authFetch("/reviews/me", {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
      );
    }
    if (token && !isOwnProfile) {
      fetches.push(
        authFetch(`/exchanges/between/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
      );
      fetches.push(
        authFetch(`/apps/by-owner/${currentUser.username}`).then((r) => r.json()),
      );
    }

    Promise.all(fetches)
      .then(([profileData, appsData, myReviews = [], exchangeData, myAppsData]) => {
        if (profileData.detail) {
          setError("User not found");
          setLoading(false);
          return;
        }
        setProfile(profileData);

        if (!isOwnProfile) {
          const activeReviewedIds = new Set(
            myReviews
              .filter((r) => !r.is_complete && !r.is_rejected && !r.is_expired)
              .map((r) => r.app_id),
          );
          const completedReviewedIds = new Set(
            myReviews.filter((r) => r.is_complete).map((r) => r.app_id),
          );
          appsData = appsData
            .filter((a) => !activeReviewedIds.has(a.id))
            .map((a) => ({ ...a, _alreadyReviewed: completedReviewedIds.has(a.id) }));
          // exchangeData may be null (no active exchange) or an object
          setExchange(exchangeData ?? null);
          setMyApps(Array.isArray(myAppsData) ? myAppsData : []);
        }

        setApps(appsData);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load profile");
        setLoading(false);
      });
  }, [username]);

  if (error) {
    return (
      <div className="profile-error-state">
        <p>{error}</p>
        {isLoggedIn && (
          <button className="btn-submit-app" onClick={() => navigate("/explore")}>
            Back to explore
          </button>
        )}
      </div>
    );
  }

  const hasCredits = profile?.available_credits > 0;

  function startEditing() {
    setEditUsername(profile.username);
    setEditTwitter(profile.twitter_username || "");
    setEditError(null);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setEditError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await authFetch("/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: editUsername, twitter_username: editTwitter }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.detail || "Failed to save");
        return;
      }
      setProfile(data);
      // update localStorage so isOwnProfile stays correct after username change
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, username: data.username }));
      setEditing(false);
      if (data.username !== username) navigate(`/${data.username}`);
    } catch {
      setEditError("Could not connect to server");
    } finally {
      setSaving(false);
    }
  }

  function handleReviewClick(app) {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    setReviewApp(app);
  }

  function handleExchangeClick() {
    if (!isLoggedIn) {
      setExchangeModal('login');
      return;
    }
    if (myApps.length === 0) {
      setExchangeModal('no-apps');
      return;
    }
    setExchangeModal('request');
  }

  const profileHasApps = apps.length > 0 || loading;
  const showExchangeBtn = !isOwnProfile && !loading && profileHasApps;

  function exchangeButtonLabel() {
    if (!exchange) return 'Request feedback exchange';
    if (exchange.requester_id === currentUser.id) return 'Request submitted';
    return 'Accept / Decline request';
  }

  return (
    <>
      {reviewApp && (
        <ReviewModal
          app={reviewApp}
          onClose={() => setReviewApp(null)}
          onReviewCreated={(reviewId, appId) => {
            setApps((prev) => prev.filter((a) => a.id !== appId));
            setReviewApp(null);
            navigate(`/reviews/${reviewId}`);
          }}
        />
      )}
      {exchangeModal && (
        <ExchangeModal
          mode={exchangeModal}
          username={username}
          myApps={myApps}
          onClose={() => setExchangeModal(false)}
          onLogin={() => navigate('/login')}
          onSignup={() => navigate('/signup')}
          onExchangeCreated={() => {
            setExchangeModal(false);
            setExchange({ requester_id: currentUser.id });
          }}
        />
      )}
      <div className="explore">
        <div className={`explore-hero profile-hero${isOwnProfile ? ' profile-hero--own' : ''}`}>
          <div className="profile-hero-identity">
            <div className="profile-avatar">
              {username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="explore-title profile-title">{profile?.username || username}'s apps</h1>
              {isOwnProfile && (
                <p className="explore-sub profile-sub">
                  Share this page so others can discover and review your apps.
                </p>
              )}
              {!isOwnProfile && !loading && !hasCredits && (
                <p className="profile-no-credits-banner">
                  {username} has no credits available — you cannot start new reviews
                  for their apps right now.
                </p>
              )}
              <div className="profile-meta-row">
                {isOwnProfile && !editing && (
                  <button className="profile-edit-btn" onClick={startEditing}>Edit profile</button>
                )}
                {profile?.twitter_username && (
                  <a
                    className="profile-twitter-link"
                    href={`https://twitter.com/${profile.twitter_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img src="/x_logo.png" width="20" height="20" alt="X" style={{ display: 'block', borderRadius: '5px' }} />
                    @{profile.twitter_username}
                  </a>
                )}
              </div>
              {showExchangeBtn && (
                <div className="profile-exchange-row">
                  <button
                    className="profile-exchange-btn"
                    onClick={exchange && exchange.requestee_id === currentUser.id
                      ? () => navigate('/exchanges')
                      : handleExchangeClick}
                    disabled={!!exchange && exchange.requester_id === currentUser.id}
                  >
                    {exchangeButtonLabel()}
                  </button>
                </div>
              )}
            </div>
          </div>

          {isOwnProfile && editing && (
            <form className="profile-edit-form" onSubmit={e => { e.preventDefault(); handleSave(); }}>
              <div className="profile-edit-field">
                <label className="profile-edit-label">Username</label>
                <input
                  className="profile-edit-input"
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                  placeholder="username"
                />
              </div>
              <div className="profile-edit-field">
                <label className="profile-edit-label">X / Twitter</label>
                <div className="profile-edit-prefix-wrap">
                  <span className="profile-edit-prefix">twitter.com/</span>
                  <input
                    className="profile-edit-input profile-edit-input--prefix"
                    value={editTwitter}
                    onChange={e => setEditTwitter(e.target.value.replace(/^@/, ''))}
                    placeholder="username"
                  />
                </div>
              </div>
              {editError && <p className="profile-edit-error">{editError}</p>}
              <div className="profile-edit-actions">
                <button type="button" className="profile-edit-cancel" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="profile-edit-save" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          )}

          {isOwnProfile && !editing && <ShareBox username={profile?.username || username} />}
        </div>

        <div className="explore-body profile-body">
          <div className="explore-results">
            <div className="results-bar">
              <span className="results-count">{apps.length} apps</span>
              {isOwnProfile && (
                <button
                  className="btn-submit-app"
                  onClick={() => navigate("/my-apps/new")}
                >
                  + Submit your app
                </button>
              )}
            </div>
            <div className="app-grid">
              {loading && <p className="no-results">Loading…</p>}
              {!loading && apps.length === 0 && (
                <p className="no-results">
                  {isOwnProfile
                    ? "You haven't submitted any apps yet."
                    : `${username} hasn't submitted any apps yet.`}
                </p>
              )}
              {!loading &&
                apps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isOwnApp={isOwnProfile}
                    isLoggedIn={isLoggedIn}
                    hasCredits={hasCredits}
                    ownerUsername={username}
                    onReview={() => handleReviewClick(app)}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ShareBox({ username }) {
  const profileUrl = `https://nitpickr.dev/${username}`
  const shareMessage = `Hey! I just submitted my apps on NitPickr. Leave some feedback and I'll review your app in return.\n\nCheck it out: ${profileUrl}`
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedMsg, setCopiedMsg] = useState(false)

  function copy(text, setCopied) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="share-box">
      <p className="share-box-label">SHAREABLE LINK</p>
      <div className="share-row">
        <input className="share-input" readOnly value={profileUrl} />
        <button className="share-copy-btn" onClick={() => copy(profileUrl, setCopiedUrl)}>
          {copiedUrl ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="share-row share-row--msg">
        <textarea className="share-textarea" readOnly value={shareMessage} rows={4} />
        <button className="share-copy-btn" onClick={() => copy(shareMessage, setCopiedMsg)}>
          {copiedMsg ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  )
}

function AppCard({ app, isOwnApp, isLoggedIn, hasCredits, ownerUsername, onReview }) {
  const stage = STAGE_STYLES[app.stage];
  return (
    <div className="app-card-wrap">
      {!isOwnApp && app._alreadyReviewed && <div className="app-own-banner"><span className="app-already-reviewed-badge">Already reviewed</span></div>}
    <div className="app-card">
      <div className="app-card-header">
        <div className="app-icon" style={{ background: app.color }}>
          {app.initials}
        </div>
        <div className="app-name-block">
          <div className="app-name">{app.name}</div>
          <div className="app-url">{app.url}</div>
        </div>
        <div className="app-card-meta">
          <span className="app-category-tag">{app.category}</span>
          <a
            className="app-visit-btn"
            href={app.url.startsWith("http") ? app.url : `https://${app.url}`}
            target="_blank"
            rel="noreferrer"
          >
            Visit ↗
          </a>
        </div>
      </div>
      <p className="app-desc">{app.description}</p>
      <div className="app-card-footer">
        <div className="app-footer-stat">
          <span className="app-footer-label">STAGE</span>
          <span className="app-stage-badge" style={stage}>
            {app.stage}
          </span>
        </div>
        <div className="app-footer-stat">
          <span className="app-footer-label">CREDITS</span>
          <span className="app-footer-value">{app.credits}</span>
        </div>
        {/* <div className="app-footer-stat">
          <span className="app-footer-label">FEEDBACK</span>
          <span className="app-footer-value">{app.approved_count}</span>
        </div> */}
        {!isOwnApp && (
          <div className="profile-review-col">
            <button
              className="app-review-btn"
              onClick={onReview}
              disabled={isLoggedIn && !hasCredits}
            >
              {isLoggedIn ? "Leave feedback →" : "Log in to leave feedback →"}
            </button>
            {isLoggedIn && !hasCredits && (
              <span className="profile-no-credits-msg">
                {ownerUsername} has no credits available for you to leave
                feedback
              </span>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

function ExchangeModal({ mode, username, myApps, onClose, onLogin, onSignup, onExchangeCreated }) {
  const [selectedAppId, setSelectedAppId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!selectedAppId) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await authFetch('/exchanges/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requestee_username: username,
          requester_app_id: parseInt(selectedAppId),
          message: message.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Failed to send request'); return; }
      onExchangeCreated();
    } catch {
      setError('Could not connect to server');
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'login') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>✕</button>
          <div className="modal-header"><div className="modal-title">Sign in to request an exchange</div></div>
          <div className="modal-actions">
            <button className="modal-btn-cancel" onClick={onSignup}>Create account</button>
            <button className="modal-btn-start" onClick={onLogin}>Sign in →</button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'no-apps') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>✕</button>
          <div className="modal-header"><div className="modal-title">You have no apps for {username} to review</div></div>
          <p style={{ padding: '0 24px 16px', color: '#6b7280', fontSize: 14 }}>
            Submit an app first, then you can request a feedback exchange.
          </p>
          <div className="modal-actions">
            <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="modal-btn-start" onClick={() => { onClose(); window.location.href = '/my-apps/new'; }}>Submit an app →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <div className="modal-title">Request a feedback exchange with <strong>{username}</strong></div>
        </div>
        <div className="modal-header">
          <div className="modal-subtitle">
            <p>
            You are about to offer to give feedback on one of <strong>{username}</strong>'s apps in exchange for 
            feedback on one of your own. If they accept, you will both have 48 hours to submit your feedback on each
            others apps.
            </p>
            <br/>
            <p>
            Select which of your apps you would like <strong>{username}</strong> to review, and leave them a nice 
            message to introduce yourself.
            </p>
          </div>
        </div>
        <p className="modal-section-label">WHICH OF YOUR APPS SHOULD {username.toUpperCase()} REVIEW?</p>
        {/* <div className="exchange-app-options" style={{ padding: '8px 24px 4px' }}> */}
        <div className="exchange-app-options">
          {myApps.map(app => (
            <button
              key={app.id}
              className={`exchange-app-option${selectedAppId === String(app.id) ? ' selected' : ''}`}
              onClick={() => setSelectedAppId(String(app.id))}
            >
              <div className="exchange-app-option-icon" style={{ background: app.color }}>{app.initials}</div>
              <span>{app.name}</span>
            </button>
          ))}
        </div>
        {/* <div style={{ padding: '8px 24px 0' }}> */}
        <div>
          <p className="modal-section-label">MESSAGE</p>
          <textarea
            className="review-feedback-input"
            placeholder={`Say hi to ${username}…`}
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            style={{ marginBottom: 0 }}
          />
        </div>
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn-start" onClick={handleSubmit} disabled={submitting || !selectedAppId}>
            {submitting ? 'Sending…' : 'Send request →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({ app, onClose, onReviewCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await authFetch("/reviews/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ app_id: app.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to start review");
        return;
      }
      onReviewCreated(data.id, app.id);
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        <div className="modal-header">
          <div className="app-icon" style={{ background: app.color }}>
            {app.initials}
          </div>
          <div>
            <div className="modal-title">
              Start a review for <strong>{app.name}</strong>
            </div>
            <div className="modal-url">{app.url}</div>
          </div>
        </div>
        <div className="modal-scroll-body">
          {app.description && (
            <>
              <p className="modal-section-label">ABOUT THIS APP</p>
              <p className="modal-description">{app.description}</p>
            </>
          )}
          <p className="modal-section-label">
            WHAT THE DEVELOPER IS LOOKING FOR
          </p>
          <div className="modal-request">{app.request}</div>
        </div>
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-btn-start"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? "Starting…" : "Start review →"}
          </button>
        </div>
      </div>
    </div>
  );
}
