import React from 'react';
import { Fish as FishType } from '../types';

interface FishProps extends Omit<FishType, 'vx' | 'vy' | 'initialVx'> {
  isNibbling?: boolean;
  isFaded?: boolean;
  isHighlighted?: boolean;
  onMouseDown?: (id: number, e: React.MouseEvent) => void;
  isGrabMode?: boolean;
  isDeepSea?: boolean;
  isSilhouette?: boolean;
}

const Fish: React.FC<FishProps> = React.memo(({ id, x, displayY, rotation, scale, color1, color2, isFlipped, isNibbling = false, variant = 'default', isFaded = false, isHighlighted = false, birthTime, isPuffed = false, onMouseDown, isGrabMode = false, isDeepSea = false, isSilhouette = false }) => {
  const isClownFish = variant === 'clown';
  const isPuffer = variant === 'puffer';
  const isRainbowFish = variant === 'rainbow';

  // Growth logic: Start at 40% size and grow to 100% over 15 seconds
  const GROWTH_DURATION = 15000;
  let currentScale = scale;
  if (birthTime) {
    const age = performance.now() - birthTime;
    const growthT = Math.min(1, age / GROWTH_DURATION);
    currentScale = scale * (0.4 + 0.6 * growthT);
  }
  
  if (isPuffer) {
    currentScale *= 1.15;
  }

  const puffMultiplier = isPuffed ? 1.5 : 1.0;
  const nibbleTilt = isNibbling ? (isFlipped ? -14 : 14) : 0;
  const nibbleScale = isNibbling ? 1.2 : 1;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${x}px, ${displayY}px) rotate(${rotation + nibbleTilt}deg) scale(${nibbleScale * puffMultiplier}) ${isFlipped ? 'scaleY(-1)' : ''}`,
    width: (isPuffer ? (isPuffed ? 65 : 85) : 120) * currentScale,
    height: (isPuffer ? (isPuffed ? 65 : 65) : 50) * currentScale,
    willChange: 'transform',
    pointerEvents: isSilhouette ? 'none' : ((isPuffer || isGrabMode) ? 'auto' : 'none'),
    cursor: isSilhouette ? 'default' : (isGrabMode ? 'crosshair' : (isPuffer ? 'pointer' : 'default')),
    transition: 'transform 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275), width 450ms ease, height 450ms ease, opacity 300ms ease-out, filter 300ms ease-out',
    opacity: isSilhouette ? 0.62 : (isFaded ? 0.15 : 1),
    filter: isSilhouette
      ? 'grayscale(1) brightness(0.08) contrast(1.2)'
      : isHighlighted
      ? 'drop-shadow(0 0 8px rgba(255,255,255,0.8)) brightness(1.2)'
      : isRainbowFish
        ? 'drop-shadow(0 0 10px rgba(255,255,255,0.35)) saturate(1.2)'
        : isDeepSea
          ? `drop-shadow(0 0 8px ${color1}cc) drop-shadow(0 0 22px ${color1}66) brightness(1.6) saturate(2.2)`
          : 'none',
    zIndex: isSilhouette ? 2 : (isGrabMode ? 100 : (isHighlighted || isPuffer || isRainbowFish ? 10 : 1)),
  };

  const gradientId = `fishGradient-${id}`;
  const glowId = `glow-${id}`;
  const clipId = `fishClip-${id}`;
  const rainbowShimmerId = `rainbowShimmer-${id}`;
  const stripeColor = 'rgba(255, 255, 255, 0.96)';
  const outlineColor = 'rgba(15, 23, 42, 0.55)';

  // Puffer colors: Cream to Yellow
  const pColor1 = '#fef3c7';
  const pColor2 = '#fbbf24';

  const normalPufferPath = "M 85,25 C 80,5 20,5 15,25 C 20,45 80,45 85,25";
  // The viewBox is 100x50. To make a circle in a square container, the path must be 100 units wide and 50 units tall.
  const ballPufferPath = "M 100,25 C 100,0 75,0 50,0 C 25,0 0,0 0,25 C 0,50 25,50 50,50 C 75,50 100,50 100,25";

  const handleGrabFish = (e: React.MouseEvent) => {
    onMouseDown?.(id, e);
  };

  return (
    <div 
      style={style} 
      data-fish-id={id} 
      data-is-puffer={isPuffer}
      onMouseDown={handleGrabFish}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {isRainbowFish ? (
              <>
                <stop offset="0%" style={{ stopColor: '#ff4d6d', stopOpacity: 0.95 }} />
                <stop offset="20%" style={{ stopColor: '#f59e0b', stopOpacity: 0.95 }} />
                <stop offset="40%" style={{ stopColor: '#fde047', stopOpacity: 0.95 }} />
                <stop offset="60%" style={{ stopColor: '#34d399', stopOpacity: 0.95 }} />
                <stop offset="80%" style={{ stopColor: '#38bdf8', stopOpacity: 0.95 }} />
                <stop offset="100%" style={{ stopColor: '#a78bfa', stopOpacity: 0.95 }} />
              </>
            ) : (
              <>
                <stop offset="0%" style={{ stopColor: isClownFish ? '#ffb347' : (isPuffer ? pColor1 : color1), stopOpacity: 0.85 }} />
                <stop offset="100%" style={{ stopColor: isClownFish ? '#f97316' : (isPuffer ? pColor2 : color2), stopOpacity: 0.7 }} />
              </>
            )}
          </linearGradient>
          {isRainbowFish && (
            <linearGradient id={rainbowShimmerId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0)', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'rgba(255,255,255,0.65)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0)', stopOpacity: 0 }} />
            </linearGradient>
          )}
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {(isClownFish || isPuffer) && (
            <clipPath id={clipId}>
              <path d={isPuffer ? (isPuffed ? ballPufferPath : normalPufferPath) : "M 90,25 C 80,10 30,5 10,25 C 30,45 80,40 90,25"} />
            </clipPath>
          )}
        </defs>
        <g filter={`url(#${glowId})`}>
          <path
            fill={`url(#${gradientId})`}
            d={isPuffer ? (isPuffed ? ballPufferPath : normalPufferPath) : "M 90,25 C 80,10 30,5 10,25 C 30,45 80,40 90,25"}
            style={{ transition: 'd 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
          />
          <path
            fill={`url(#${gradientId})`}
            d={isPuffer ? (isPuffed ? "M 0,25 L -12,18 L -10,25 L -12,32 L 0,25" : "M 15,25 L 0,18 L 4,25 L 0,32 L 15,25") : "M 10,25 L 0,15 L 5,25 L 0,35 L 10,25"}
            style={{ transition: 'd 450ms ease' }}
          />
          {isRainbowFish && (
            <>
              <path
                d="M 90,25 C 80,10 30,5 10,25 C 30,45 80,40 90,25"
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.5"
              />
              <path
                d="M 58,8 L 72,42"
                stroke="url(#rainbowShimmerId)"
                strokeWidth="6"
                opacity="0.75"
              />
            </>
          )}
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
          {isPuffer && (
            <g opacity={isPuffed ? 0.8 : 0} style={{ transition: 'opacity 450ms ease' }}>
              <circle cx="35" cy="12" r="1.5" fill="#78350f" />
              <circle cx="65" cy="12" r="1.5" fill="#78350f" />
              <circle cx="35" cy="38" r="1.5" fill="#78350f" />
              <circle cx="65" cy="35" r="1.5" fill="#78350f" />
              <circle cx="50" cy="25" r="1.5" fill="#78350f" />
            </g>
          )}
          <circle 
            cx={isPuffer ? (isPuffed ? 75 : 75) : 75} 
            cy={isPuffer ? (isPuffed ? 25 : 18) : 22} 
            r={isPuffed ? 3.5 : 2.2} 
            fill="rgba(255, 255, 255, 0.95)" 
            style={{ transition: 'all 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
          />
        </g>
      </svg>
    </div>
  );
});

export default Fish;