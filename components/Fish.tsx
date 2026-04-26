import React from 'react';
import { Fish as FishType } from '../types';

interface FishProps extends Omit<FishType, 'vx' | 'vy' | 'initialVx'> {
  isNibbling?: boolean;
}

const Fish: React.FC<FishProps> = React.memo(({ id, x, displayY, rotation, scale, color1, color2, isFlipped, isNibbling = false }) => {
  const nibbleTilt = isNibbling ? (isFlipped ? -14 : 14) : 0;
  const nibbleScale = isNibbling ? 1.2 : 1;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${x}px, ${displayY}px) rotate(${rotation + nibbleTilt}deg) scale(${nibbleScale}) ${isFlipped ? 'scaleY(-1)' : ''}`,
    width: 120 * scale,
    height: 50 * scale,
    willChange: 'transform',
    pointerEvents: 'none',
    transition: 'transform 140ms ease-out',
  };

  const gradientId = `fishGradient-${id}`;
  const glowId = `glow-${id}`;

  return (
    <div style={style}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: color1, stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: color2, stopOpacity: 0.6 }} />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#${glowId})`}>
          <path
            fill={`url(#${gradientId})`}
            d="M 90,25 C 80,10 30,5 10,25 C 30,45 80,40 90,25"
          />
          <path
            fill={`url(#${gradientId})`}
            d="M 10,25 L 0,15 L 5,25 L 0,35 L 10,25"
          />
          <circle cx="75" cy="22" r="2" fill="rgba(255, 255, 255, 0.7)" />
        </g>
      </svg>
    </div>
  );
});

export default Fish;