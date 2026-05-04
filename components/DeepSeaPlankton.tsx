import React, { useEffect, useRef, useState } from 'react';
import { Fish as FishType } from '../types';

interface PlanktonParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  twinkle: number;
  phase: number;
}

interface DeepSeaPlanktonProps {
  active: boolean;
  fishesRef: React.MutableRefObject<FishType[]>;
  scrollYRef: React.MutableRefObject<number>;
  isPageHiddenRef: React.MutableRefObject<boolean>;
  scrollParallax: number;
}

const DeepSeaPlankton: React.FC<DeepSeaPlanktonProps> = React.memo(({
  active,
  fishesRef,
  scrollYRef,
  isPageHiddenRef,
  scrollParallax,
}) => {
  const [particles, setParticles] = useState<PlanktonParticle[]>([]);
  const lastFrameTimeRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const particleCount = Math.max(36, Math.min(78, Math.floor(window.innerWidth / 18)));
    const nextParticles = Array.from({ length: particleCount }).map((_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2.8 + 1.2,
      hue: 155 + Math.random() * 55,
      twinkle: 0.012 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
    }));

    setParticles(nextParticles);
  }, [active]);

  useEffect(() => {
    if (!active) return;

    let animationFrameId = 0;

    const animate = (timestamp: number) => {
      if (isPageHiddenRef.current) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      if (timestamp - lastFrameTimeRef.current < 1000 / 24) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      lastFrameTimeRef.current = timestamp;

      const viewportTop = scrollYRef.current * scrollParallax;
      const fishSnapshot = fishesRef.current;

      setParticles((current) => {
        if (current.length === 0) return current;

        return current.map((particle) => {
          let vx = particle.vx + Math.sin(timestamp / 1300 + particle.phase) * 0.01;
          let vy = particle.vy + Math.cos(timestamp / 1500 + particle.phase) * 0.01;

          // Sample every other fish to cut reaction cost while keeping motion believable.
          for (let i = 0; i < fishSnapshot.length; i += 2) {
            const fish = fishSnapshot[i];
            const fishX = fish.x;
            const fishY = fish.y - viewportTop;
            const dx = particle.x - fishX;
            const dy = particle.y - fishY;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq > 0 && distanceSq < 110 * 110) {
              const distance = Math.sqrt(distanceSq);
              const force = ((110 - distance) / 110) * 0.08;
              vx += (dx / distance) * force;
              vy += (dy / distance) * force;
            }
          }

          const speed = Math.hypot(vx, vy);
          if (speed > 0.85) {
            const cap = 0.85 / speed;
            vx *= cap;
            vy *= cap;
          }

          vx *= 0.99;
          vy *= 0.99;

          let x = particle.x + vx;
          let y = particle.y + vy;
          const pad = 30;
          if (x < -pad) x = window.innerWidth + pad;
          else if (x > window.innerWidth + pad) x = -pad;
          if (y < -pad) y = window.innerHeight + pad;
          else if (y > window.innerHeight + pad) y = -pad;

          return {
            ...particle,
            x,
            y,
            vx,
            vy,
            phase: particle.phase + particle.twinkle,
          };
        });
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [active, fishesRef, scrollYRef, isPageHiddenRef, scrollParallax]);

  if (!active || particles.length === 0) return null;

  return (
    <>
      {particles.map((p) => {
        const alpha = 0.35 + (Math.sin(p.phase * 2.6) + 1) * 0.2;
        const color = `hsla(${p.hue}, 98%, 72%, ${alpha})`;
        return (
          <div
            key={`plankton-${p.id}`}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              borderRadius: '9999px',
              background: color,
              boxShadow: `0 0 ${p.size * 3}px ${color}, 0 0 ${p.size * 7}px ${color}`,
              transform: 'translate(-50%, -50%)',
              opacity: 0.9,
              willChange: 'transform, opacity',
            }}
          />
        );
      })}
    </>
  );
});

export default DeepSeaPlankton;
