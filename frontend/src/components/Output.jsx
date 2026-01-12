import React from 'react';

const Output = ({ output, isLoading }) => {
  // Handle Judge0 result format
  const isJudge0Result = output && typeof output === 'object' && !Array.isArray(output);

  return (
    <div className="outputWrap">
      <h3>Output</h3>
      <div className="outputWindow">
        {isLoading ? (
          <div className="outputLoading">
            <div className="spinner"></div>
            <span>Executing code...</span>
          </div>
        ) : isJudge0Result ? (
          <div className="judge0Output">
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
            {!output.stdout && !output.stderr && !output.compile_output && !output.error && output.success && (
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
