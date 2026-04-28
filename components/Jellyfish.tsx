import React, { useCallback, useState } from 'react';

interface JellyfishProps {
  id: number;
  x: number;
  displayY: number;
  scale: number;
  isFlipped: boolean;
  color1: string;
  color2: string;
}

const Jellyfish: React.FC<JellyfishProps> = React.memo(({ id, x, displayY, scale, isFlipped, color1, color2 }) => {
  const gradientId = `jellyfishGrad-${id}`;
  const glowId = `jellyfishGlow-${id}`;
  const [bobOffset, setBobOffset] = useState({ x: 0, y: 0 });

  const handleBobClick = useCallback(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 8 + Math.random() * 18;
    const bobX = Math.cos(angle) * distance;
    const bobY = Math.sin(angle) * distance;

    setBobOffset(prev => ({
      x: Math.max(-60, Math.min(60, prev.x + bobX)),
      y: Math.max(-60, Math.min(60, prev.y + bobY)),
    }));
  }, []);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${x}px, ${displayY}px) ${isFlipped ? 'scaleX(-1)' : ''}`,
    width: 80 * scale,
    height: 100 * scale,
    willChange: 'transform',
    pointerEvents: 'auto',
    opacity: 0.82,
    cursor: 'pointer',
  };

  const bobStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    transform: `translate3d(${bobOffset.x}px, ${bobOffset.y}px, 0)`,
    transition: 'transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1)',
  };

  return (
    <div style={style} onClick={handleBobClick}>
      <div style={bobStyle}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" style={{ width: '100%', height: '100%' }}>
          <defs>
            <radialGradient id={gradientId} cx="50%" cy="38%" r="60%">
              <stop offset="0%" stopColor={color1} stopOpacity="0.92" />
              <stop offset="100%" stopColor={color2} stopOpacity="0.45" />
            </radialGradient>
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="1.8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter={`url(#${glowId})`}>
            {/* Bell */}
            <path
              className="jellyfish-bell"
              fill={`url(#${gradientId})`}
              d="M 8,40 Q 8,8 40,5 Q 72,8 72,40 Q 65,56 40,58 Q 15,56 8,40 Z"
            />
            {/* Inner highlight */}
            <path
              fill="rgba(255,255,255,0.18)"
              d="M 22,30 Q 22,14 40,12 Q 55,14 55,30 Q 50,40 40,41 Q 28,40 22,30 Z"
            />
            {/* Bottom frilly edge of bell */}
            <path
              fill={color1}
              fillOpacity="0.35"
              d="M 15,52 Q 20,58 27,54 Q 32,60 40,56 Q 48,60 53,54 Q 60,58 65,52 Q 60,56 53,52 Q 48,57 40,54 Q 32,57 27,52 Q 20,56 15,52 Z"
            />
            {/* Tentacles */}
            {[
              { d: "M 20,55 Q 16,66 21,77 Q 17,88 20,98", delay: 0 },
              { d: "M 28,57 Q 24,68 29,79 Q 25,90 28,98", delay: 0.2 },
              { d: "M 40,58 Q 36,69 41,80 Q 37,91 40,98", delay: 0.4 },
              { d: "M 52,57 Q 56,68 51,79 Q 55,90 52,98", delay: 0.2 },
              { d: "M 60,55 Q 64,66 59,77 Q 63,88 60,98", delay: 0 },
            ].map((t, i) => (
              <path
                key={i}
                d={t.d}
                stroke={color1}
                strokeWidth="1.8"
                strokeOpacity="0.55"
                fill="none"
                strokeLinecap="round"
                className="jellyfish-tentacle"
                style={{ animationDelay: `${t.delay}s` }}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
});

export default Jellyfish;
