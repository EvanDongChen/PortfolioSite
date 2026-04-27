import React from 'react';

interface WhaleProps {
  x: number;
  displayY: number;
  scale: number;
  isFlipped: boolean;
}

const Whale: React.FC<WhaleProps> = React.memo(({ x, displayY, scale, isFlipped }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${x}px, ${displayY}px) ${isFlipped ? 'scaleX(-1)' : ''}`,
    width: 320 * scale,
    height: 130 * scale,
    opacity: 0.78,
    willChange: 'transform',
    pointerEvents: 'none',
    filter: 'blur(0.9px) drop-shadow(0 0 14px rgba(120, 220, 255, 0.18))',
  };

  return (
    <div style={style}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 130" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="whaleBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5fb7d6" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#2f7db0" stopOpacity="0.86" />
            <stop offset="100%" stopColor="#1f5f8f" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="whaleBelly" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(224, 246, 255, 0.82)" />
            <stop offset="100%" stopColor="rgba(167, 220, 245, 0.72)" />
          </linearGradient>
        </defs>

        <path
          fill="url(#whaleBody)"
          d="M294,62 C272,28 210,16 150,24 C105,30 70,48 44,58 C31,63 20,66 8,66 C19,71 30,75 44,80 C70,90 105,108 150,106 C210,103 272,88 294,62 Z"
        />
        <path
          fill="url(#whaleBelly)"
          d="M277,68 C250,82 200,88 152,88 C108,88 76,78 50,69 C78,82 109,98 152,98 C200,98 250,91 277,68 Z"
        />
        <path
          fill="url(#whaleBody)"
          d="M44,58 L6,38 L16,61 L6,89 L44,84 L31,70 Z"
        />
        <path
          fill="url(#whaleBody)"
          d="M184,26 C176,12 163,5 148,7 C164,10 173,20 176,34 Z"
        />
        <path
          fill="url(#whaleBody)"
          d="M198,81 C185,96 166,106 147,108 C168,106 186,98 199,87 Z"
        />
        <circle cx="245" cy="53" r="3.4" fill="rgba(230, 248, 255, 0.9)" />
      </svg>
    </div>
  );
});

export default Whale;
