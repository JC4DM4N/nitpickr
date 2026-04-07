import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ReviewsPage.css";
import { STAGE_STYLES } from "../../constants";

export default function MyAppsPage() {
  const navigate = useNavigate()
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/apps/mine", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setApps(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load apps");
        setLoading(false);
      });
  }, []);

  return (
    <div className="reviews-page">
      <div className="reviews-header">
        <h1 className="reviews-title">My Apps</h1>
        <p className="reviews-sub">Apps you have submitted for feedback.</p>
      </div>
      <div className="reviews-body">
        {loading && <p className="reviews-empty">Loading…</p>}
        {error && <p className="reviews-empty">{error}</p>}
        {!loading && !error && apps.length === 0 && (
          <p className="reviews-empty">No apps yet.</p>
        )}
        {!loading && !error && apps.length > 0 && (
          <table className="reviews-table">
            <thead>
              <tr>
                <th>App</th>
                <th>Category</th>
                <th>Stage</th>
                <th>Feedback</th>
                <th>Feedback In Progress</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => navigate(`/my-apps/${app.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div className="reviews-app-cell">
                      <div
                        className="reviews-app-icon"
                        style={{ background: app.color }}
                      >
                        {app.initials}
                      </div>
                      <div>
                        <div className="reviews-app-name">{app.name}</div>
                        <div className="reviews-app-url">{app.url}</div>
                      </div>
                    </div>
                  </td>
                  <td>{app.category}</td>
                  <td>
                    <span
                      className="app-stage-badge"
                      style={STAGE_STYLES[app.stage]}
                    >
                      {app.stage}
                    </span>
                  </td>
                  <td className="reviews-date">{app.approved_count}</td>
                  <td className="reviews-date">
                    {app.in_progress_count > 0 ? (
                      <span className="in-progress-badge">
                        {app.in_progress_count}
                      </span>
                    ) : (
                      0
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
