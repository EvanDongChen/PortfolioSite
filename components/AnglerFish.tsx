import React from 'react';

interface AnglerFishProps {
  x: number;
  displayY: number;
  scale: number;
  revealBody: boolean;
  isFlipped?: boolean;
}

/**
 * Angler fish body = /images/angler.png (faces LEFT by default).
 * Container: 240 x 200 at scale=1, centered on (x, displayY).
 * Illicium rod attachment approx (88, 42) in SVG coords, lure tip at (70, -2).
 * isFlipped=true mirrors the inner div so the fish faces right.
 */
const AnglerFish: React.FC<AnglerFishProps> = React.memo(({ x, displayY, scale, revealBody, isFlipped }) => {
  const W = 240;
  const H = 200;
  const viewportScale = Math.max(0.58, Math.min(1, window.innerWidth / 1400));
  const finalScale = scale * viewportScale * 0.72;

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${x - (W / 2) * finalScale}px, ${displayY - (H / 2) * finalScale}px)`,
    width: W * finalScale,
    height: H * finalScale,
    pointerEvents: 'none',
    willChange: 'transform',
  };

  const innerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    transform: isFlipped ? 'scaleX(-1)' : undefined,
  };

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        {/* Body image — fades in when cursor is near the lure */}
        <img
          src="/images/angler.png"
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: revealBody ? 0.95 : 0,
            transition: 'opacity 300ms ease-out',
            filter: 'brightness(0.45) drop-shadow(0 0 10px rgba(0,60,20,0.5))',
          }}
        />

        {/* SVG lure overlay — always visible */}
        <svg
          viewBox="0 0 240 200"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="af-lure-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#efffdf" stopOpacity="1"   />
              <stop offset="30%"  stopColor="#80ffaa" stopOpacity="0.9" />
              <stop offset="70%"  stopColor="#00ff9f" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00ff9f" stopOpacity="0"   />
            </radialGradient>
          </defs>

          {/* Illicium rod — only visible when body is revealed */}
          <path
            d="M92 58 Q82 28 70 -2"
            stroke="rgba(160,220,180,0.75)"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            style={{ opacity: revealBody ? 1 : 0, transition: 'opacity 300ms ease-out' }}
          />

          {/* Outer atmospheric glow */}
          <circle cx="70" cy="-2" r="22" fill="url(#af-lure-glow)" />
          {/* Mid glow */}
          <circle cx="70" cy="-2" r="9"  fill="rgba(100,255,180,0.55)" />
          {/* Core bulb */}
          <circle cx="70" cy="-2" r="4.5" fill="rgba(220,255,230,0.97)" />
          {/* Specular highlight */}
          <circle cx="68" cy="-4" r="1.5" fill="white" />
        </svg>
      </div>
    </div>
  );
});

export default AnglerFish;
