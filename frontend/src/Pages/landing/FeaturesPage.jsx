import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { CollaborationIcon, AIAssistantIcon, MultiLanguageIcon, VideoCallIcon, ArrowRightIcon } from "../../components/Icons";

const FeaturesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-root">
      <Navbar />

      <section className="landing-features" id="features" style={{ paddingTop: '140px' }}>
        <div className="landing-section-header">
          <span className="landing-section-label">Features</span>
          <h2 className="landing-section-title">Everything you need to code together</h2>
          <p className="landing-section-desc">Powerful tools built for modern development teams</p>
        </div>

        <div className="landing-features-grid">
          {[
            {
              icon: <CollaborationIcon />,
              title: "Real-time Collaboration",
              description: "Code together with live cursor tracking, instant syncing, and seamless multi-user editing — just like Google Docs for code.",
              color: "#6366f1",
            },
            {
              icon: <AIAssistantIcon />,
              title: "AI Code Assistant",
              description: "Get intelligent suggestions, debug faster, and generate code with the built-in AI assistant that understands your entire project context.",
              color: "#f59e0b",
            },
            {
              icon: <MultiLanguageIcon />,
              title: "Multi-Language Support",
              description: "Write in Python, JavaScript, C++, Java, Go, Rust and many more — with syntax highlighting, IntelliSense, and one-click execution.",
              color: "#10b981",
            },
            {
              icon: <VideoCallIcon />,
              title: "Built-in Video Calls",
              description: "Jump on a video call without leaving the editor. Perfect for pair programming, code reviews, and technical interviews.",
              color: "#ec4899",
            },
          ].map((feature, i) => (
            <div key={i} className="landing-feature-card" style={{ "--card-accent": feature.color }}>
              <div className="feature-icon-wrap" style={{ background: `${feature.color}15`, color: feature.color }}>
                {feature.icon}
              </div>
              <h3 className="feature-card-title">{feature.title}</h3>
              <p className="feature-card-desc">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="landing-cta-bottom" style={{ marginTop: '60px' }}>
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

export default FeaturesPage;
