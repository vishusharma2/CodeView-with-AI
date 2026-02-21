import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const codeSnippets = [
  'const room = await createRoom();',
  'socket.emit("join", { roomId });',
  'function collaborate() { ... }',
  'import { CodeView } from "app";',
  'git commit -m "fix: 404"',
  'console.log("connected!");',
  'export default Editor;',
  'npm run dev',
];

const particles = ['</>', '{}', '()', '//', '[]', '=>', '&&', '::'];

const NotFound = () => {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="notfound-page">
      {/* Background floating code cards */}
      <div className="notfound-bg-elements">
        {codeSnippets.map((snippet, i) => (
          <div
            key={`card-${i}`}
            className={`notfound-code-card notfound-code-card-${i}`}
          >
            <span className="notfound-card-line-num">{i + 1}</span>
            <span className="notfound-card-code">{snippet}</span>
          </div>
        ))}
        {particles.map((p, i) => (
          <div
            key={`particle-${i}`}
            className={`notfound-particle notfound-particle-${i}`}
          >
            {p}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className={`notfound-content ${showContent ? "notfound-visible" : ""}`}>
        {/* Glitch 404 */}
        <div className="notfound-glitch-wrapper">
          <h1 className="notfound-glitch" data-text="404">
            404
          </h1>
        </div>

        {/* Terminal-style message */}
        <div className="notfound-terminal">
          <div className="notfound-terminal-bar">
            <span className="notfound-terminal-dot notfound-dot-red"></span>
            <span className="notfound-terminal-dot notfound-dot-yellow"></span>
            <span className="notfound-terminal-dot notfound-dot-green"></span>
            <span className="notfound-terminal-title">terminal</span>
          </div>
          <div className="notfound-terminal-body">
            <div className="notfound-terminal-line">
              <span className="notfound-prompt">$</span>
              <span className="notfound-typing">navigate --to requested-page</span>
            </div>
            <div className="notfound-terminal-line notfound-error-line">
              <span className="notfound-error-prefix">ERROR:</span>
              <span> Page not found in this project</span>
            </div>
            <div className="notfound-terminal-line notfound-hint-line">
              <span className="notfound-prompt">$</span>
              <span className="notfound-typing-delayed">
                suggest --fix "Return to home"
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="notfound-description">
          Looks like this route doesn't exist in our codebase.
          <br />
          Let's get you back to collaborating.
        </p>

        {/* Action buttons */}
        <div className="notfound-actions">
          <button
            className="notfound-btn notfound-btn-primary"
            onClick={() => navigate("/")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Go Home
          </button>
          <button
            className="notfound-btn notfound-btn-secondary"
            onClick={() => navigate(-1)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Go Back
          </button>
        </div>

        {/* Floating status badge */}
        <div className="notfound-status-badge">
          <span className="notfound-status-dot"></span>
          CodeView is running — you're just on the wrong route
        </div>
      </div>
    </div>
  );
};

export default NotFound;
