import React, { useEffect, useRef, useState } from 'react';
import AnglerFish from './AnglerFish';
import { AnglerFishState } from '../types';
import {
  subscribeToCreatureAnimation,
  randomInRange,
  SCROLL_PARALLAX,
  FISH_SIMULATION_FRAME_MS,
} from '../lib/creatureAnimation';

const ANGLER_REVEAL_RADIUS = 165;

interface AnglerFishLayerProps {
  theme: string;
  scrollYRef: React.MutableRefObject<number>;
  getNextEntityId: () => number;
  mousePosRef: React.MutableRefObject<{ x: number; y: number }>;
}

// Owns angler fish position state locally (instead of in App) so its ~30fps
// position updates only re-render this small component, not the whole app.
const AnglerFishLayer: React.FC<AnglerFishLayerProps> = ({ theme, scrollYRef, getNextEntityId, mousePosRef }) => {
  const [anglerFish, setAnglerFish] = useState<AnglerFishState | null>(null);
  const anglerLastFrameTimeRef = useRef(0);
  const isPageHiddenRef = useRef(document.hidden);

  useEffect(() => {
    const handleVisibility = () => { isPageHiddenRef.current = document.hidden; };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const animateAnglerFish = (timestamp: number) => {
      if (isPageHiddenRef.current) return;
      if (timestamp - anglerLastFrameTimeRef.current < FISH_SIMULATION_FRAME_MS) return;
      anglerLastFrameTimeRef.current = timestamp;

      if (theme !== 'deepsea') {
        setAnglerFish(null);
        return;
      }

      setAnglerFish(current => {
        const viewportWorldTop = scrollYRef.current * SCROLL_PARALLAX;

        if (!current) {
          const spawnX = randomInRange(window.innerWidth * 0.18, window.innerWidth * 0.82);
          const spawnBaseY = viewportWorldTop + window.innerHeight * (0.3 + Math.random() * 0.45);
          return {
            id: getNextEntityId(),
            x: spawnX,
            y: spawnBaseY,
            baseY: spawnBaseY,
            vx: (Math.random() > 0.5 ? 1 : -1) * randomInRange(0.22, 0.38),
            scale: randomInRange(0.8, 1.15),
            phase: Math.random() * Math.PI * 2,
          };
        }

        let vx = current.vx;
        let x = current.x + vx;
        const edgePad = 120;
        if (x < edgePad || x > window.innerWidth - edgePad) {
          vx *= -1;
          x = Math.max(edgePad, Math.min(window.innerWidth - edgePad, x));
        }

        let baseY = current.baseY;
        const targetY = viewportWorldTop + window.innerHeight * 0.42;
        baseY += (targetY - baseY) * 0.018;
        const y = baseY + Math.sin(timestamp / 1700 + current.phase) * 16;

        return { ...current, x, y, baseY, vx };
      });

    };

    const unsubscribe = theme === 'deepsea'
      ? subscribeToCreatureAnimation(animateAnglerFish)
      : () => {};
    if (theme !== 'deepsea') {
      setAnglerFish(null);
    }

    return unsubscribe;
  }, [theme, getNextEntityId, scrollYRef]);

  if (!anglerFish) return null;

  const anglerDisplayY = anglerFish.y - scrollYRef.current * SCROLL_PARALLAX;
  const isAnglerRevealed = Math.hypot(
    mousePosRef.current.x - anglerFish.x,
    mousePosRef.current.y - anglerDisplayY,
  ) < (ANGLER_REVEAL_RADIUS * anglerFish.scale);

  return (
    <AnglerFish
      x={anglerFish.x}
      displayY={anglerDisplayY}
      scale={anglerFish.scale}
      revealBody={isAnglerRevealed}
      isFlipped={anglerFish.vx > 0}
    />
  );
};

export default React.memo(AnglerFishLayer);
