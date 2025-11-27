import React from 'react';

const Output = ({ output }) => {
  return (
    <div className="outputWrap">
      <h3>Output</h3>
      <div className="outputWindow">
        {output.length > 0 ? (
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
