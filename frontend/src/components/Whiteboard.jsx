import React, { useRef, useState, useEffect, useCallback } from 'react';
import ACTIONS from '../Actions';
import logger from '../utils/logger';
import { TrashIcon } from '../icons';
import { useTheme } from '../context/ThemeContext';

const PAGE_HEIGHT = 800; // Fixed height per page in pixels

const Whiteboard = ({ socketRef, roomId }) => {
  const canvasRefs = useRef({}); // Map of pageIndex -> canvas ref
  const ctxRefs = useRef({}); // Map of pageIndex -> ctx
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const activePageRef = useRef(null); // Which page is being drawn on
  const saveTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const { theme } = useTheme();
  const eraserColor = theme === 'light' ? '#ffffff' : '#1a1a2e';

  // Multi-page state
  const [pages, setPages] = useState([[]]); // Array of pages, each is array of draw events
  const pagesRef = useRef([[]]);

  // Drawing state
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState(theme === 'light' ? '#000000' : '#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(3);

  // Keep pagesRef in sync
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  // Sync default color when theme changes
  useEffect(() => {
    setColor(prev => {
      if (prev === '#ffffff' && theme === 'light') return '#000000';
      if (prev === '#000000' && theme === 'dark') return '#ffffff';
      return prev;
    });
  }, [theme]);

  // Initialize/setup a canvas for a specific page
  const setupCanvas = useCallback((canvas, pageIndex) => {
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    
    canvas.width = container.clientWidth;
    canvas.height = PAGE_HEIGHT;
    
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    canvasRefs.current[pageIndex] = canvas;
    ctxRefs.current[pageIndex] = ctx;

    // Redraw this page's data
    const pageData = pagesRef.current[pageIndex] || [];
    redrawPage(ctx, canvas, pageData);
  }, []);

  // Redraw a single page
  const redrawPage = (ctx, canvas, drawingData) => {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    (drawingData || []).forEach(data => {
      ctx.strokeStyle = data.tool === 'eraser' ? eraserColor : data.color;
      ctx.lineWidth = data.tool === 'eraser' ? 20 : data.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(data.startX, data.startY);
      ctx.lineTo(data.endX, data.endY);
      ctx.stroke();
    });
  };

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
          body: JSON.stringify({ drawingData: pagesRef.current })
        });
        logger.log('📝 Annotations saved');
      } catch (err) {
        logger.error('Failed to save annotations:', err);
      }
    }, 1000);
  }, [roomId]);

  // Handle window resize - resize all canvases
  useEffect(() => {
    const handleResize = () => {
      Object.keys(canvasRefs.current).forEach(idx => {
        const canvas = canvasRefs.current[idx];
        if (canvas) {
          setupCanvas(canvas, Number(idx));
        }
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  // Load annotations on mount
  useEffect(() => {
    const loadAnnotations = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/rooms/${roomId}/annotations`);
        const data = await response.json();
        
        if (data.success && data.drawingData && data.drawingData.length > 0) {
          // Check if old format (flat array of draw events) or new format (array of pages)
          const isOldFormat = data.drawingData.length > 0 && !Array.isArray(data.drawingData[0]);
          
          let loadedPages;
          if (isOldFormat) {
            loadedPages = [data.drawingData];
          } else {
            loadedPages = data.drawingData;
          }
          
          pagesRef.current = loadedPages;
          setPages(loadedPages);
          logger.log(`📝 Loaded ${loadedPages.length} page(s) of annotations`);
        }
      } catch (err) {
        logger.error('Failed to load annotations:', err);
      }
    };

    if (roomId) {
      loadAnnotations();
    }
  }, [roomId]);

  // Socket event handlers
  useEffect(() => {
    if (!socketRef.current) return;

    const handleDraw = (data) => {
      const pageIndex = data.pageIndex ?? 0;
      const ctx = ctxRefs.current[pageIndex];
      
      if (ctx) {
        ctx.strokeStyle = data.tool === 'eraser' ? eraserColor : data.color;
        ctx.lineWidth = data.tool === 'eraser' ? 20 : data.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(data.startX, data.startY);
        ctx.lineTo(data.endX, data.endY);
        ctx.stroke();
      }

      const drawEvent = {
        tool: data.tool,
        color: data.color,
        strokeWidth: data.strokeWidth,
        startX: data.startX,
        startY: data.startY,
        endX: data.endX,
        endY: data.endY
      };

      setPages(prev => {
        const updated = [...prev];
        while (updated.length <= pageIndex) updated.push([]);
        updated[pageIndex] = [...updated[pageIndex], drawEvent];
        pagesRef.current = updated;
        return updated;
      });
    };

    const handleClear = (data) => {
      const pageIndex = data?.pageIndex ?? 0;
      const canvas = canvasRefs.current[pageIndex];
      const ctx = ctxRefs.current[pageIndex];
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      setPages(prev => {
        const updated = [...prev];
        if (updated[pageIndex]) updated[pageIndex] = [];
        pagesRef.current = updated;
        return updated;
      });
    };

    const handleNewPage = (data) => {
      const pageIndex = data?.pageIndex;
      if (pageIndex !== undefined) {
        setPages(prev => {
          const updated = [...prev];
          while (updated.length <= pageIndex) updated.push([]);
          pagesRef.current = updated;
          return updated;
        });
      }
    };

    socketRef.current.on(ACTIONS.WHITEBOARD_DRAW, handleDraw);
    socketRef.current.on(ACTIONS.WHITEBOARD_CLEAR, handleClear);
    socketRef.current.on('WHITEBOARD_NEW_PAGE', handleNewPage);

    return () => {
      socketRef.current.off(ACTIONS.WHITEBOARD_DRAW, handleDraw);
      socketRef.current.off(ACTIONS.WHITEBOARD_CLEAR, handleClear);
      socketRef.current.off('WHITEBOARD_NEW_PAGE', handleNewPage);
    };
  }, [socketRef, eraserColor]);

  // Get mouse position relative to a specific canvas
  const getMousePos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Start drawing
  const handleMouseDown = (e, pageIndex) => {
    isDrawing.current = true;
    activePageRef.current = pageIndex;
    const canvas = canvasRefs.current[pageIndex];
    if (!canvas) return;
    const pos = getMousePos(e, canvas);
    lastPos.current = pos;
  };

  // Draw
  const handleMouseMove = (e, pageIndex) => {
    if (!isDrawing.current || activePageRef.current !== pageIndex) return;

    const ctx = ctxRefs.current[pageIndex];
    const canvas = canvasRefs.current[pageIndex];
    if (!ctx || !canvas) return;

    const pos = getMousePos(e, canvas);

    ctx.strokeStyle = tool === 'eraser' ? eraserColor : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    const drawEvent = {
      tool,
      color,
      strokeWidth,
      startX: lastPos.current.x,
      startY: lastPos.current.y,
      endX: pos.x,
      endY: pos.y
    };

    setPages(prev => {
      const updated = [...prev];
      updated[pageIndex] = [...(updated[pageIndex] || []), drawEvent];
      pagesRef.current = updated;
      return updated;
    });
    
    saveAnnotations();

    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.WHITEBOARD_DRAW, {
        roomId,
        pageIndex,
        ...drawEvent
      });
    }

    lastPos.current = pos;
  };

  // Stop drawing
  const handleMouseUp = () => {
    isDrawing.current = false;
    activePageRef.current = null;
  };

  // Clear a specific page
  const handleClearPage = (pageIndex) => {
    const canvas = canvasRefs.current[pageIndex];
    const ctx = ctxRefs.current[pageIndex];
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    setPages(prev => {
      const updated = [...prev];
      updated[pageIndex] = [];
      pagesRef.current = updated;
      return updated;
    });
    
    saveAnnotations();
    
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.WHITEBOARD_CLEAR, { roomId, pageIndex });
    }
  };

  // Add new page after a specific page
  const addPageAfter = (afterIndex) => {
    const newPageIndex = afterIndex + 1;
    setPages(prev => {
      const updated = [...prev];
      updated.splice(newPageIndex, 0, []);
      pagesRef.current = updated;
      return updated;
    });
    
    saveAnnotations();

    if (socketRef.current) {
      socketRef.current.emit('WHITEBOARD_NEW_PAGE', { roomId, pageIndex: newPageIndex });
    }

    // Scroll new page into view after render
    setTimeout(() => {
      const newCanvas = canvasRefs.current[newPageIndex];
      if (newCanvas) {
        newCanvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const colors = theme === 'light'
    ? ['#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#f97316']
    : ['#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#f97316'];

  return (
    <div className="whiteboard-container">
      {/* Toolbar */}
      <div className="whiteboard-toolbar">
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

        <div className="tool-group">
          <button className="tool-btn clear-btn" onClick={() => handleClearPage(0)} title="Clear First Page">
            <TrashIcon size={14} style={{ marginRight: '4px' }} />
            Clear
          </button>
        </div>
      </div>

      {/* Scrollable notebook area */}
      <div className="notebook-scroll" ref={containerRef}>
        {pages.map((pageData, pageIndex) => (
          <React.Fragment key={pageIndex}>
            {/* Page */}
            <div className="notebook-page">
              <div className="page-label">Page {pageIndex + 1}</div>
              <canvas
                ref={(el) => {
                  if (el) setupCanvas(el, pageIndex);
                }}
                className="notebook-canvas"
                onMouseDown={(e) => handleMouseDown(e, pageIndex)}
                onMouseMove={(e) => handleMouseMove(e, pageIndex)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              {pages.length > 1 && (
                <button
                  className="page-clear-btn"
                  onClick={() => handleClearPage(pageIndex)}
                  title={`Clear Page ${pageIndex + 1}`}
                >
                  <TrashIcon size={16} />
                </button>
              )}
            </div>
            
            {/* Add page divider */}
            <div className="page-divider">
              <div className="divider-line" />
              <button
                className="add-page-divider-btn"
                onClick={() => addPageAfter(pageIndex)}
                title="Add new page"
              >
                +
              </button>
              <div className="divider-line" />
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Whiteboard;
