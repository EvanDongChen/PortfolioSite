import React from 'react';
import { Fish as FishType } from '../types';

interface FishProps extends Omit<FishType, 'vx' | 'vy' | 'initialVx'> {
  isNibbling?: boolean;
  isFaded?: boolean;
  isHighlighted?: boolean;
}

const Fish: React.FC<FishProps> = React.memo(({ id, x, displayY, rotation, scale, color1, color2, isFlipped, isNibbling = false, variant = 'default', isFaded = false, isHighlighted = false, birthTime }) => {
  const isClownFish = variant === 'clown';

  // Growth logic: Start at 40% size and grow to 100% over 15 seconds
  const GROWTH_DURATION = 15000;
  let currentScale = scale;
  if (birthTime) {
    const age = performance.now() - birthTime;
    const growthT = Math.min(1, age / GROWTH_DURATION);
    currentScale = scale * (0.4 + 0.6 * growthT);
  }

  const nibbleTilt = isNibbling ? (isFlipped ? -14 : 14) : 0;
  const nibbleScale = isNibbling ? 1.2 : 1;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${x}px, ${displayY}px) rotate(${rotation + nibbleTilt}deg) scale(${nibbleScale}) ${isFlipped ? 'scaleY(-1)' : ''}`,
    width: 120 * currentScale,
    height: 50 * currentScale,
    willChange: 'transform',
    pointerEvents: 'none',
    cursor: 'default',
    transition: 'transform 140ms ease-out, opacity 300ms ease-out, filter 300ms ease-out',
    opacity: isFaded ? 0.15 : 1,
    filter: isHighlighted ? 'drop-shadow(0 0 8px rgba(255,255,255,0.8)) brightness(1.2)' : 'none',
    zIndex: isHighlighted ? 10 : 1,
  };

  const gradientId = `fishGradient-${id}`;
  const glowId = `glow-${id}`;
  const clipId = `fishClip-${id}`;
  const stripeColor = 'rgba(255, 255, 255, 0.96)';
  const outlineColor = 'rgba(15, 23, 42, 0.55)';

  return (
    <div style={style}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: isClownFish ? '#ffb347' : color1, stopOpacity: 0.85 }} />
            <stop offset="100%" style={{ stopColor: isClownFish ? '#f97316' : color2, stopOpacity: 0.7 }} />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {isClownFish && (
            <clipPath id={clipId}>
              <path d="M 90,25 C 80,10 30,5 10,25 C 30,45 80,40 90,25" />
            </clipPath>
          )}
        </defs>
        <g filter={`url(#${glowId})`}>
          <>
            <path
              fill={`url(#${gradientId})`}
              d="M 90,25 C 80,10 30,5 10,25 C 30,45 80,40 90,25"
            />
            <path
              fill={`url(#${gradientId})`}
              d="M 10,25 L 0,15 L 5,25 L 0,35 L 10,25"
            />
            {isClownFish && (
              <g clipPath={`url(#${clipId})`}>
                <path d="M 65,0 L 65,50" stroke={outlineColor} strokeWidth="6" opacity="0.5" />
                <path d="M 65,0 L 65,50" stroke={stripeColor} strokeWidth="4.4" />
                <path d="M 45,0 L 45,50" stroke={outlineColor} strokeWidth="7" opacity="0.5" />
                <path d="M 45,0 L 45,50" stroke={stripeColor} strokeWidth="5.1" />
                <path d="M 25,0 L 25,50" stroke={outlineColor} strokeWidth="6" opacity="0.45" />
                <path d="M 25,0 L 25,50" stroke={stripeColor} strokeWidth="4.2" />
              </g>
            )}
            <circle cx="75" cy="22" r="2" fill="rgba(255, 255, 255, 0.7)" />
          </>
        </g>
      </svg>
    </div>
  );
});

export default Fish;