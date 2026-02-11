import React from 'react';

const PlayIcon = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <polygon points="5,3 19,12 5,21"></polygon>
  </svg>
);

export default PlayIcon;
