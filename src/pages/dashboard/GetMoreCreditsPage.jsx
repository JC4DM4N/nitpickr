import { useNavigate } from "react-router-dom";
import "./GetMoreCreditsPage.css";

export default function GetMoreCreditsPage() {
  const navigate = useNavigate();

  return (
    <div className="gmc-page">
      <div className="gmc-header">
        <h1 className="gmc-title">Get More Credits</h1>
        <p className="gmc-sub">
          Credits let you receive feedback on your apps. Earn them by leaving reviews, or buy them instantly.
        </p>
      </div>

      <div className="gmc-cards">
        <div className="gmc-card">
          <p className="gmc-label">PURCHASE</p>
          <h2 className="gmc-card-title">Buy credits</h2>
          <p className="gmc-card-desc">
            Buy credits directly, no need to leave feedback on other apps. Each credit costs{" "}
            <strong>$3</strong> and is added to your account instantly after
            payment.
          </p>

          <div className="gmc-price-badge">$3 <span>/ credit</span></div>

          <div className="gmc-card-actions">
            <button
              className="gmc-btn gmc-btn--primary"
              onClick={() => navigate("/credits/purchase")}
            >
              Buy credits →
            </button>
          </div>
        </div>

        <div className="gmc-card">
          <p className="gmc-label">EARN</p>
          <h2 className="gmc-card-title">Review an app</h2>
          <p className="gmc-card-desc">
            Leave high-quality feedback on someone else's app and earn a credit
            when they approve your review.
          </p>

          <ol className="gmc-steps">
            <li>Browse apps in Explore and start a review.</li>
            <li>Submit detailed, constructive feedback.</li>
            <li>The app owner approves your review - a credit lands in your account.</li>
          </ol>

          <div className="gmc-card-actions">
            <button className="gmc-btn gmc-btn--primary" onClick={() => navigate("/explore")}>
              Explore apps →
            </button>
            <button className="gmc-btn gmc-btn--ghost" onClick={() => navigate("/how-it-works")}>
              How it works
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
