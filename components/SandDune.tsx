import React from 'react';

const SandDune: React.FC = () => {
  return (
    <div className="absolute bottom-0 left-0 w-full h-48 z-0">
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 150"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sandGradient" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#E6D8B8" />
            <stop offset="100%" stopColor="#C2B280" />
          </linearGradient>
        </defs>
        <path
          fill="url(#sandGradient)"
          d="M0,150 L1440,150 L1440,50 C1200,80 960,30 720,50 C480,70 240,20 0,50 Z"
        />
      </svg>
    </div>
  );
};

export default SandDune;
