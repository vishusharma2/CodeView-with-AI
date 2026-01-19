import React, { useState, useRef, useCallback } from 'react';

const Output = ({ output, isLoading }) => {
  const [height, setHeight] = useState(150); // Default height in pixels
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Handle Judge0 result format
  const isJudge0Result = output && typeof output === 'object' && !Array.isArray(output);

  // Start resizing
  const handleMouseDown = useCallback((e) => {
    isResizing.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      const deltaY = startY.current - e.clientY;
      const newHeight = Math.max(80, Math.min(600, startHeight.current + deltaY));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [height]);

  return (
    <div className="outputWrap" style={{ height: `${height}px` }}>
      {/* Resize Handle */}
      <div className="resizeHandle" onMouseDown={handleMouseDown}>
        <div className="resizeBar"></div>
      </div>
      
      <h3>Output</h3>
      <div className="outputWindow">
        {isLoading ? (
          <div className="outputLoading">
            <div className="spinner"></div>
            <span>Executing code...</span>
          </div>
        ) : isJudge0Result ? (
          <div className="judge0Output">
            {/* Executed by info */}
            {output.executedBy && (
              <div className="outputExecutedBy">
                ▶️ Executed by: <strong>{output.executedBy}</strong>
              </div>
            )}

            {/* Status */}
            {output.status && (
              <div className={`outputStatus ${output.success ? 'success' : 'error'}`}>
                <strong>Status:</strong> {output.status}
              </div>
            )}

            {/* Error message */}
            {output.error && (
              <div className="outputLine error">
                <strong>Error:</strong> {output.error}
              </div>
            )}

            {/* Compilation output */}
            {output.compile_output && (
              <div className="outputSection">
                <strong>Compilation Output:</strong>
                <pre className="outputLine error">{output.compile_output}</pre>
              </div>
            )}

            {/* Standard output */}
            {output.stdout && (
              <div className="outputSection">
                <strong>Output:</strong>
                <pre className="outputLine">{output.stdout}</pre>
              </div>
            )}

            {/* Matplotlib/Plot Image */}
            {output.image && (
              <div className="outputSection plotContainer">
                <strong>Plot:</strong>
                <img 
                  src={`data:image/png;base64,${output.image}`}
                  alt="Generated Plot"
                  className="plotImage"
                />
              </div>
            )}

            {/* Standard error */}
            {output.stderr && (
              <div className="outputSection">
                <strong>Error Output:</strong>
                <pre className="outputLine error">{output.stderr}</pre>
              </div>
            )}

            {/* Execution metrics */}
            {(output.time || output.memory) && (
              <div className="outputMetrics">
                {output.time && <span>⏱️ Time: {output.time}s</span>}
                {output.memory && <span>💾 Memory: {output.memory} KB</span>}
              </div>
            )}

            {/* Empty result */}
            {!output.stdout && !output.stderr && !output.compile_output && !output.error && !output.image && output.success && (
              <div className="outputPlaceholder">Code executed successfully with no output</div>
            )}
          </div>
        ) : Array.isArray(output) && output.length > 0 ? (
          // Legacy format (for backward compatibility)
          output.map((line, index) => (
            <div
              key={index}
              className={`outputLine ${line.isError ? 'error' : ''}`}
            >
              {line.text}
            </div>
          ))
        ) : (
          <div className="outputPlaceholder">Run code to see output here</div>
        )}
      </div>
    </div>
  );
};

export default Output;
