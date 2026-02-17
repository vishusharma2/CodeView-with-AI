import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VideoCameraIcon } from '../icons';

const PiPVideoWindow = ({ children, isMinimized, onToggleMinimize, onClose }) => {
  const windowRef = useRef(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: window.innerWidth - 520, y: 60 });

  // Clamp position to viewport
  const clampPosition = useCallback((x, y) => {
    const el = windowRef.current;
    if (!el) return { x, y };
    const rect = el.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY))
    };
  }, []);

  const handleMouseDown = useCallback((e) => {
    // Don't drag if clicking on buttons or interactive elements
    if (e.target.closest('.pip-actions') || e.target.closest('.pip-no-drag')) return;
    
    isDragging.current = true;
    const rect = windowRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    const clamped = clampPosition(newX, newY);
    setPosition(clamped);
  }, [clampPosition]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Reclamp on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => clampPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);

  return (
    <div
      ref={windowRef}
      className={`pip-window ${isMinimized ? 'pip-minimized' : ''}`}
      style={{
        left: position.x,
        top: position.y
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="pip-header">
        <div className="pip-header-left">
          <VideoCameraIcon size={14} />
          <span>Video Call</span>
          <span className="pip-live-dot"></span>
        </div>
        <div className="pip-actions">
          <button onClick={onToggleMinimize} title={isMinimized ? 'Expand' : 'Minimize'}>
            {isMinimized ? '□' : '−'}
          </button>
          <button onClick={onClose} title="Close">×</button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="pip-content pip-no-drag">
          {children}
        </div>
      )}
    </div>
  );
};

export default PiPVideoWindow;
