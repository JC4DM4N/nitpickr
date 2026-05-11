import { useState, useEffect } from "react";
import "./CreditsPage.css";
import { authFetch } from "../../utils/authFetch";

export default function CreditsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    authFetch("/users/me/credits", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="credits-page">
      <div className="credits-page-header">
        <h1 className="credits-page-title">Credits</h1>
        <p className="credits-page-sub">
          Credits are spent when you approve feedback on your apps, and earned
          when your reviews are approved.
        </p>
      </div>

      <div className="credits-stats-grid">
        <StatCard
          label="Available"
          value={loading ? "—" : data?.available}
          hint="Ready to spend"
          accent
        />
        <StatCard
          label="In Escrow"
          value={loading ? "—" : data?.in_escrow}
          hint="Locked while reviews are active"
        />
        <StatCard
          label="Total Holdings"
          value={loading ? "—" : data?.total}
          hint="Available + in escrow"
        />
      </div>

      <div className="credits-divider" />

      <div className="credits-stats-grid">
        <StatCard
          label="Total Earned"
          value={loading ? "—" : data?.earned_ever}
          hint="From approved reviews you submitted"
          positive
        />
        <StatCard
          label="Total Spent"
          value={loading ? "—" : data?.spent_ever}
          hint="Paid out for approved feedback on your apps"
        />
      </div>

      <div className="credits-explainer">
        <p className="credits-explainer-heading">HOW CREDITS WORK</p>
        <ul className="credits-explainer-list">
          <li>
            Each app you list has a credit value. When someone reviews your app
            and you approve it, that credit is transferred to the reviewer.
          </li>
          <li>
            While a review is in progress, the credit is held in escrow — you
            cannot spend it elsewhere until the review concludes.
          </li>
          <li>
            If a review is rejected or the reviewer abandons it, the credit
            returns to your available balance.
          </li>
          <li>
            Apps owned by users with no available credits are hidden from
            Explore until credits are topped up.
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint, accent, positive }) {
  return (
    <div
      className={`credits-stat-card${accent ? " credits-stat-card--accent" : ""}${positive ? " credits-stat-card--positive" : ""}`}
    >
      <p className="credits-stat-label">{label}</p>
      <div className="credits-stat-value">{value ?? "—"}</div>
      <p className="credits-stat-hint">{hint}</p>
    </div>
  );
}
