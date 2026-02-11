import React, { useRef, useState, useEffect, useCallback } from 'react';
import ACTIONS from '../Actions';
import logger from '../utils/logger';
import { TrashIcon } from '../icons';
import { useTheme } from '../context/ThemeContext';

const Whiteboard = ({ socketRef, roomId }) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const drawingHistory = useRef([]); // Store all draw events
  const saveTimeoutRef = useRef(null);
  const { theme } = useTheme();
  const eraserColor = theme === 'light' ? '#ffffff' : '#0d1117';

  // Drawing state
  const [tool, setTool] = useState('pen'); // pen, eraser
  const [color, setColor] = useState(theme === 'light' ? '#000000' : '#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(3);

  // Sync default color when theme changes
  useEffect(() => {
    setColor(prev => {
      if (prev === '#ffffff' && theme === 'light') return '#000000';
      if (prev === '#000000' && theme === 'dark') return '#ffffff';
      return prev;
    });
  }, [theme]);

  // Redraw all stored drawing events
  const redrawCanvas = useCallback((drawingData) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawingData.forEach(data => {
      ctx.strokeStyle = data.tool === 'eraser' ? eraserColor : data.color;
      ctx.lineWidth = data.tool === 'eraser' ? 20 : data.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(data.startX, data.startY);
      ctx.lineTo(data.endX, data.endY);
      ctx.stroke();
    });
  }, []);

  // Save annotations to backend (debounced)
  const saveAnnotations = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        await fetch(`${backendUrl}/api/rooms/${roomId}/annotations`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drawingData: drawingHistory.current })
        });
        logger.log('📝 Annotations saved');
      } catch (err) {
        logger.error('Failed to save annotations:', err);
      }
    }, 1000);
  }, [roomId]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctxRef.current = ctx;
      
      if (drawingHistory.current.length > 0) {
        redrawCanvas(drawingHistory.current);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [redrawCanvas]);

  // Load annotations on mount
  useEffect(() => {
    const loadAnnotations = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/rooms/${roomId}/annotations`);
        const data = await response.json();
        
        if (data.success && data.drawingData && data.drawingData.length > 0) {
          drawingHistory.current = data.drawingData;
          redrawCanvas(data.drawingData);
          logger.log(`📝 Loaded ${data.drawingData.length} annotation events`);
        }
      } catch (err) {
        logger.error('Failed to load annotations:', err);
      }
    };

    if (roomId) {
      loadAnnotations();
    }
  }, [roomId, redrawCanvas]);

  // Socket event handlers
  useEffect(() => {
    if (!socketRef.current) return;

    const handleDraw = (data) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.strokeStyle = data.tool === 'eraser' ? eraserColor : data.color;
      ctx.lineWidth = data.tool === 'eraser' ? 20 : data.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(data.startX, data.startY);
      ctx.lineTo(data.endX, data.endY);
      ctx.stroke();

      // Track remote drawing in history
      drawingHistory.current.push({
        tool: data.tool,
        color: data.color,
        strokeWidth: data.strokeWidth,
        startX: data.startX,
        startY: data.startY,
        endX: data.endX,
        endY: data.endY
      });
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Clear history on remote clear
      drawingHistory.current = [];
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
    ctx.strokeStyle = tool === 'eraser' ? eraserColor : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw locally
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // Create draw event data
    const drawEvent = {
      tool,
      color,
      strokeWidth,
      startX: lastPos.current.x,
      startY: lastPos.current.y,
      endX: pos.x,
      endY: pos.y
    };

    // Track in history for persistence
    drawingHistory.current.push(drawEvent);
    
    // Save to backend (debounced)
    saveAnnotations();

    // Emit to others
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.WHITEBOARD_DRAW, {
        roomId,
        ...drawEvent
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
    
    // Clear history
    drawingHistory.current = [];
    
    // Save cleared state
    saveAnnotations();
    
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.WHITEBOARD_CLEAR, { roomId });
    }
  };

  const colors = theme === 'light'
    ? ['#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#f97316']
    : ['#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#f97316'];

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
            <TrashIcon size={14} style={{ marginRight: '4px' }} />
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
