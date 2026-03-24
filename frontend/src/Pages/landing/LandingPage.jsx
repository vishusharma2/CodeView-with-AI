import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { ArrowRightIcon, ChevronDownIcon } from "../../components/Icons";

const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  const handleGetStarted = () => navigate("/join");

  // Preloader timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setLoading(false), 600);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

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

      {/* ========== PRELOADER ========== */}
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'linear-gradient(135deg, #060918 0%, #0d1030 50%, #060918 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28px',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          opacity: fadeOut ? 0 : 1,
          transform: fadeOut ? 'scale(1.05)' : 'scale(1)',
        }}>
          {/* Ambient glow */}
          <div style={{ position:'absolute', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)', filter:'blur(100px)' }} />

          {/* Spinner ring */}
          <div style={{ position:'relative', width:'100px', height:'100px' }}>
            <svg viewBox="0 0 100 100" style={{ position:'absolute', inset:0, width:'100%', height:'100%', animation:'preloaderSpin 1.2s linear infinite' }}>
              <defs>
                <linearGradient id="preloaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="3" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="url(#preloaderGrad)" strokeWidth="3"
                strokeLinecap="round" strokeDasharray="200" strokeDashoffset="140"
                style={{ animation:'preloaderDash 1.5s ease-in-out infinite' }} />
            </svg>
            {/* Logo inside ring */}
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src="/logo.png" alt="CodeView" style={{
                width:'50px', height:'50px', objectFit:'contain',
                filter:'drop-shadow(0 0 20px rgba(99,102,241,0.5))',
                animation:'preloaderPulse 2s ease-in-out infinite',
              }} />
            </div>
          </div>

          {/* Text */}
          <span style={{
            fontFamily:"'Space Grotesk','Inter',sans-serif", fontSize:'13px', fontWeight:600,
            letterSpacing:'4px', textTransform:'uppercase',
            background:'linear-gradient(90deg, rgba(255,255,255,0.4), #818cf8, #a78bfa, rgba(255,255,255,0.4))',
            backgroundSize:'300% 100%', WebkitBackgroundClip:'text', backgroundClip:'text',
            WebkitTextFillColor:'transparent', animation:'preloaderShimmer 2s ease-in-out infinite',
          }}>
            Loading
          </span>

          {/* Dots */}
          <div style={{ display:'flex', gap:'6px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width:'6px', height:'6px', borderRadius:'50%', background:'#6366f1',
                animation:`preloaderBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
              }} />
            ))}
          </div>

          <style>{`
            @keyframes preloaderSpin { 100% { transform: rotate(360deg); } }
            @keyframes preloaderDash { 0% { stroke-dashoffset: 200; } 50% { stroke-dashoffset: 60; } 100% { stroke-dashoffset: 200; } }
            @keyframes preloaderPulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.08); opacity:0.8; } }
            @keyframes preloaderShimmer { 0% { background-position:100% 50%; } 100% { background-position:-100% 50%; } }
            @keyframes preloaderBounce { 0%,80%,100% { transform:scale(0); opacity:0.3; } 40% { transform:scale(1); opacity:1; } }
          `}</style>
        </div>
      )}
      <Navbar />

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
              <ArrowRightIcon size={18} />
            </button>
            <button onClick={() => navigate("/features")} className="landing-btn-secondary">
              Learn More
              <ChevronDownIcon size={18} />
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
