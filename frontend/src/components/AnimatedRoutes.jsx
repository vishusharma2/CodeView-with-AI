import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Routes } from 'react-router-dom';
import './AnimatedRoutes.css';

const ENTER_DURATION = 600;  // curtain panels slide in (staggered)
const HOLD_DURATION = 400;   // pause with loader visible
const EXIT_DURATION = 700;   // curtain panels slide out (staggered) + page grow

const AnimatedRoutes = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [phase, setPhase] = useState('idle'); // idle | entering | exiting

  const runTransition = useCallback((newLocation) => {
    // Phase 1: Shrink old page + curtain slides in
    setPhase('entering');

    // Phase 2: Swap route behind curtain, then slide curtain out
    setTimeout(() => {
      setDisplayLocation(newLocation);
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Small delay to let React render the new page behind the curtain
      requestAnimationFrame(() => {
        setTimeout(() => {
          setPhase('exiting');

          // Phase 3: Reset everything
          setTimeout(() => {
            setPhase('idle');
          }, EXIT_DURATION);
        }, HOLD_DURATION);
      });
    }, ENTER_DURATION);
  }, []);

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname && phase === 'idle') {
      runTransition(location);
    }
  }, [location, displayLocation.pathname, phase, runTransition]);

  const pageClass = phase === 'entering' ? 'shrinking'
                  : phase === 'exiting'  ? 'growing'
                  : '';

  return (
    <>
      {/* Page content */}
      <div className={`page-wrapper ${pageClass}`}>
        <Routes location={displayLocation}>
          {children}
        </Routes>
      </div>

      {/* Transition overlay */}
      <div className={`transition-container ${phase !== 'idle' ? 'active' : ''} ${phase}`}>
        {/* 4 staggered curtain panels */}
        <div className="curtain-panel" />
        <div className="curtain-panel" />
        <div className="curtain-panel" />
        <div className="curtain-panel" />

        {/* Ambient glow orbs */}
        <div className="ambient-glow glow-1" />
        <div className="ambient-glow glow-2" />

        {/* Floating particles */}
        <div className="transition-particles">
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
        </div>

        {/* Center loader */}
        <div className="transition-loader">
          <div className="spinner-ring">
            <svg viewBox="0 0 100 100">
              <defs>
                <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" />
              <circle cx="50" cy="50" r="45" />
            </svg>
          </div>
          <img src="/logo.png" alt="CodeView" className="transition-logo" />
          <span className="transition-text">Loading</span>
        </div>
      </div>
    </>
  );
};

export default AnimatedRoutes;
