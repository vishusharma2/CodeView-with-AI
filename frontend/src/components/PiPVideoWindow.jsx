import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VideoCameraIcon } from '../icons';

const PiPVideoWindow = ({ children, isMinimized, onToggleMinimize, onClose }) => {
  const windowRef = useRef(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: window.innerWidth - 520, y: 60 });

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
      className={`pip-window fixed z-[9999] bg-[#1a1a2e] rounded-xl border border-indigo-500/30 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] cursor-grab active:cursor-grabbing transition-[width,box-shadow] duration-200 ${isMinimized ? 'w-60' : 'w-[420px]'}`}
      style={{
        left: position.x,
        top: position.y
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between py-2 px-3 bg-white/[0.04] border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-200 pointer-events-none">
          <VideoCameraIcon size={14} />
          <span>Video Call</span>
          <span className="pip-live-dot w-1.5 h-1.5 bg-green-500 rounded-full"></span>
        </div>
        <div className="pip-actions flex gap-0.5">
          <button
            onClick={onToggleMinimize}
            title={isMinimized ? 'Expand' : 'Minimize'}
            className="w-[22px] h-[22px] border-none bg-transparent text-white/50 rounded cursor-pointer text-sm flex items-center justify-center transition-all duration-150 hover:bg-white/10 hover:text-white"
          >
            {isMinimized ? '□' : '−'}
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="w-[22px] h-[22px] border-none bg-transparent text-white/50 rounded cursor-pointer text-sm flex items-center justify-center transition-all duration-150 hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="h-80 cursor-default pip-no-drag">
          {children}
        </div>
      )}
    </div>
  );
};

export default PiPVideoWindow;
