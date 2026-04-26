import React, { useEffect, useRef, useState } from 'react';

interface FollowFishLinkProps {
  theme: 'underwater' | 'space';
}

const FISH_WIDTH = 210;
const FISH_HEIGHT = 92;
const FOLLOW_SMOOTHNESS = 0.06;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getInitialPosition = () => {
  if (typeof window === 'undefined') {
    return { x: 48, y: 140 };
  }
  return {
    x: Math.max(16, window.innerWidth - FISH_WIDTH - 28),
    y: Math.max(16, window.innerHeight - FISH_HEIGHT - 28),
  };
};

const FollowFishLink: React.FC<FollowFishLinkProps> = ({ theme }) => {
  const initialPosition = getInitialPosition();
  const [position, setPosition] = useState(initialPosition);
  const currentRef = useRef(initialPosition);
  const targetRef = useRef(initialPosition);

  useEffect(() => {
    const updateTarget = (clientX: number, clientY: number) => {
      const maxX = Math.max(16, window.innerWidth - FISH_WIDTH - 16);
      const maxY = Math.max(16, window.innerHeight - FISH_HEIGHT - 16);
      targetRef.current.x = clamp(clientX + 32, 16, maxX);
      targetRef.current.y = clamp(clientY + 28, 16, maxY);
    };

    const handleMouseMove = (event: MouseEvent) => {
      updateTarget(event.clientX, event.clientY);
    };

    const handleResize = () => {
      updateTarget(targetRef.current.x, targetRef.current.y);
    };

    let frameId = 0;
    const animate = () => {
      const current = currentRef.current;
      const target = targetRef.current;

      current.x += (target.x - current.x) * FOLLOW_SMOOTHNESS;
      current.y += (target.y - current.y) * FOLLOW_SMOOTHNESS;

      setPosition({ x: current.x, y: current.y });
      frameId = window.requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const glowClass = theme === 'underwater' ? 'shadow-[0_0_30px_rgba(34,211,238,0.35)]' : 'shadow-[0_0_30px_rgba(129,140,248,0.35)]';
  const textColor = theme === 'underwater' ? 'text-slate-900' : 'text-slate-900';

  return (
    <a
      href="https://www.instagram.com/hangyodonevantures/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open Instagram art account"
      className="fixed z-[70] block group"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <div className="relative" style={{ width: `${FISH_WIDTH}px`, height: `${FISH_HEIGHT}px` }}>
        <svg viewBox="0 0 210 92" className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${glowClass}`}>
          <defs>
            <linearGradient id="followFishGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className={theme === 'underwater' ? 'stop-cyan-300' : 'stop-indigo-300'} stopOpacity="0.95" />
              <stop offset="100%" className={theme === 'underwater' ? 'stop-blue-400' : 'stop-sky-300'} stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <path fill="url(#followFishGradient)" d="M185 46c-13-20-70-27-121-12-16 5-29 11-40 12 11 2 24 8 40 13 51 15 108 7 121-13z" />
          <path fill="url(#followFishGradient)" d="M34 46L8 30l11 16-11 16 26-16z" />
          <circle cx="151" cy="40" r="4.5" fill="rgba(255,255,255,0.85)" />
          <circle cx="152" cy="40" r="1.6" fill="rgba(0,0,0,0.45)" />
        </svg>

        <div className={`absolute inset-0 flex items-center justify-center font-semibold text-sm md:text-base ${textColor} tracking-wide`}>
          I also draw
        </div>

        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/85 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          Click to see my art Instagram
        </div>
      </div>
    </a>
  );
};

export default FollowFishLink;
