import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon } from "../components/Icons";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="landing-nav">
      <div className="landing-nav-inner">
        <div className="landing-nav-left" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <img src="/icon.png" alt="CodeView" className="landing-nav-logo" />
          <span className="landing-nav-title">CodeView</span>
        </div>
        <div className="landing-nav-links">
          <button onClick={() => navigate("/features")} className="landing-nav-link">Features</button>
          <button onClick={() => navigate("/how-it-works")} className="landing-nav-link">How it Works</button>
          <button onClick={() => navigate("/contact")} className="landing-nav-link">Contact</button>
        </div>
        <button onClick={() => navigate("/join")} className="landing-nav-cta">
          Get Started
          <ArrowRightIcon size={16} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
