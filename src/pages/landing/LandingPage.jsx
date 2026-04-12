import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const onLogin = () => navigate("/login");
  const onGetStarted = () => navigate("/signup");
  const onSignUp = () => navigate("/signup");
  return (
    <div className="landing">
      <Nav onLogin={onLogin} onSignUp={onSignUp ?? onGetStarted} />
      <Hero onGetStarted={onGetStarted} />
      <HowItWorks />
      <Features />
      {/* <Testimonials /> */}
      <CTA onGetStarted={onGetStarted} />
      <Footer />
    </div>
  );
}

export function Nav({ onLogin, onSignUp }) {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <a href="/" className="logo">
          <img src="/nitpickr_logo.svg" alt="NitPickr" height="30" />
        </a>
        <div className="nav-links">
          <a href="/how-it-works">How it works</a>
          <a href="#features">Features</a>
        </div>
        <div className="nav-actions">
          <button onClick={onLogin} className="btn btn-ghost">
            Log in
          </button>
          <button onClick={onSignUp} className="btn btn-primary">
            Get started
          </button>
        </div>
      </div>
    </nav>
  );
}

function Hero({ onGetStarted }) {
  return (
    <section className="hero">
      <div className="hero-badge">
        <span className="badge-dot"></span>
        Completely free beta testing for your app
      </div>
      <h1 className="hero-headline">
        Real feedback from
        <br />
        <span className="gradient-text">real indie developers</span>
      </h1>
      <p className="hero-sub">
        Post your app. Give feedback on others. Get honest, actionable feedback
        in return.
        <br />A community where indie developers help each other ship better
        products.
      </p>
      <div className="hero-actions">
        <button onClick={onGetStarted} className="btn btn-primary btn-lg">
          Submit your app - it's free!
        </button>
        <a href="/how-it-works" className="btn btn-outline btn-lg">
          See how it works
        </a>
      </div>
      {/* <div className="hero-social-proof">
        <div className="avatars">
          {['A', 'B', 'C', 'D', 'E'].map((l, i) => (
            <div key={i} className="avatar" style={{ '--hue': i * 40 }}>{l}</div>
          ))}
        </div>
        <p>Join <strong>500+</strong> indie developers already sharing feedback</p>
      </div>
      <div className="hero-visual">
        <AppCard
          name="TaskFlow"
          url="taskflow.app"
          tag="Productivity"
          feedbackCount={8}
          credits={3}
        />
        <FeedbackCard
          reviewer="Marcus K."
          time="2 hours ago"
          text="The onboarding flow is really smooth! I'd suggest making the dashboard stats more prominent — that's the first thing I look for."
          rating={4}
        />
        <AppCard
          name="PixelPerfect"
          url="pixelperfect.io"
          tag="Design"
          feedbackCount={12}
          credits={5}
        />
      </div> */}
    </section>
  );
}

function AppCard({ name, url, tag, feedbackCount, credits }) {
  return (
    <div className="mock-app-card">
      <div className="mock-app-header">
        <div className="mock-app-icon">{name[0]}</div>
        <div>
          <div className="mock-app-name">{name}</div>
          <div className="mock-app-url">{url}</div>
        </div>
        <span className="mock-tag">{tag}</span>
      </div>
      <div className="mock-app-meta">
        <span>💬 {feedbackCount} feedbacks</span>
        <span>⭐ {credits} credits earned</span>
      </div>
    </div>
  );
}

function FeedbackCard({ reviewer, time, text, rating }) {
  return (
    <div className="mock-feedback-card">
      <div className="mock-feedback-header">
        <div className="mock-reviewer-avatar">{reviewer[0]}</div>
        <div>
          <div className="mock-reviewer-name">{reviewer}</div>
          <div className="mock-feedback-time">{time}</div>
        </div>
        <div className="mock-rating">
          {"★".repeat(rating)}
          {"☆".repeat(5 - rating)}
        </div>
      </div>
      <p className="mock-feedback-text">{text}</p>
    </div>
  );
}

