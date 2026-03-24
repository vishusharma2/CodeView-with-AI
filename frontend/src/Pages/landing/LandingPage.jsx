import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);

  const handleGetStarted = () => navigate("/join");

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  // Parallax floating effect for hero mockup
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!heroRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      heroRef.current.style.transform = `translate(${x}px, ${y}px) rotateX(${-y * 0.5}deg) rotateY(${x * 0.5}deg)`;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="landing-root">
      {/* ========== NAVBAR ========== */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-nav-left">
            <img src="/icon.png" alt="CodeView" className="landing-nav-logo" />
            <span className="landing-nav-title">CodeView</span>
          </div>
          <div className="landing-nav-links">
            <button onClick={scrollToFeatures} className="landing-nav-link">Features</button>
            <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="landing-nav-link">How it Works</button>
          </div>
          <button onClick={handleGetStarted} className="landing-nav-cta">
            Get Started
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="landing-hero">
        {/* Animated background orbs */}
        <div className="landing-orb landing-orb-1"></div>
        <div className="landing-orb landing-orb-2"></div>
        <div className="landing-orb landing-orb-3"></div>

        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <span className="landing-badge-dot"></span>
            Real-time Collaborative IDE
          </div>
          <h1 className="landing-hero-title">
            Build. Collaborate. <br />
            <span className="landing-hero-gradient">Code Together.</span>
          </h1>
          <p className="landing-hero-subtitle">
            The powerful collaborative code editor with AI assistance, video calls,
            and multi-language support. Create a room, share the link, and start
            building — together, in real time.
          </p>
          <div className="landing-hero-actions">
            <button onClick={handleGetStarted} className="landing-btn-primary" id="get-started-hero">
              Get Started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
            <button onClick={scrollToFeatures} className="landing-btn-secondary">
              Learn More
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          </div>
        </div>

        {/* Floating code editor mockup */}
        <div className="landing-hero-mockup" ref={heroRef}>
          <div className="mockup-window">
            <div className="mockup-titlebar">
              <div className="mockup-dots">
                <span className="mockup-dot mockup-dot-red"></span>
                <span className="mockup-dot mockup-dot-yellow"></span>
                <span className="mockup-dot mockup-dot-green"></span>
              </div>
              <span className="mockup-filename">main.py — CodeView</span>
              <div className="mockup-actions">
                <span className="mockup-live-badge">
                  <span className="mockup-live-dot"></span>
                  2 collaborators
                </span>
              </div>
            </div>
            <div className="mockup-code">
              <div className="mockup-line-numbers">
                {[1,2,3,4,5,6,7,8,9,10,11].map(n => <span key={n}>{n}</span>)}
              </div>
              <pre className="mockup-code-content">
                <code>
                  <span className="code-keyword">import</span> <span className="code-module">openai</span>{"\n"}
                  <span className="code-keyword">from</span> <span className="code-module">flask</span> <span className="code-keyword">import</span> <span className="code-func">Flask</span>, <span className="code-func">jsonify</span>{"\n"}
                  {"\n"}
                  <span className="code-var">app</span> = <span className="code-func">Flask</span>(<span className="code-string">__name__</span>){"\n"}
                  {"\n"}
                  <span className="code-decorator">@app.route</span>(<span className="code-string">"/api/generate"</span>){"\n"}
                  <span className="code-keyword">def</span> <span className="code-func">generate</span>():{"\n"}
                  {"  "}<span className="code-var">response</span> = openai.<span className="code-func">chat</span>(<span className="code-comment"># AI magic ✨</span>{"\n"}
                  {"    "}<span className="code-var">model</span>=<span className="code-string">"gpt-4o"</span>,{"\n"}
                  {"  "}){"\n"}
                  {"  "}<span className="code-keyword">return</span> <span className="code-func">jsonify</span>(<span className="code-var">response</span>)<span className="mockup-cursor"></span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section className="landing-features" id="features">
        <div className="landing-section-header">
          <span className="landing-section-label">Features</span>
          <h2 className="landing-section-title">Everything you need to code together</h2>
          <p className="landing-section-desc">Powerful tools built for modern development teams</p>
        </div>

        <div className="landing-features-grid">
          {[
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              ),
              title: "Real-time Collaboration",
              description: "Code together with live cursor tracking, instant syncing, and seamless multi-user editing — just like Google Docs for code.",
              color: "#6366f1",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 0 1 5 5c0 2-1.5 3.5-3 4.5V13H10v-1.5C8.5 10.5 7 9 7 7a5 5 0 0 1 5-5Z"/><path d="M10 17h4"/><path d="M10 21h4"/><path d="M10 13h4v4h-4z"/></svg>
              ),
              title: "AI Code Assistant",
              description: "Get intelligent suggestions, debug faster, and generate code with the built-in AI assistant that understands your entire project context.",
              color: "#f59e0b",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="12" y1="2" x2="12" y2="22" opacity="0.3"/></svg>
              ),
              title: "Multi-Language Support",
              description: "Write in Python, JavaScript, C++, Java, Go, Rust and many more — with syntax highlighting, IntelliSense, and one-click execution.",
              color: "#10b981",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
              ),
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
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="landing-how-it-works" id="how-it-works">
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
              icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              ),
            },
            {
              step: "02",
              title: "Share the Link",
              desc: "Invite teammates by sharing the room ID. They join instantly — no sign-up required.",
              icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              ),
            },
            {
              step: "03",
              title: "Start Building",
              desc: "Write, run and debug code together in real time with AI assistance and video calls.",
              icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
              ),
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
          <button onClick={handleGetStarted} className="landing-btn-primary landing-btn-lg" id="get-started-bottom">
            Get Started — It's Free
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
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

export default LandingPage;
