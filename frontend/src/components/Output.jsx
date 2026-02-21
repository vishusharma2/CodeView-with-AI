import React, { useState, useRef, useCallback } from 'react';

const Output = ({ output, isLoading, htmlPreview }) => {
  const [height, setHeight] = useState(150);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const isJudge0Result = output && typeof output === 'object' && !Array.isArray(output);

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
    <div
      className="flex flex-col min-h-[80px] max-h-[600px] relative bg-[var(--bg-secondary)] border-t border-[var(--border-default)] p-[15px] overflow-hidden"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div className="resizeHandle" onMouseDown={handleMouseDown}>
        <div className="resizeBar"></div>
      </div>
      
      <h3 className="m-0 mb-3 text-indigo-500 text-base font-bold uppercase tracking-[1px]">
        {htmlPreview ? 'HTML Preview' : 'Output'}
      </h3>
      <div className="outputWindow flex-1 bg-[var(--bg-primary)] rounded-lg p-3 overflow-y-auto font-mono text-[var(--text-primary)] border border-[var(--border-default)]">
        {htmlPreview ? (
          <iframe
            className="w-full h-full border-none rounded-md bg-white"
            srcDoc={htmlPreview}
            sandbox="allow-scripts allow-modals"
            title="HTML Preview"
          />
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <div className="spinner"></div>
            <span>Executing code...</span>
          </div>
        ) : isJudge0Result ? (
          <div className="flex flex-col gap-2">
            {output.executedBy && (
              <div className="text-xs text-[var(--text-secondary)] pb-1 border-b border-[var(--border-subtle)]">
                ▶️ Executed by: <strong className="text-[var(--text-primary)]">{output.executedBy}</strong>
              </div>
            )}

            {output.status && (
              <div className={`text-xs font-semibold ${output.success ? 'text-green-500' : 'text-red-500'}`}>
                <strong>Status:</strong> {output.status}
              </div>
            )}

            {output.error && (
              <div className="mb-1.5 whitespace-pre-wrap leading-relaxed text-red-500 font-semibold">
                <strong>Error:</strong> {output.error}
              </div>
            )}

            {output.compile_output && (
              <div className="mt-1">
                <strong className="text-[var(--text-secondary)] text-xs">Compilation Output:</strong>
                <pre className="mb-1.5 whitespace-pre-wrap leading-relaxed text-red-500 font-semibold">{output.compile_output}</pre>
              </div>
            )}

            {output.stdout && (
              <div className="mt-1">
                <strong className="text-[var(--text-secondary)] text-xs">Output:</strong>
                <pre className="mb-1.5 whitespace-pre-wrap leading-relaxed">{output.stdout}</pre>
              </div>
            )}

            {output.image && (
              <div className="mt-3 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-default)]">
                <strong className="text-[var(--text-secondary)] text-xs">Plot:</strong>
                <img 
                  src={`data:image/png;base64,${output.image}`}
                  alt="Generated Plot"
                  className="max-w-full rounded-lg mt-2 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                />
              </div>
            )}

            {output.stderr && (
              <div className="mt-1">
                <strong className="text-[var(--text-secondary)] text-xs">Error Output:</strong>
                <pre className="mb-1.5 whitespace-pre-wrap leading-relaxed text-red-500 font-semibold">{output.stderr}</pre>
              </div>
            )}

            {(output.time || output.memory) && (
              <div className="flex gap-4 pt-2 mt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                {output.time && <span>⏱️ Time: {output.time}s</span>}
                {output.memory && <span>💾 Memory: {output.memory} KB</span>}
              </div>
            )}

            {!output.stdout && !output.stderr && !output.compile_output && !output.error && !output.image && output.success && (
              <div className="text-[var(--text-muted)] italic">Code executed successfully with no output</div>
            )}
          </div>
        ) : Array.isArray(output) && output.length > 0 ? (
          output.map((line, index) => (
            <div
              key={index}
              className={`mb-1.5 whitespace-pre-wrap leading-relaxed ${line.isError ? 'text-red-500 font-semibold' : ''}`}
            >
              {line.text}
            </div>
          ))
        ) : (
          <div className="text-[var(--text-muted)] italic">Run code to see output here</div>
        )}
      </div>
    </div>
  );
};

export default Output;
