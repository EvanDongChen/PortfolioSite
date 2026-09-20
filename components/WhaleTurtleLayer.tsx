import React, { useEffect, useRef, useState } from 'react';
import Whale from './Whale';
import Turtle from './Turtle';
import { WhaleState, TurtleState } from '../types';
import {
  subscribeToCreatureAnimation,
  randomInRange,
  largeCreatureSnapshots,
  SCROLL_PARALLAX,
  FISH_SIMULATION_FRAME_MS,
} from '../lib/creatureAnimation';

const LARGE_CREATURE_MIN_SEPARATION = 220;

const WHALE_INITIAL_DELAY_MIN_MS = 2500;
const WHALE_INITIAL_DELAY_MAX_MS = 7000;
const WHALE_RESPAWN_DELAY_MIN_MS = 6000;
const WHALE_RESPAWN_DELAY_MAX_MS = 14000;

const TURTLE_INITIAL_DELAY_MIN_MS = 3000;
const TURTLE_INITIAL_DELAY_MAX_MS = 8000;
const TURTLE_RESPAWN_DELAY_MIN_MS = 7000;
const TURTLE_RESPAWN_DELAY_MAX_MS = 16000;

interface WhaleTurtleLayerProps {
  theme: string;
  scrollYRef: React.MutableRefObject<number>;
  getNextEntityId: () => number;
}

