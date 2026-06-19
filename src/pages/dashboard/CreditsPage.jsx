import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./CreditsPage.css";
import { authFetch } from "../../utils/authFetch";

export default function CreditsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const purchaseSuccess = searchParams.get("purchase") === "success";

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
  }, [purchaseSuccess]);

  return (
    <div className="credits-page">
      <div className="credits-page-header">
        <div className="credits-page-title-row">
          <h1 className="credits-page-title">Credits</h1>
          <button
            className="credits-buy-btn"
            onClick={() => navigate("/credits/get-more")}
          >
            Get more credits →
          </button>
        </div>
        <p className="credits-page-sub">
          Credits are spent when you approve feedback on your projects, and earned
          when your reviews are approved.
        </p>
      </div>

      <div className="credits-page-body">
        {purchaseSuccess && (
          <div className="credits-success-banner">
            Payment successful — your credits have been added to your account.
          </div>
        )}

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
            hint="Paid out for approved feedback on your project"
          />
        </div>

      </div>

      <div className="credits-explainer-wrap">
      <div className="credits-explainer">
        <p className="credits-explainer-heading">HOW CREDITS WORK</p>
        <ul className="credits-explainer-list">
          <li>
            Each credit allows your app receive one round of feedback from a
            real developer.
          </li>
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
