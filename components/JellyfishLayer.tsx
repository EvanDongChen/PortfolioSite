import React, { useEffect, useRef, useState } from 'react';
import Jellyfish from './Jellyfish';
import { JellyfishState } from '../types';
import {
  subscribeToCreatureAnimation,
  randomInRange,
  largeCreatureSnapshots,
  SCROLL_PARALLAX,
  FISH_SIMULATION_FRAME_MS,
} from '../lib/creatureAnimation';

const JELLYFISH_INITIAL_DELAY_MIN_MS = 1500;
const JELLYFISH_INITIAL_DELAY_MAX_MS = 5000;
const JELLYFISH_RESPAWN_DELAY_MIN_MS = 4000;
const JELLYFISH_RESPAWN_DELAY_MAX_MS = 10000;
const JELLYFISH_COLORS: [string, string][] = [
  ['#fda4af', '#fb7185'],
  ['#f9a8d4', '#f472b6'],
  ['#fbcfe8', '#ec4899'],
  ['#fda4af', '#db2777'],
];

interface JellyfishLayerProps {
  theme: string;
  scrollYRef: React.MutableRefObject<number>;
  getNextEntityId: () => number;
  emitJellyfishPop: (x: number, y: number, scale: number) => void;
}

// Owns jellyfish position state locally (instead of in App) so its ~30fps
// position updates only re-render this small component. The turtle "eats"
// the jellyfish on contact and steers toward it; that cross-reference goes
// through the shared largeCreatureSnapshots registry rather than React
// state, since turtle now lives in a sibling component.
const JellyfishLayer: React.FC<JellyfishLayerProps> = ({ theme, scrollYRef, getNextEntityId, emitJellyfishPop }) => {
  const [jellyfish, setJellyfish] = useState<JellyfishState | null>(null);
  const nextJellyfishSpawnRef = useRef(0);
  const jellyfishLastFrameTimeRef = useRef(0);
  const isPageHiddenRef = useRef(document.hidden);

  useEffect(() => {
    largeCreatureSnapshots.jellyfish = jellyfish;
  }, [jellyfish]);

  useEffect(() => {
    const handleVisibility = () => { isPageHiddenRef.current = document.hidden; };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    return () => {
      // Don't leave a stale jellyfish position behind for the turtle to
      // chase once this layer unmounts (theme change away from underwater).
      largeCreatureSnapshots.jellyfish = null;
    };
  }, []);

  useEffect(() => {
    const randomJellyfishDelay = () => randomInRange(JELLYFISH_RESPAWN_DELAY_MIN_MS, JELLYFISH_RESPAWN_DELAY_MAX_MS);
    if (nextJellyfishSpawnRef.current === 0) {
      nextJellyfishSpawnRef.current = performance.now() + randomInRange(JELLYFISH_INITIAL_DELAY_MIN_MS, JELLYFISH_INITIAL_DELAY_MAX_MS);
    }

    const animateJellyfish = (timestamp: number) => {
      if (isPageHiddenRef.current) return;
      if (timestamp - jellyfishLastFrameTimeRef.current < FISH_SIMULATION_FRAME_MS) return;
      jellyfishLastFrameTimeRef.current = timestamp;
      if (theme !== 'underwater') {
        setJellyfish(null);
        nextJellyfishSpawnRef.current = timestamp + randomInRange(JELLYFISH_INITIAL_DELAY_MIN_MS, JELLYFISH_INITIAL_DELAY_MAX_MS);
        return;
      }

      setJellyfish(current => {
        if (!current) {
          if (timestamp < nextJellyfishSpawnRef.current) return null;

          const fromLeft = Math.random() > 0.5;
          const scale = 0.9 + Math.random() * 0.55;
          const speed = 0.18 + Math.random() * 0.17;
          const x = fromLeft ? -120 : window.innerWidth + 120;
          const viewportWorldTop = scrollYRef.current * SCROLL_PARALLAX;
          const baseY = viewportWorldTop + window.innerHeight * (0.15 + Math.random() * 0.65);
          const [color1, color2] = JELLYFISH_COLORS[Math.floor(Math.random() * JELLYFISH_COLORS.length)];

          return {
            id: getNextEntityId(),
            x,
            y: baseY,
            baseY,
            displayY: baseY - scrollYRef.current * SCROLL_PARALLAX,
            vx: fromLeft ? speed : -speed,
            scale,
            isFlipped: !fromLeft,
            phase: Math.random() * Math.PI * 2,
            color1,
            color2,
          };
        }

        const turtle = largeCreatureSnapshots.turtle;
        if (turtle) {
          const dx = turtle.x - current.x;
          const dy = turtle.y - current.y;
          const eatRadius = (45 * turtle.scale) + (28 * current.scale);
          if ((dx * dx + dy * dy) < (eatRadius * eatRadius)) {
            const scrollWorldOffset = scrollYRef.current * SCROLL_PARALLAX;
            const turtleCenterX = turtle.x + 90 * turtle.scale;
            const turtleCenterY = (turtle.y - scrollWorldOffset) + 55 * turtle.scale;
            const jellyCenterX = current.x + 40 * current.scale;
            const jellyCenterY = (current.y - scrollWorldOffset) + 50 * current.scale;
            const popX = (turtleCenterX + jellyCenterX) * 0.5;
            const popY = (turtleCenterY + jellyCenterY) * 0.5;
            emitJellyfishPop(popX, popY, current.scale);
            nextJellyfishSpawnRef.current = timestamp + randomJellyfishDelay();
            return null;
          }
        }

        const x = current.x + current.vx;
        const y = current.baseY + Math.sin(timestamp / 2200 + current.phase) * 20;
        const displayY = y - scrollYRef.current * SCROLL_PARALLAX;

        if (x < -160 || x > window.innerWidth + 160) {
          nextJellyfishSpawnRef.current = timestamp + randomJellyfishDelay();
          return null;
        }

        return { ...current, x, y, displayY };
      });

    };

    const unsubscribe = theme === 'underwater'
      ? subscribeToCreatureAnimation(animateJellyfish)
      : () => {};
    if (theme !== 'underwater') {
      setJellyfish(null);
    }

    return unsubscribe;
  }, [theme, getNextEntityId, emitJellyfishPop, scrollYRef]);

  if (!jellyfish) return null;

  return (
    <Jellyfish
      id={jellyfish.id}
      x={jellyfish.x}
      displayY={jellyfish.displayY}
      scale={jellyfish.scale}
      isFlipped={jellyfish.isFlipped}
      color1={jellyfish.color1}
      color2={jellyfish.color2}
    />
  );
};

export default React.memo(JellyfishLayer);
