import { useState } from "react";
import { HowItWorks, HowItWorksExchanges } from "../landing/LandingPage";
import "../landing/LandingPage.css";

const TABS = [
  { key: "credits", label: "Credit reviews" },
  { key: "exchanges", label: "Feedback exchanges" },
];

export default function HowItWorksPage() {
  const [tab, setTab] = useState("credits");

  return (
    <div>
      <div className="reviews-tabs" style={{ padding: "24px 24px 0", marginBottom: 0 }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`reviews-tab${tab === key ? " reviews-tab--active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "credits" && (
        <HowItWorks white links={['/my-apps/new', '/explore', '/reviews']} />
      )}
      {tab === "exchanges" && (
        <HowItWorksExchanges white links={[
          { to: '/explore', state: { tab: 'users' } },
          { to: '/exchanges', state: { tab: 'sent' } },
          null,
        ]} />
      )}
    </div>
  );
}
