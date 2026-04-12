import { useNavigate } from "react-router-dom";
import { Nav, HowItWorks, Footer } from "./LandingPage";
import "./LandingPage.css";

export default function HowItWorksPage() {
  const navigate = useNavigate();
  return (
    <div className="landing">
      <HowItWorks />
      <Footer />
    </div>
  );
}
