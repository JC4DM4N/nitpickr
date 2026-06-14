import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./ExplorePage.css";
import { STAGE_STYLES, CATEGORIES, STAGES } from "../../constants";
import { authFetch } from "../../utils/authFetch";

const FILTER_CATEGORIES = ["All", ...CATEGORIES];
const FILTER_STAGES = ["All", ...STAGES];

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mainTab, setMainTab] = useState(location.state?.tab ?? "apps");

  // ── Apps state ─────────────────────────────────────────────────────────────
  const [apps, setApps] = useState([]);
  const [totalApps, setTotalApps] = useState(0);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState(null);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("All");
  const [category, setCategory] = useState("All");
  const [appsSort, setAppsSort] = useState("default");
  const [reviewApp, setReviewApp] = useState(null);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [onboarding, setOnboarding] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);

  const [ownApps, setOwnApps] = useState([]);

  // ── Discover state ─────────────────────────────────────────────────────────
  const [discoverApps, setDiscoverApps] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverLoaded, setDiscoverLoaded] = useState(false);
  const [discoverError, setDiscoverError] = useState(null);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [discoverStage, setDiscoverStage] = useState("All");
  const [discoverCategory, setDiscoverCategory] = useState("All");
  const [discoverSort, setDiscoverSort] = useState("default");
  const [discoverMinReviews, setDiscoverMinReviews] = useState("1");
  const reviewIdSetsRef = useRef({ active: new Set(), completed: new Set() });

  // ── Users state ────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [minReviews, setMinReviews] = useState("1");
  const [userSort, setUserSort] = useState("default");

  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      authFetch("/apps/").then((r) => r.json()),
      authFetch("/apps/mine", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      authFetch("/reviews/me", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      authFetch("/users/me/credits", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      authFetch("/apps/count").then((r) => r.json()),
    ])
      .then(([allApps, myApps, myReviews, creditsData, countData]) => {
        setOwnApps(myApps);
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const hasOwnApps = myApps.length > 0;
        const hasApprovedReview = myReviews.some((r) => r.is_complete);
        const hasPendingReview = !hasApprovedReview && myReviews.some((r) => r.is_submitted && !r.is_rejected && !r.is_expired);
        const leftFeedback = hasApprovedReview ? "done" : hasPendingReview ? "pending" : "none";
        setOnboarding({ submittedApp: hasOwnApps, leftFeedback });
        const onboardingComplete = hasOwnApps && hasApprovedReview;
        const hasOngoingReview = myReviews.some((r) => !r.is_complete && !r.is_rejected && !r.is_expired);
        if (onboardingComplete && creditsData.available === 0 && !hasOngoingReview) {
          setShowNoCreditsModal(true);
        }
        const activeReviewedIds = new Set(myReviews.filter((r) => !r.is_complete && !r.is_rejected && !r.is_expired).map((r) => r.app_id));
        const completedReviewedIds = new Set(myReviews.filter((r) => r.is_complete).map((r) => r.app_id));
        reviewIdSetsRef.current = { active: activeReviewedIds, completed: completedReviewedIds };
        setTotalApps(countData.count);
        setApps(
          allApps
            .filter((a) => !activeReviewedIds.has(a.id))
            .map((a) => ({ ...a, _isOwn: a.owner_id === user.id, _alreadyReviewed: completedReviewedIds.has(a.id) })),
        );
        setAppsLoading(false);
      })
      .catch(() => { setAppsError("Failed to load apps"); setAppsLoading(false); });
  }, []);

  function loadDiscover() {
    if (discoverLoaded) return;
    setDiscoverLoading(true);
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    authFetch("/apps/all")
      .then((r) => r.json())
      .then((data) => {
        const { active, completed } = reviewIdSetsRef.current;
        setDiscoverApps(
          data.map((a) => ({
            ...a,
            _isOwn: a.owner_id === user.id,
            _alreadyReviewed: completed.has(a.id),
            _activeReview: active.has(a.id),
          }))
        );
        setDiscoverLoading(false);
        setDiscoverLoaded(true);
      })
      .catch(() => { setDiscoverError("Failed to load apps"); setDiscoverLoading(false); });
  }

  function loadUsers() {
    if (usersLoaded) return;
    setUsersLoading(true);
    authFetch("/users/explore")
      .then((r) => r.json())
      .then((data) => { setUsers(Array.isArray(data) ? data : []); setUsersLoading(false); setUsersLoaded(true); })
      .catch(() => { setUsersError("Failed to load users"); setUsersLoading(false); });
  }

  useEffect(() => {
    if (mainTab === "users") loadUsers();
  }, []);

  function handleTabChange(tab) {
    setMainTab(tab);
    if (tab === "users") loadUsers();
    if (tab === "discover") loadDiscover();
  }

  const filteredDiscoverApps = discoverApps
    .filter(
      (app) =>
        !app._isOwn &&
        (discoverStage === "All" || app.stage === discoverStage) &&
        (discoverCategory === "All" || app.category === discoverCategory) &&
        (discoverSearch === "" || app.name.toLowerCase().includes(discoverSearch.toLowerCase()) || app.description.toLowerCase().includes(discoverSearch.toLowerCase())) &&
        (discoverMinReviews === "" || app.owner_reviews_given >= parseInt(discoverMinReviews)),
    )
    .sort((a, b) => {
      if (discoverSort === "reviews_given") return b.owner_reviews_given - a.owner_reviews_given;
      if (discoverSort === "reviewer_rating") return (b.owner_reviewer_rating ?? -1) - (a.owner_reviewer_rating ?? -1);
      const ratingDiff = (b.owner_reviewer_rating ?? -1) - (a.owner_reviewer_rating ?? -1);
      return ratingDiff !== 0 ? ratingDiff : b.owner_reviews_given - a.owner_reviews_given;
    });

  const filteredApps = apps
    .filter(
      (app) =>
        (stage === "All" || app.stage === stage) &&
        (category === "All" || app.category === category) &&
        (search === "" || app.name.toLowerCase().includes(search.toLowerCase()) || app.description.toLowerCase().includes(search.toLowerCase())),
    )
    .sort((a, b) => {
      if (appsSort === "reviews_given") return b.owner_reviews_given - a.owner_reviews_given;
      if (appsSort === "reviewer_rating") return (b.owner_reviewer_rating ?? -1) - (a.owner_reviewer_rating ?? -1);
      return 0;
    });

  const currentUserId = JSON.parse(localStorage.getItem("user") || "{}").id;

  const filteredUsers = users
    .filter((u) =>
      u.id !== currentUserId &&
      (userSearch === "" || u.username.toLowerCase().includes(userSearch.toLowerCase())) &&
      (minReviews === "" || u.reviews_given >= parseInt(minReviews)),
    )
    .sort((a, b) => {
      if (userSort === "reviews_given") return b.reviews_given - a.reviews_given;
      if (userSort === "reviewer_rating") return (b.reviewer_rating ?? -1) - (a.reviewer_rating ?? -1);
      const ratingDiff = (b.reviewer_rating ?? -1) - (a.reviewer_rating ?? -1);
      return ratingDiff !== 0 ? ratingDiff : b.reviews_given - a.reviews_given;
    });

  return (
    <>
      {showNoCreditsModal && (
        <div className="modal-overlay" onClick={() => setShowNoCreditsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
              <div className="modal-title" style={{ fontSize: 17, fontWeight: 700, color: "#0f0e0b" }}>You have no credits available</div>
              <p className="modal-description" style={{ margin: 0 }}>Other users will not be able to review your apps currently. Review someone else's app to earn a credit.</p>
            </div>
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => setShowNoCreditsModal(false)}>Dismiss</button>
              <button className="modal-btn-start" onClick={() => { setShowNoCreditsModal(false); navigate("/how-it-works"); }}>How it works →</button>
            </div>
          </div>
        </div>
      )}
      {reviewApp && (
        <ReviewModal
          app={reviewApp}
          myApps={ownApps}
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
          <h1 className="explore-title">Explore</h1>
          <p className="explore-sub">Give honest feedback. Earn credits. Get better feedback on your own apps.</p>
          <button className="btn-submit-app btn-submit-app--mobile" onClick={() => navigate("/my-apps/new")}>+ Submit your app</button>
          <div className="explore-search-row">
            <div className="explore-search">
              <IconSearch />
              <input
                type="text"
                placeholder={mainTab === "users" ? 'Search by username…' : '"productivity app" or "pre-launch SaaS"'}
                value={mainTab === "apps" ? search : mainTab === "discover" ? discoverSearch : userSearch}
                onChange={(e) => mainTab === "apps" ? setSearch(e.target.value) : mainTab === "discover" ? setDiscoverSearch(e.target.value) : setUserSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="explore-main-tabs">
            <button className="btn-submit-app btn-submit-app--desktop" onClick={() => navigate("/my-apps/new")}>+ Submit your app</button>
            <div className="explore-tabs-group">
              <button className={`explore-main-tab${mainTab === "apps" ? " explore-main-tab--active" : ""}`} onClick={() => handleTabChange("apps")}>Review</button>
              <button className={`explore-main-tab${mainTab === "discover" ? " explore-main-tab--active" : ""}`} onClick={() => handleTabChange("discover")}>Discover</button>
              <button className={`explore-main-tab${mainTab === "users" ? " explore-main-tab--active" : ""}`} onClick={() => handleTabChange("users")}>Founders</button>
            </div>
            <div className="explore-tabs-spacer" />
          </div>
        </div>

        {onboarding && !(onboarding.submittedApp && onboarding.leftFeedback === "done") && (() => {
          const stepsComplete = (onboarding.submittedApp ? 1 : 0) + (onboarding.leftFeedback === "done" ? 1 : 0);
          const pct = stepsComplete * 50;
          const steps = [
            {
              n: 1,
              status: onboarding.submittedApp ? "done" : "none",
              label: "Submit your app",
              detail: (
                <>
                  Add your app so other developers can discover it and leave feedback. The more detail you include, the better the nitpicks you'll get.{" "}
                  <button className="onboarding-link" onClick={() => navigate("/my-apps/new")}>Submit your app →</button>
                </>
              ),
            },
            {
              n: 2,
              status: onboarding.leftFeedback,
              label: "Leave feedback on someone's app",
              detail: onboarding.leftFeedback === "pending"
                ? "Your review has been submitted and is awaiting approval from the app owner. Once they approve it, this step will complete."
                : "Pick an app from the list below and leave honest, constructive feedback. Your app will become available for review once your review is approved.",
            },
          ];
          return (
            <div className="onboarding-bar">
              <div className="onboarding-header">
                <span className="onboarding-title">Getting started</span>
                <span className="onboarding-pct">{pct}% complete</span>
              </div>
              <div className="onboarding-track">
                <div className="onboarding-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="onboarding-steps">
                {steps.map((s) => (
                  <div key={s.n} className={`onboarding-step onboarding-step--${s.status}`}>
                    <button
                      className="onboarding-step-header"
                      onClick={() => setExpandedStep(expandedStep === s.n ? null : s.n)}
                    >
                      <span className={`onboarding-circle onboarding-circle--${s.status}`}>
                        {s.status === "done" ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : s.status === "pending" ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                          </svg>
                        ) : s.n}
                      </span>
                      <span className="onboarding-step-label">{s.label}</span>
                      <svg
                        className={`onboarding-chevron${expandedStep === s.n ? " onboarding-chevron--open" : ""}`}
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    {expandedStep === s.n && (
                      <p className="onboarding-step-detail">{s.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="explore-body">
          {/* ── Filters sidebar ── */}
          <aside className="explore-filters">
            <p className="filters-heading">FILTERS</p>
            {mainTab === "apps" || mainTab === "discover" ? (
              <>
                <div className="filter-group">
                  <label className="filter-label">Sort by</label>
                  <select className="filter-select" value={mainTab === "apps" ? appsSort : discoverSort} onChange={(e) => mainTab === "apps" ? setAppsSort(e.target.value) : setDiscoverSort(e.target.value)}>
                    <option value="default">Default</option>
                    <option value="reviews_given">Reviews given</option>
                    <option value="reviewer_rating">Reviewer rating</option>
                  </select>
                </div>
                {mainTab === "discover" && (
                  <div className="filter-group">
                    <label className="filter-label">Min reviews given</label>
                    <input
                      type="number"
                      className="filter-select"
                      placeholder="e.g. 1"
                      min="0"
                      value={discoverMinReviews}
                      onChange={(e) => setDiscoverMinReviews(e.target.value)}
                    />
                  </div>
                )}
                <div className="filter-group">
                  <label className="filter-label">Category</label>
                  <select className="filter-select" value={mainTab === "apps" ? category : discoverCategory} onChange={(e) => mainTab === "apps" ? setCategory(e.target.value) : setDiscoverCategory(e.target.value)}>
                    {FILTER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">Stage</label>
                  {FILTER_STAGES.map((s) => (
                    <label key={s} className="filter-radio">
                      <input type="radio" name="stage" checked={(mainTab === "apps" ? stage : discoverStage) === s} onChange={() => mainTab === "apps" ? setStage(s) : setDiscoverStage(s)} />
                      {s}
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="filter-group">
                  <label className="filter-label">Sort by</label>
                  <select className="filter-select" value={userSort} onChange={(e) => setUserSort(e.target.value)}>
                    <option value="default">Default</option>
                    <option value="reviews_given">Reviews given</option>
                    <option value="reviewer_rating">Reviewer rating</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">Min reviews given</label>
                  <input
                    type="number"
                    className="filter-select"
                    placeholder="e.g. 1"
                    min="0"
                    value={minReviews}
                    onChange={(e) => setMinReviews(e.target.value)}
                  />
                </div>
              </>
            )}
          </aside>

          {/* ── Results ── */}
          <div className="explore-results">
            {mainTab === "apps" ? (
              <>
                <div className="results-bar">
                  <span className="results-count">{filteredApps.length} apps available for review ({totalApps} total)</span>
                </div>
                <div className="app-grid">
                  {appsLoading && <p className="no-results">Loading apps…</p>}
                  {appsError && <p className="no-results">{appsError}</p>}
                  {!appsLoading && !appsError && filteredApps.map((app) => (
                    <AppCard key={app.id} app={app} onReview={() => !app._isOwn && setReviewApp(app)} onShowMore={() => setReviewApp(app)} />
                  ))}
                  {!appsLoading && !appsError && filteredApps.length === 0 && (
                    <p className="no-results">No apps match your filters.</p>
                  )}
                </div>
              </>
            ) : mainTab === "discover" ? (
              <>
                <div className="results-bar">
                  <span className="results-count">{filteredDiscoverApps.length} apps ({discoverApps.length} total)</span>
                </div>
                <div className="app-grid">
                  {discoverLoading && <p className="no-results">Loading apps…</p>}
                  {discoverError && <p className="no-results">{discoverError}</p>}
                  {!discoverLoading && !discoverError && filteredDiscoverApps.map((app) => (
                    <AppCard key={app.id} app={app} onShowMore={() => setReviewApp(app)} />
                  ))}
                  {!discoverLoading && !discoverError && filteredDiscoverApps.length === 0 && (
                    <p className="no-results">No apps match your filters.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="results-bar">
                  <span className="results-count">{filteredUsers.length} users found</span>
                </div>
                <div className="user-grid">
                  {usersLoading && <p className="no-results">Loading users…</p>}
                  {usersError && <p className="no-results">{usersError}</p>}
                  {!usersLoading && !usersError && filteredUsers.map((u) => (
                    <UserCard key={u.id} user={u} />
                  ))}
                  {!usersLoading && !usersError && filteredUsers.length === 0 && (
                    <p className="no-results">No users found.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function UserCard({ user }) {
  const navigate = useNavigate();
  return (
    <div className="user-card">
      <div className="user-card-header">
        <div className="user-card-avatar">{user.username[0].toUpperCase()}</div>
        <Link to={`/${user.username}`} className="user-card-username user-card-username--link">{user.username}</Link>
        <button className="app-profile-btn user-card-profile-btn" onClick={() => navigate(`/${user.username}`)}>Profile →</button>
      </div>
      <div className="user-card-stats">
        <div className="user-card-stat">
          <span className="app-footer-label">APPS</span>
          <span className="app-footer-value">{user.app_count}</span>
        </div>
        <div className="user-card-stat">
          <span className="app-footer-label">REVIEWS GIVEN</span>
          <span className="app-footer-value">{user.reviews_given}</span>
        </div>
        <div className="user-card-stat">
          <span className="app-footer-label">REVIEWER RATING</span>
          {user.reviewer_rating != null ? (
            <span className="app-footer-value user-card-rating">
              {user.reviewer_rating}
              <img src="/star.png" width="20" height="20" alt="star" style={{ display: 'block' }} />
              / 5
            </span>
          ) : (
            <span className="app-footer-value">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AppCard({ app, onReview, onShowMore }) {
  const navigate = useNavigate();
  const stage = STAGE_STYLES[app.stage];
  const inactive = app._isOwn || !!app._activeReview;
  return (
    <div className="app-card-wrap">
      {app._isOwn && <div className="app-own-banner"><span className="app-own-badge">Your app</span></div>}
      {!app._isOwn && app._alreadyReviewed && <div className="app-own-banner"><span className="app-already-reviewed-badge">Already reviewed</span></div>}
      <div className={`app-card${inactive ? ' app-card--inactive' : ''}`}>
        <div className="app-card-header">
          <div className="app-icon" style={{ background: app.color }}>{app.initials}</div>
          <div className="app-name-block">
            <Link to={`/discover/${app.slug || app.id}`} className="app-name app-name--link">{app.name}</Link>
            <div className="app-url">{app.url}</div>
          </div>
          <div className="app-card-meta">
            <span className="app-category-tag">{app.category}</span>
            <a className="app-visit-btn" href={app.url.startsWith("http") ? app.url : `https://${app.url}`} target="_blank" rel="noreferrer">Visit ↗</a>
          </div>
        </div>
        <p className="app-desc">{app.description}</p>
        <div className="app-card-footer">
          <div className="app-footer-stat">
            <span className="app-footer-label">STAGE</span>
            <span className="app-stage-badge" style={stage}>{app.stage}</span>
          </div>
          <div className="app-footer-stat" style={{ marginLeft: 'auto' }}>
            <span className="app-footer-label">REVIEWS GIVEN</span>
            <span className="app-footer-value">{app.owner_reviews_given}</span>
          </div>
          <div className="app-footer-stat">
            <span className="app-footer-label">REVIEWER RATING</span>
            {app.owner_reviewer_rating != null ? (
              <span className="app-footer-value user-card-rating">
                {app.owner_reviewer_rating}
                <img src="/star.png" width="20" height="20" alt="star" style={{ display: 'block' }} />
                / 5
              </span>
            ) : (
              <span className="app-footer-value">—</span>
            )}
          </div>
          <div className="app-footer-stat">
            <span className="app-footer-label">CREDITS</span>
            <span className="app-footer-value">{app.credits}</span>
          </div>
          <div className="app-card-footer-actions">
            <button className="app-profile-btn" onClick={e => { e.stopPropagation(); navigate(`/${app.owner_username}`); }}>Profile</button>
            <button className="app-profile-btn" onClick={e => { e.stopPropagation(); onShowMore?.(); }}>Show more</button>
            {onReview && <button className="app-review-btn" onClick={onReview} disabled={inactive}>Leave feedback</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({ app, myApps, onClose, onReviewCreated }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [exchangeMessage, setExchangeMessage] = useState("");
  const [exchangeSubmitting, setExchangeSubmitting] = useState(false);
  const [exchangeError, setExchangeError] = useState(null);
  const [exchangeDone, setExchangeDone] = useState(false);
  const canReview = !app._isOwn && !app._activeReview;
  const hasCredits = app.owner_available_credits > 0;
  const stage = STAGE_STYLES[app.stage];

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await authFetch("/reviews/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ app_id: app.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to start review"); return; }
      onReviewCreated(data.id, app.id);
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function handleExchangeSubmit() {
    if (!selectedAppId) return;
    setExchangeSubmitting(true);
    setExchangeError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await authFetch("/exchanges/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requestee_username: app.owner_username,
          requester_app_id: parseInt(selectedAppId),
          message: exchangeMessage.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setExchangeError(data.detail || "Failed to send request"); return; }
      setExchangeDone(true);
    } catch {
      setExchangeError("Could not connect to server");
    } finally {
      setExchangeSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <div className="app-icon" style={{ background: app.color }}>{app.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="modal-title"><strong>{app.name}</strong></div>
            <div className="modal-url">{app.url}</div>
          </div>
          <button className="app-profile-btn modal-profile-btn" onClick={() => navigate(`/${app.owner_username}`)}>Profile</button>
        </div>

        <div className="modal-meta-row">
          <div className="modal-meta-item">
            <span className="app-footer-label">OWNER</span>
            <span className="app-footer-value">{app.owner_username}</span>
          </div>
          <div className="modal-meta-item">
            <span className="app-footer-label">REVIEWER RATING</span>
            {app.owner_reviewer_rating != null ? (
              <span className="app-footer-value user-card-rating">
                {app.owner_reviewer_rating}
                <img src="/star.png" width="20" height="20" alt="star" style={{ display: "block" }} />
                / 5
              </span>
            ) : (
              <span className="app-footer-value">—</span>
            )}
          </div>
          <div className="modal-meta-item">
            <span className="app-footer-label">STAGE</span>
            <span className="app-stage-badge" style={stage}>{app.stage}</span>
          </div>
          <div className="modal-meta-item">
            <span className="app-footer-label">REVIEWS GIVEN</span>
            <span className="app-footer-value">{app.owner_reviews_given}</span>
          </div>
        </div>

        <div className="modal-scroll-body">
          {app.description && (
            <>
              <p className="modal-section-label">ABOUT THIS APP</p>
              <p className="modal-description">{app.description}</p>
            </>
          )}
          <p className="modal-section-label">WHAT THE DEVELOPER IS LOOKING FOR</p>
          <div className="modal-request">{app.request}</div>

          {mode === "exchange" && !exchangeDone && (
            <div className="modal-exchange-form">
              <p className="modal-section-label">YOUR APP</p>
              {myApps.length === 0 ? (
                <p className="modal-description">You haven't submitted any apps yet.</p>
              ) : (
                <select className="filter-select" value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)}>
                  <option value="">Select an app…</option>
                  {myApps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
              <p className="modal-section-label">MESSAGE (OPTIONAL)</p>
              <textarea
                className="modal-request"
                style={{ minHeight: 72, resize: "vertical", cursor: "auto" }}
                value={exchangeMessage}
                onChange={(e) => setExchangeMessage(e.target.value)}
                placeholder="Say why you'd like to exchange feedback…"
              />
              {exchangeError && <p className="modal-error">{exchangeError}</p>}
            </div>
          )}
          {exchangeDone && (
            <p className="modal-description" style={{ color: "#16a34a", fontWeight: 600 }}>
              Exchange request sent to {app.owner_username}!
            </p>
          )}
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          {mode === "info" && (
            <>
              {canReview && (
                <button className="modal-btn-cancel" onClick={() => setMode("exchange")}>Request exchange</button>
              )}
              {canReview ? (
            <div className="profile-review-col">
              <button className="modal-btn-start" onClick={handleStart} disabled={loading || !hasCredits}>
                  {loading ? "Starting…" : "Leave feedback"}
                </button>
              {!hasCredits && (
                <span className="profile-no-credits-msg">
                  {app.owner_username} has no credits available for you to leave feedback
                </span>
              )}
            </div>
          ) : (
            <button className="modal-btn-cancel" onClick={onClose}>Close</button>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