// Owns whale + turtle position state locally (instead of in App) so their
// ~30fps position updates only re-render this small component, not the
// whole app. Whale/turtle spawn logic avoids overlapping each other, so
// they're kept together here using plain refs; turtle also steers toward
// and "eats" the jellyfish, which lives in a separate component, so that
// cross-reference goes through the shared largeCreatureSnapshots registry.
const WhaleTurtleLayer: React.FC<WhaleTurtleLayerProps> = ({ theme, scrollYRef, getNextEntityId }) => {
  const [whale, setWhale] = useState<WhaleState | null>(null);
  const [turtle, setTurtle] = useState<TurtleState | null>(null);

  const whaleRef = useRef<WhaleState | null>(null);
  const turtleRef = useRef<TurtleState | null>(null);
  const nextWhaleSpawnRef = useRef(0);
  const nextTurtleSpawnRef = useRef(0);
  const firstLargeCreatureSideRef = useRef<'left' | 'right' | null>(null);
  const whaleHasSpawnedRef = useRef(false);
  const turtleHasSpawnedRef = useRef(false);
  const whaleLastFrameTimeRef = useRef(0);
  const turtleLastFrameTimeRef = useRef(0);
  const isPageHiddenRef = useRef(document.hidden);

  useEffect(() => { whaleRef.current = whale; }, [whale]);
  useEffect(() => {
    turtleRef.current = turtle;
    largeCreatureSnapshots.turtle = turtle;
  }, [turtle]);

  useEffect(() => {
    const handleVisibility = () => { isPageHiddenRef.current = document.hidden; };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    firstLargeCreatureSideRef.current = null;
    whaleHasSpawnedRef.current = false;
    turtleHasSpawnedRef.current = false;
  }, [theme]);

  useEffect(() => {
    const randomWhaleDelay = () => randomInRange(WHALE_RESPAWN_DELAY_MIN_MS, WHALE_RESPAWN_DELAY_MAX_MS);
    if (nextWhaleSpawnRef.current === 0) {
      nextWhaleSpawnRef.current = performance.now() + randomInRange(WHALE_INITIAL_DELAY_MIN_MS, WHALE_INITIAL_DELAY_MAX_MS);
    }

    const animateWhale = (timestamp: number) => {
      if (isPageHiddenRef.current) return;
      if (timestamp - whaleLastFrameTimeRef.current < FISH_SIMULATION_FRAME_MS) return;
      whaleLastFrameTimeRef.current = timestamp;
      if (theme !== 'underwater') {
        setWhale(null);
        nextWhaleSpawnRef.current = timestamp + randomInRange(WHALE_INITIAL_DELAY_MIN_MS, WHALE_INITIAL_DELAY_MAX_MS);
        return;
      }

      setWhale(current => {
        if (!current) {
          if (timestamp < nextWhaleSpawnRef.current) return null;

          let fromLeft = Math.random() > 0.5;
          if (!whaleHasSpawnedRef.current) {
            if (turtleHasSpawnedRef.current && firstLargeCreatureSideRef.current) {
              fromLeft = firstLargeCreatureSideRef.current === 'left' ? false : true;
            } else {
              firstLargeCreatureSideRef.current = fromLeft ? 'left' : 'right';
            }
          }
          const scale = 1.0 + Math.random() * 0.5;
          const speed = 0.4 + Math.random() * 0.35;
          const x = fromLeft ? -420 : window.innerWidth + 420;
          const viewportWorldTop = scrollYRef.current * SCROLL_PARALLAX;
          const minSpawnY = viewportWorldTop + window.innerHeight * 0.12;
          const maxSpawnY = viewportWorldTop + window.innerHeight * 0.88;
          let baseY = viewportWorldTop + window.innerHeight * (0.15 + Math.random() * 0.65);
          const turtleY = turtleRef.current?.y;
          if (typeof turtleY === 'number' && Math.abs(baseY - turtleY) < LARGE_CREATURE_MIN_SEPARATION) {
            const shifted = turtleY + (baseY < turtleY ? -LARGE_CREATURE_MIN_SEPARATION : LARGE_CREATURE_MIN_SEPARATION);
            baseY = Math.max(minSpawnY, Math.min(maxSpawnY, shifted));
            if (Math.abs(baseY - turtleY) < LARGE_CREATURE_MIN_SEPARATION) {
              nextWhaleSpawnRef.current = timestamp + 900;
              return null;
            }
          }
          const y = baseY;

          whaleHasSpawnedRef.current = true;
          if (!firstLargeCreatureSideRef.current) {
            firstLargeCreatureSideRef.current = fromLeft ? 'left' : 'right';
          }

          return {
            id: getNextEntityId(),
            x,
            y,
            baseY,
            displayY: y - scrollYRef.current * SCROLL_PARALLAX,
            vx: fromLeft ? speed : -speed,
            scale,
            isFlipped: !fromLeft,
            phase: Math.random() * Math.PI * 2,
          };
        }

        const x = current.x + current.vx;
        const y = current.baseY + Math.sin(timestamp / 1400 + current.phase) * 12;
        const displayY = y - scrollYRef.current * SCROLL_PARALLAX;

        if (x < -520 || x > window.innerWidth + 520) {
          nextWhaleSpawnRef.current = timestamp + randomWhaleDelay();
          return null;
        }

        return { ...current, x, y, displayY };
      });

    };

    const unsubscribe = theme === 'underwater'
      ? subscribeToCreatureAnimation(animateWhale)
      : () => {};
    if (theme !== 'underwater') {
      setWhale(null);
    }

    return unsubscribe;
  }, [theme, getNextEntityId, scrollYRef]);

  useEffect(() => {
    const randomTurtleDelay = () => randomInRange(TURTLE_RESPAWN_DELAY_MIN_MS, TURTLE_RESPAWN_DELAY_MAX_MS);
    if (nextTurtleSpawnRef.current === 0) {
      nextTurtleSpawnRef.current = performance.now() + randomInRange(TURTLE_INITIAL_DELAY_MIN_MS, TURTLE_INITIAL_DELAY_MAX_MS);
    }

    const animateTurtle = (timestamp: number) => {
      if (isPageHiddenRef.current) return;
      if (timestamp - turtleLastFrameTimeRef.current < FISH_SIMULATION_FRAME_MS) return;
      turtleLastFrameTimeRef.current = timestamp;
      if (theme !== 'underwater') {
        setTurtle(null);
        nextTurtleSpawnRef.current = timestamp + randomInRange(TURTLE_INITIAL_DELAY_MIN_MS, TURTLE_INITIAL_DELAY_MAX_MS);
        return;
      }

      setTurtle(current => {
        if (!current) {
          if (timestamp < nextTurtleSpawnRef.current) return null;

          let fromLeft = Math.random() > 0.5;
          if (!turtleHasSpawnedRef.current) {
            if (whaleHasSpawnedRef.current && firstLargeCreatureSideRef.current) {
              fromLeft = firstLargeCreatureSideRef.current === 'left' ? false : true;
            } else {
              firstLargeCreatureSideRef.current = fromLeft ? 'left' : 'right';
            }
          }
          const scale = 0.8 + Math.random() * 0.45;
          const speed = 0.28 + Math.random() * 0.24;
          const x = fromLeft ? -260 : window.innerWidth + 260;
          const viewportWorldTop = scrollYRef.current * SCROLL_PARALLAX;
          const minSpawnY = viewportWorldTop + window.innerHeight * 0.14;
          const maxSpawnY = viewportWorldTop + window.innerHeight * 0.9;
          let baseY = viewportWorldTop + window.innerHeight * (0.2 + Math.random() * 0.65);
          const whaleY = whaleRef.current?.y;
          if (typeof whaleY === 'number' && Math.abs(baseY - whaleY) < LARGE_CREATURE_MIN_SEPARATION) {
            const shifted = whaleY + (baseY < whaleY ? -LARGE_CREATURE_MIN_SEPARATION : LARGE_CREATURE_MIN_SEPARATION);
            baseY = Math.max(minSpawnY, Math.min(maxSpawnY, shifted));
            if (Math.abs(baseY - whaleY) < LARGE_CREATURE_MIN_SEPARATION) {
              nextTurtleSpawnRef.current = timestamp + 900;
              return null;
            }
          }

          turtleHasSpawnedRef.current = true;
          if (!firstLargeCreatureSideRef.current) {
            firstLargeCreatureSideRef.current = fromLeft ? 'left' : 'right';
          }

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
          };
        }

        let vx = current.vx;
        let baseY = current.baseY; // world-space Y
        const jelly = largeCreatureSnapshots.jellyfish;

        if (jelly) {
          // Steer X toward jellyfish
          const dx = jelly.x - current.x;
          const desiredDirection = dx >= 0 ? 1 : -1;
          const desiredSpeed = Math.min(1.2, Math.max(0.42, Math.abs(dx) * 0.004 + 0.35));
          vx += (desiredDirection * desiredSpeed - vx) * 0.075;
          // Steer Y toward jellyfish world Y
          baseY += (jelly.y - baseY) * 0.025;
        }

        // No viewport clamping — turtle lives at a fixed world position
        // and disappears naturally when you scroll away from it

        const x = current.x + vx;
        const y = baseY + Math.sin(timestamp / 1800 + current.phase) * 9;
        const displayY = y - scrollYRef.current * SCROLL_PARALLAX;

        if (x < -320 || x > window.innerWidth + 320) {
          nextTurtleSpawnRef.current = timestamp + randomTurtleDelay();
          return null;
        }

        return { ...current, x, y, baseY, displayY, vx, isFlipped: vx < 0 };
      });

    };

    const unsubscribe = theme === 'underwater'
      ? subscribeToCreatureAnimation(animateTurtle)
      : () => {};
    if (theme !== 'underwater') {
      setTurtle(null);
    }

    return unsubscribe;
  }, [theme, getNextEntityId, scrollYRef]);

  return (
    <>
      {whale && <Whale x={whale.x} displayY={whale.displayY} scale={whale.scale} isFlipped={whale.isFlipped} />}
      {turtle && <Turtle x={turtle.x} displayY={turtle.displayY} scale={turtle.scale} isFlipped={turtle.isFlipped} />}
    </>
  );
};

export default React.memo(WhaleTurtleLayer);
