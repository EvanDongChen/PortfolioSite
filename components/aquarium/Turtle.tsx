import React from 'react';

interface TurtleProps {
  x: number;
  displayY: number;
  scale: number;
  isFlipped: boolean;
}

const Turtle: React.FC<TurtleProps> = React.memo(({ x, displayY, scale, isFlipped }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${x}px, ${displayY}px) ${isFlipped ? 'scaleX(-1)' : ''}`,
    width: 180 * scale,
    height: 110 * scale,
    opacity: 0.7,
    willChange: 'transform',
    pointerEvents: 'none',
    filter: 'blur(0.8px) drop-shadow(0 0 10px rgba(133, 204, 158, 0.22))',
  };

  return (
    <div style={style}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 110" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="turtleShell" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7fcf9f" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#2f8a67" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="turtleSkin" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#95d9ac" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#5aad7f" stopOpacity="0.86" />
          </linearGradient>
        </defs>

        <ellipse cx="82" cy="56" rx="50" ry="34" fill="url(#turtleShell)" />
        <ellipse cx="82" cy="56" rx="36" ry="23" fill="rgba(46, 126, 88, 0.35)" />
        <ellipse cx="138" cy="58" rx="20" ry="14" fill="url(#turtleSkin)" />
        <circle cx="146" cy="55" r="2.2" fill="rgba(240, 255, 245, 0.9)" />

        <ellipse cx="45" cy="32" rx="16" ry="9" fill="url(#turtleSkin)" transform="rotate(-25 45 32)" />
        <ellipse cx="44" cy="81" rx="16" ry="9" fill="url(#turtleSkin)" transform="rotate(25 44 81)" />
        <ellipse cx="99" cy="28" rx="15" ry="8" fill="url(#turtleSkin)" transform="rotate(18 99 28)" />
        <ellipse cx="99" cy="84" rx="15" ry="8" fill="url(#turtleSkin)" transform="rotate(-18 99 84)" />

        <path d="M29 57 L15 52 L19 58 L15 64 Z" fill="url(#turtleSkin)" />
      </svg>
    </div>
  );
});

export default Turtle;
