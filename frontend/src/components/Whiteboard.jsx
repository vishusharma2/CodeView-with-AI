import React, { useRef, useState, useEffect, useCallback } from 'react';
import ACTIONS from '../Actions';

const Whiteboard = ({ socketRef, roomId }) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  
  // Drawing state
  const [tool, setTool] = useState('pen'); // pen, eraser
  const [color, setColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(3);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Restore context settings after resize
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctxRef.current = ctx;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socketRef.current) return;

    const handleDraw = (data) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.strokeStyle = data.tool === 'eraser' ? '#1a1a2e' : data.color;
      ctx.lineWidth = data.tool === 'eraser' ? 20 : data.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(data.startX, data.startY);
      ctx.lineTo(data.endX, data.endY);
      ctx.stroke();
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socketRef.current.on(ACTIONS.WHITEBOARD_DRAW, handleDraw);
    socketRef.current.on(ACTIONS.WHITEBOARD_CLEAR, handleClear);

    return () => {
      socketRef.current.off(ACTIONS.WHITEBOARD_DRAW, handleDraw);
      socketRef.current.off(ACTIONS.WHITEBOARD_CLEAR, handleClear);
    };
  }, [socketRef]);

  // Get mouse position relative to canvas
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Start drawing
  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = getMousePos(e);
    lastPos.current = pos;
  };

  // Draw
  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;

    const ctx = ctxRef.current;
    if (!ctx) return;

    const pos = getMousePos(e);

    // Set drawing style
    ctx.strokeStyle = tool === 'eraser' ? '#1a1a2e' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw locally
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // Emit to others
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.WHITEBOARD_DRAW, {
        roomId,
        tool,
        color,
        strokeWidth,
        startX: lastPos.current.x,
        startY: lastPos.current.y,
        endX: pos.x,
        endY: pos.y
      });
    }

    lastPos.current = pos;
  };

  // Stop drawing
  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  // Clear canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.WHITEBOARD_CLEAR, { roomId });
    }
  };

  const colors = ['#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#f97316'];

  return (
    <div className="whiteboard-container">
      {/* Toolbar */}
      <div className="whiteboard-toolbar">
        {/* Tools */}
        <div className="tool-group">
          <button 
            className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
            onClick={() => setTool('pen')}
            title="Pen"
          >
            ✏️
          </button>
          <button 
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
            title="Eraser"
          >
            🧹
          </button>
        </div>

        {/* Colors */}
        <div className="tool-group color-group">
          {colors.map((c) => (
            <button
              key={c}
              className={`color-btn ${color === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>

        {/* Stroke Width */}
        <div className="tool-group">
          <label className="stroke-label">
            Size:
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="stroke-slider"
            />
            <span>{strokeWidth}px</span>
          </label>
        </div>

        {/* Clear */}
        <div className="tool-group">
          <button className="tool-btn clear-btn" onClick={handleClear} title="Clear All">
            <svg width="14" height="14" viewBox="0 0 256 256" style={{ marginRight: '4px' }}>
              <path d="M215 116H41a8 8 0 0 1 0-16h174a8 8 0 0 1 0 16z" fill="#858eff"/>
              <path d="M213 116H43l18.038 126.263A16 16 0 0 0 76.877 256h102.247a16 16 0 0 0 15.839-13.737L213 116z" fill="#6770e6"/>
              <path fill="#5861c7" d="M82.665 136h-.93c-4.141 0-7.377 3.576-6.965 7.697l8.6 86A7 7 0 0 0 90.335 236h.93c4.141 0 7.377-3.576 6.965-7.697l-8.6-86A7 7 0 0 0 82.665 136zM165.165 236h-.93c-4.141 0-7.377-3.576-6.965-7.697l8.6-86a7 7 0 0 1 6.965-6.303h.93c4.141 0 7.377 3.576 6.965 7.697l-8.6 86a7 7 0 0 1-6.965 6.303zM128.5 136h-1a7 7 0 0 0-7 7v86a7 7 0 0 0 7 7h1a7 7 0 0 0 7-7v-86a7 7 0 0 0-7-7z"/>
              <path fill="#69ebfc" d="M148.364 100V12.121C148.364 5.427 142.937 0 136.242 0H60.485C53.79 0 48.364 5.427 48.364 12.121V100h100z"/>
              <path fill="#d476e2" d="M208.364 100V42.121c0-6.694-5.427-12.121-12.121-12.121h-75.758c-6.694 0-12.121 5.427-12.121 12.121V100h100z"/>
            </svg>
            Clear
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default Whiteboard;
