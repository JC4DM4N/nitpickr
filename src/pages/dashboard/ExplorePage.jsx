import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ExplorePage.css";
import { STAGE_STYLES, CATEGORIES, STAGES } from "../../constants";
import { authFetch } from "../../utils/authFetch";

const FILTER_CATEGORIES = ["All", ...CATEGORIES];
const FILTER_STAGES = ["All", ...STAGES];

function IconSearch() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("All");
  const [category, setCategory] = useState("All");
  const [reviewApp, setReviewApp] = useState(null);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      authFetch("/apps/").then((r) => r.json()),
      authFetch("/reviews/me", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      authFetch("/users/me/credits", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([allApps, myReviews, creditsData]) => {
        if (creditsData.available === 0) setShowNoCreditsModal(true);
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const activeReviewedIds = new Set(
          myReviews
            .filter((r) => !r.is_complete && !r.is_rejected)
            .map((r) => r.app_id),
        );
        const allReviewedIds = new Set(myReviews.map((r) => r.app_id));
        setApps(
          allApps.filter((a) => {
            if (a.owner_id === user.id) return false;
            if (activeReviewedIds.has(a.id)) return false;
            if (!a.is_multi_review && allReviewedIds.has(a.id)) return false;
            return true;
          }),
        );
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load apps");
        setLoading(false);
      });
  }, []);

  const filtered = apps.filter(
    (app) =>
      (stage === "All" || app.stage === stage) &&
      (category === "All" || app.category === category) &&
      (search === "" ||
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <>
      {showNoCreditsModal && (
        <div className="modal-overlay" onClick={() => setShowNoCreditsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
              <div className="modal-title" style={{ fontSize: 17, fontWeight: 700, color: "#0f0e0b" }}>
                You have no credits available
              </div>
              <p className="modal-description" style={{ margin: 0 }}>
                Other users will not be able to review your apps currently. Review someone else's app to earn a credit.
              </p>
            </div>
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => setShowNoCreditsModal(false)}>
                Dismiss
              </button>
              <button className="modal-btn-start" onClick={() => { setShowNoCreditsModal(false); navigate("/how-it-works"); }}>
                How it works →
              </button>
            </div>
          </div>
        </div>
      )}
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
      <div className="explore">
        <div className="explore-hero">
          <h1 className="explore-title">Discover Apps to Review</h1>
          <p className="explore-sub">
            Give honest feedback. Earn credits. Get better feedback on your own
            apps — completely free.
          </p>
          <div className="explore-search-row">
            <div className="explore-search">
              <IconSearch />
              <input
                type="text"
                placeholder='"productivity app" or "pre-launch SaaS"'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              className="btn-submit-app"
              onClick={() => navigate("/my-apps/new")}
            >
              + Submit your app
            </button>
          </div>
        </div>

        <div className="explore-body">
          <aside className="explore-filters">
            <p className="filters-heading">FILTERS</p>

            <div className="filter-group">
              <label className="filter-label">Category</label>
              <select
                className="filter-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {FILTER_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Stage</label>
              {FILTER_STAGES.map((s) => (
                <label key={s} className="filter-radio">
                  <input
                    type="radio"
                    name="stage"
                    checked={stage === s}
                    onChange={() => setStage(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </aside>

          <div className="explore-results">
            <div className="results-bar">
              <span className="results-count">
                {filtered.length} apps found
              </span>
            </div>
            <div className="app-grid">
              {loading && <p className="no-results">Loading apps…</p>}
              {error && <p className="no-results">{error}</p>}
              {!loading &&
                !error &&
                filtered.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    onReview={() => setReviewApp(app)}
                  />
                ))}
              {!loading && !error && filtered.length === 0 && (
                <p className="no-results">No apps match your filters.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function AppCard({ app, onReview }) {
  const stage = STAGE_STYLES[app.stage];
  return (
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
        <div className="app-footer-stat">
          <span className="app-footer-label">FEEDBACK</span>
          <span className="app-footer-value">{app.approved_count}</span>
        </div>
        <button className="app-review-btn" onClick={onReview}>
          Leave feedback →
        </button>
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