export function HowItWorks({ white }) {
  const steps = [
    {
      number: "01",
      icon: "🚀",
      title: "Submit your app",
      desc: "Add your app with a link, description, and what kind of feedback you're looking for.",
    },
    {
      number: "02",
      icon: "💬",
      title: "Give feedback to others",
      desc: "Browse apps from other indie developers and leave honest, constructive feedback. Each feedback earns you a credit once approved by the app owner.",
    },
    {
      number: "03",
      icon: "📬",
      title: "Receive feedback",
      desc: "Spend your credits when getting feedback on your own app. Credits are only spent once you approve the reviewers feedback.",
    },
  ];

  return (
    <section id="how-it-works" className={`section${white ? '' : ' how-it-works-section'}`}>
      <div className="section-label">How it works</div>
      {/* <h2 className="section-title">Simple. Fair. Effective.</h2> */}
      <h2 className="section-title">A review-for-review economy.</h2>
      <p className="section-sub">
        A credit-based system that keeps the community balanced — everyone gives
        as much as they receive.
      </p>
      <div className="steps">
        {steps.map((step, i) => (
          <div key={i} className="step">
            <div className="step-number">{step.number}</div>
            <div className="step-icon">{step.icon}</div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
            {i < steps.length - 1 && <div className="step-connector" />}
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: "⚖️",
      title: "Balanced credit system",
      desc: "Give one feedback, earn one credit. Spend a credit to receive feedback. Simple and fair for everyone.",
    },
    {
      icon: "🎯",
      title: "Targeted feedback requests",
      desc: "Specify what you want feedback on — UX, onboarding, pricing, features. Get answers to your actual questions.",
    },
    {
      icon: "✅",
      title: "Quality ensured feedback",
      desc: "Credits are only awarded once you approve the feedback you receive. No incentive to spam — reviewers earn only when their feedback is genuinely useful.",
    },
    {
      icon: "🙋",
      title: "Get your first users",
      desc: "Every reviewer who tries your app is a real user. Guaranteed eyes on your product from day one — some of them might stick around and become your first paying customers.",
    },
    {
      icon: "🎉",
      title: "It's completely free!",
      desc: "No subscriptions, no paywalls, no credit card required. NitPickr is 100% free — just sign up and start getting feedback today.",
    },
    {
      icon: "⚡",
      title: "Fast turnaround",
      desc: "Reviewers are given 24 hours to submit their feedback, ensuring quick feedback cycles for faster shipping.",
    },
    // {
    //   icon: '🌍',
    //   title: 'Built for indie developers',
    //   desc: 'No enterprise noise. Just solo founders, indie hackers, and small teams building real products.',
    // },
  ];

  return (
    <section id="features" className="section section-alt">
      <div className="section-label">Features</div>
      <h2 className="section-title">Everything you need to improve your app</h2>
      <p className="section-sub">
        Built by indie developers, for indie developers.
      </p>
      <div className="features-grid">
        {features.map((f, i) => (
          <div key={i} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      quote:
        "Got 6 pieces of feedback in the first day. One of them pointed out a UX issue I'd been blind to for months. Worth every credit.",
      name: "Sarah L.",
      role: "Founder, Notely",
    },
    {
      quote:
        "I love that I can keep the feedback private. Some of my early testers were brutally honest — exactly what I needed.",
      name: "James T.",
      role: "Indie developer",
    },
    {
      quote:
        "The credit system is genius. You're forced to actually engage with other people's work, which makes you a better builder too.",
      name: "Priya M.",
      role: "Solo founder",
    },
  ];

  return (
    <section className="section">
      <div className="section-label">What developers say</div>
      <h2 className="section-title">Real feedback about feedback</h2>
      <div className="testimonials-grid">
        {testimonials.map((t, i) => (
          <div key={i} className="testimonial-card">
            <p className="testimonial-quote">"{t.quote}"</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">{t.name[0]}</div>
              <div>
                <div className="testimonial-name">{t.name}</div>
                <div className="testimonial-role">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA({ onGetStarted }) {
  const stages = [
    // { icon: '💡', label: 'Just an idea', desc: "Validate your concept before writing a single line of code." },
    {
      icon: "🔧",
      label: "Early prototype",
      desc: "Get a gut-check on your UX before you build the wrong thing.",
    },
    {
      icon: "🚀",
      label: "Beta / pre-launch",
      desc: "Iron out the rough edges before you go public.",
    },
    {
      icon: "📈",
      label: "Already live",
      desc: "Keep improving with ongoing feedback from fresh eyes.",
    },
  ];

  return (
    <section className="cta-section">
      <div className="cta-inner">
        <div className="cta-badge">Completely free — no credit card needed</div>
        <h2>Ready to stop guessing?</h2>
        <p>
          Submit your app at whatever stage it's at. You don't need a finished
          product — you just need a willingness to give and receive honest
          feedback.
        </p>
        {/* <div className="cta-stages">
          {stages.map((s, i) => (
            <div key={i} className="cta-stage-card">
              <span className="cta-stage-icon">{s.icon}</span>
              <span className="cta-stage-label">{s.label}</span>
              <span className="cta-stage-desc">{s.desc}</span>
            </div>
          ))}
        </div>
         */}
        <div className="cta-stages">
          {stages.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <span className="cta-stage-label">{f.label}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
        <button onClick={onGetStarted} className="btn btn-primary btn-lg">
          Submit your app - it's free!
        </button>
        <p className="cta-note">No credit card. No paid plans. No catch.</p>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <a href="/" className="logo">
            <img src="/nitpickr_logo.svg" alt="NitPickr" height="30" />
          </a>
          <p>Real feedback from real indie developers.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#">How it works</a>
            <a href="#">Features</a>
            <a href="#">Pricing</a>
          </div>
          <div className="footer-col">
            <h4>Community</h4>
            <a href="#">Browse apps</a>
            <a href="#">Leaderboard</a>
            <a href="#">Blog</a>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 NitPickr. Made with ♥ for indie developers.</p>
      </div>
    </footer>
  );
}
