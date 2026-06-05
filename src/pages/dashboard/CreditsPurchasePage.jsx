import { useState } from "react";
import "./CreditsPurchasePage.css";
import { authFetch } from "../../utils/authFetch";

const PRICE_PER_CREDIT = 3;
const MAX_CREDITS = 5;

export default function CreditsPurchasePage() {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function decrement() {
    setQuantity((q) => Math.max(1, q - 1));
  }

  function increment() {
    setQuantity((q) => Math.min(MAX_CREDITS, q + 1));
  }

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await authFetch("/payments/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Something went wrong. Please try again.");
        return;
      }
      const { checkout_url } = await res.json();
      window.location.href = checkout_url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const total = quantity * PRICE_PER_CREDIT;

  return (
    <div className="cp-page">
      <div className="cp-header">
        <h1 className="cp-title">Buy Credits</h1>
        <p className="cp-sub">
          Credits let you receive feedback on your apps from the NitPickr
          community.
        </p>
      </div>

      <div className="cp-contents">
        <div className="cp-card">
          <p className="cp-section-label">HOW MANY CREDITS?</p>
          <p className="cp-price-hint">
            ${PRICE_PER_CREDIT} per credit · max {MAX_CREDITS} per purchase
          </p>

          <div className="cp-quantity-row-container">
            <div className="cp-quantity-row">
              <button
                className="cp-qty-btn"
                onClick={decrement}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="cp-qty-value">{quantity}</span>
              <button
                className="cp-qty-btn"
                onClick={increment}
                disabled={quantity >= MAX_CREDITS}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <div className="cp-breakdown">
            <div className="cp-breakdown-row">
              <span>
                {quantity} credit{quantity !== 1 ? "s" : ""} × $
                {PRICE_PER_CREDIT}
              </span>
              <span>${total}.00</span>
            </div>
            <div className="cp-breakdown-total">
              <span>Total</span>
              <span>${total}.00 USD</span>
            </div>
          </div>

          {error && <p className="cp-error">{error}</p>}

          <button
            className="cp-checkout-btn"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? "Redirecting…" : `Pay $${total}.00 with Stripe →`}
          </button>

          <p className="cp-stripe-note">
            Secure payment via Stripe. Credits are added to your account
            automatically after payment.
          </p>
        </div>

        <div className="cp-explainer">
          <p className="cp-section-label">HOW CREDITS WORK</p>
          <ul className="cp-explainer-list">
            <li>
              Each credit allows your app receive one round of feedback from a
              real developer.
            </li>
            <li>
              Each app you list has a credit value. When someone reviews your 
              app and you approve it, that credit is transferred to the reviewer.
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
