import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { PlusIcon, LinkIcon, TerminalIcon, ArrowRightIcon } from "../../components/Icons";

const HowItWorksPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-root">
      <Navbar />

      <section className="landing-how-it-works" id="how-it-works" style={{ paddingTop: '140px' }}>
        <div className="landing-section-header">
          <span className="landing-section-label">How it works</span>
          <h2 className="landing-section-title">Start coding in seconds</h2>
          <p className="landing-section-desc">Three simple steps to begin collaborating</p>
        </div>

        <div className="landing-steps">
          {[
            {
              step: "01",
              title: "Create a Room",
              desc: "Set up a private coding room with one click. Choose your language and configure settings.",
              icon: <PlusIcon />,
            },
            {
              step: "02",
              title: "Share the Link",
              desc: "Invite teammates by sharing the room ID. They join instantly — no sign-up required.",
              icon: <LinkIcon />,
            },
            {
              step: "03",
              title: "Start Building",
              desc: "Write, run and debug code together in real time with AI assistance and video calls.",
              icon: <TerminalIcon />,
            },
          ].map((s, i) => (
            <div key={i} className="landing-step-card">
              <div className="step-number">{s.step}</div>
              <div className="step-icon-wrap">{s.icon}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="landing-cta-bottom">
          <button onClick={() => navigate("/join")} className="landing-btn-primary landing-btn-lg">
            Get Started — It's Free
            <ArrowRightIcon size={20} />
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <img src="/icon.png" alt="CodeView" className="landing-footer-logo" />
            <span className="landing-footer-name">CodeView</span>
          </div>
          <p className="landing-footer-copy">© 2026 CodeView. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HowItWorksPage;
