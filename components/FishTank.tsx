import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Fish as FishType, FishFood as FishFoodType } from '../types';
import Fish from './Fish';

interface FishTankProps {
  isOpen: boolean;
  onClose: () => void;
  tankFishes: FishType[];
  onDropFish: () => void;
  onGrabFishFromTank: (fish: FishType) => void;
  onFishBreed: (baby: FishType) => void;
  isGrabMode: boolean;
  hasGrabbedFish: boolean;
  isFishFoodMode: boolean;
  isLoveMode: boolean;
}

const SPIRAL_DURATION = 4000;
const START_RADIUS = 60;
const END_RADIUS = 15;

const FishTank: React.FC<FishTankProps> = ({ 
  isOpen, 
  onClose, 
  tankFishes, 
  onDropFish, 
  onGrabFishFromTank,
  onFishBreed,
  isGrabMode, 
  hasGrabbedFish,
  isFishFoodMode,
  isLoveMode,
}) => {
  const [internalFishes, setInternalFishes] = useState<FishType[]>([]);
  const [internalFoods, setInternalFoods] = useState<FishFoodType[]>([]);
  
  const tankPosRef = useRef({ x: window.innerWidth - 520, y: window.innerHeight - 400 });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  
  const fishesRef = useRef<FishType[]>([]);
  const foodsRef = useRef<FishFoodType[]>([]);
  const tankRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

  // Sync internal fishes
  useEffect(() => {
    fishesRef.current = tankFishes.map(f => {
      const existing = fishesRef.current.find(ef => ef.id === f.id);
      if (existing) return existing;
      return {
        ...f,
        x: f.x ?? (Math.random() * 380 + 40),
        y: f.y ?? (Math.random() * 240 + 60),
        displayY: 0,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 1,
      };
    });
    setInternalFishes([...fishesRef.current]);
  }, [tankFishes]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDraggingRef.current = true;
    dragOffsetRef.current = { x: e.clientX - tankPosRef.current.x, y: e.clientY - tankPosRef.current.y };
    if (tankRef.current) tankRef.current.style.cursor = 'grabbing';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !tankRef.current) return;
      const nextX = e.clientX - dragOffsetRef.current.x;
      const nextY = e.clientY - dragOffsetRef.current.y;
      tankPosRef.current = { x: nextX, y: nextY };
      tankRef.current.style.left = `${nextX}px`;
      tankRef.current.style.top = `${nextY}px`;
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      if (tankRef.current) tankRef.current.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const dropFood = (e: React.MouseEvent) => {
    if (!isFishFoodMode) return;
    if ((e.target as HTMLElement).closest('.tank-header')) return;
    const rect = tankRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newFood: FishFoodType = {
      id: Date.now() + Math.random(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      worldY: e.clientY - rect.top,
      type: isLoveMode ? 'love' : 'regular',
      spawnTime: performance.now()
    };
    foodsRef.current.push(newFood);
    setInternalFoods([...foodsRef.current]);
  };

  const animate = useCallback((timestamp: number) => {
    // 1. Cleanup and Pre-calculations
    foodsRef.current = foodsRef.current.filter(food => timestamp - food.spawnTime < 8000);
    const matingTriggers = new Map<number, { partnerId: number, center: { x: number, y: number } }>();
    const spiralTriggers = new Set<number>();
    const assignedForLove = new Set<number>();

    // love food logic - ensure same species
    foodsRef.current.filter(f => f.type === 'love').forEach(food => {
      const variantCounts = new Map<string, FishType[]>();
      fishesRef.current.forEach(f => {
        if (f.behavior === 'mating' || assignedForLove.has(f.id)) return;
        const dist = Math.hypot(f.x - food.x, f.y - food.y);
        if (dist < 300) {
          const list = variantCounts.get(f.variant) || [];
          list.push({ ...f, dist } as any);
          variantCounts.set(f.variant, list);
        }
      });

      let bestVariant: string | null = null;
      let minPairDist = Infinity;
      variantCounts.forEach((fishes, variant) => {
        if (fishes.length >= 2) {
          fishes.sort((a, b) => (a as any).dist - (b as any).dist);
          const d = (fishes[0] as any).dist + (fishes[1] as any).dist;
          if (d < minPairDist) { minPairDist = d; bestVariant = variant; }
        }
      });

      if (bestVariant) {
        const pair = variantCounts.get(bestVariant)!.sort((a, b) => (a as any).dist - (b as any).dist).slice(0, 2);
        pair.forEach(nf => assignedForLove.add(nf.id));
        if (pair.some(f => (f as any).dist < 25)) {
           matingTriggers.set(pair[0].id, { partnerId: pair[1].id, center: { x: food.x, y: food.y } });
           matingTriggers.set(pair[1].id, { partnerId: pair[0].id, center: { x: food.x, y: food.y } });
           foodsRef.current = foodsRef.current.filter(f => f.id !== food.id);
        }
      }
    });

    // spiral synchronization
    fishesRef.current.forEach(fish => {
      if (fish.behavior === 'mating' && !fish.matingSpiralStartTime) {
        const partner = fishesRef.current.find(f => f.id === fish.matingPartnerId);
        if (partner && partner.behavior === 'mating') {
          // If they are both close enough to the center, start spiral
          const distToCenter = Math.hypot(fish.x - fish.matingCenter!.x, fish.y - fish.matingCenter!.y);
          const partnerDistToCenter = Math.hypot(partner.x - partner.matingCenter!.x, partner.y - partner.matingCenter!.y);
          if (distToCenter < 70 && partnerDistToCenter < 70) {
            spiralTriggers.add(fish.id);
            spiralTriggers.add(partner.id);
          }
        }
      }
    });

    // 2. Main Simulation Loop
    fishesRef.current = fishesRef.current.map(fish => {
      let { x, y, vx, vy, behavior, matingStartTime, matingPartnerId, matingCenter, matingSpiralStartTime, rotation } = fish;

      // Apply triggers
      if (matingTriggers.has(fish.id)) {
        const trigger = matingTriggers.get(fish.id)!;
        behavior = 'mating';
        matingStartTime = timestamp;
        matingPartnerId = trigger.partnerId;
        matingCenter = trigger.center;
        matingSpiralStartTime = undefined;
      }
      if (spiralTriggers.has(fish.id)) {
        matingSpiralStartTime = timestamp;
      }

      if (behavior === 'mating' && matingCenter) {
        if (matingSpiralStartTime) {
          const elapsed = timestamp - matingSpiralStartTime;
          const t = Math.min(1, elapsed / SPIRAL_DURATION);
          if (t >= 1) {
            if (fish.id < matingPartnerId!) {
              onFishBreed({ ...fish, id: Date.now() + Math.random(), x: matingCenter.x, y: matingCenter.y, scale: 0.35, behavior: 'cruise' });
            }
            behavior = 'cruise';
          } else {
            const currentRadius = START_RADIUS - (START_RADIUS - END_RADIUS) * t;
            const isTop = fish.id < matingPartnerId!;
            const angle = (elapsed * (0.005 + t * 0.005)) + (isTop ? -Math.PI/2 : Math.PI/2);
            const tx = matingCenter.x + Math.cos(angle) * currentRadius;
            const ty = matingCenter.y + Math.sin(angle) * currentRadius;
            vx = (tx - x) * 0.5; vy = (ty - y) * 0.5;
            rotation = (angle + Math.PI / 2) * (180 / Math.PI);
          }
        } else {
          // Steering toward center to meet partner
          const dx = matingCenter.x - x;
          const dy = matingCenter.y - y;
          const dist = Math.hypot(dx, dy);
          vx += (dx / dist) * 0.35;
          vy += (dy / dist) * 0.35;
          rotation = Math.atan2(vy, vx) * (180 / Math.PI);
          if (timestamp - matingStartTime! > 8000) behavior = 'cruise';
        }
      } else {
        behavior = 'cruise';
        vx += (Math.random() - 0.5) * 0.12; vy += (Math.random() - 0.5) * 0.12;
        rotation = Math.atan2(vy, vx) * (180 / Math.PI);
      }

      const speed = Math.hypot(vx, vy);
      const maxSpeed = (behavior === 'mating' && !matingSpiralStartTime) ? 6 : (matingSpiralStartTime ? 8 : 2.8);
      if (speed > 0.01) { vx = (vx / speed) * Math.min(speed, maxSpeed); vy = (vy / speed) * Math.min(speed, maxSpeed); }

      x += vx; y += vy;

      if (x < 30) { vx = Math.abs(vx); fish.isFlipped = false; }
      if (x > 450) { vx = -Math.abs(vx); fish.isFlipped = true; }
      if (y < 50) { vy = Math.abs(vy); }
      if (y > 330) { vy = -Math.abs(vy); }

      return { ...fish, x, y, displayY: y, vx, vy, behavior, matingStartTime, matingPartnerId, matingCenter, matingSpiralStartTime, rotation };
    });

    setInternalFishes([...fishesRef.current]);
    setInternalFoods([...foodsRef.current]);
    requestRef.current = requestAnimationFrame(animate);
  }, [onFishBreed]);

  useEffect(() => {
    if (isOpen) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isOpen, animate]);

  if (!isOpen) return null;

  return (
    <div 
      ref={tankRef}
      data-is-tank="true"
      style={{ left: `${tankPosRef.current.x}px`, top: `${tankPosRef.current.y}px` }}
      className="fixed z-[60] w-[480px] h-[360px] bg-slate-900/40 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up"
      onMouseDown={isFishFoodMode ? undefined : handleMouseDown}
      onClick={isFishFoodMode ? dropFood : undefined}
    >
      <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-center bg-gradient-to-b from-cyan-900/40 to-transparent z-10 cursor-grab active:cursor-grabbing tank-header" onMouseDown={handleMouseDown}>
        <h3 className="text-cyan-100 text-[11px] font-bold tracking-widest uppercase flex items-center gap-2 select-none">
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
          Portable Ecosystem
        </h3>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-cyan-100/50 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-blue-900/20 pointer-events-none"></div>
      
      {isGrabMode && hasGrabbedFish && (
        <div className="absolute inset-0 bg-amber-500/10 border-2 border-dashed border-amber-400/40 rounded-3xl flex items-center justify-center z-20 animate-pulse pointer-events-none">
          <span className="text-amber-200 text-[11px] font-semibold bg-slate-900/80 px-4 py-2 rounded-full backdrop-blur-sm">Drop Fish Here</span>
        </div>
      )}

      {internalFoods.map(food => (
        <div key={food.id} className={`absolute rounded-full blur-[1px] animate-bounce flex items-center justify-center ${food.type === 'love' ? 'w-4 h-4 text-pink-400' : 'w-2 h-2 bg-amber-400'}`} style={{ left: food.x, top: food.y }}>
          {food.type === 'love' && (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-[0_0_5px_rgba(244,114,182,0.8)]">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          )}
        </div>
      ))}

      <div className="relative w-full h-full">
        {internalFishes.map(fish => (
          <div key={fish.id} style={{ position: 'absolute', left: fish.x, top: fish.y, cursor: isGrabMode ? 'crosshair' : 'default', pointerEvents: isGrabMode ? 'auto' : 'none', zIndex: 30 }} onMouseDown={(e) => { if (isGrabMode) { onGrabFishFromTank(fish); e.stopPropagation(); } }}>
            <Fish {...fish} x={0} displayY={0} isGrabMode={isGrabMode} />
          </div>
        ))}
        {internalFishes.length === 0 && !hasGrabbedFish && (
          <div className="absolute inset-0 flex items-center justify-center text-cyan-200/30 text-[11px] italic select-none">Tank is empty...</div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-amber-200/20 to-transparent"></div>
    </div>
  );
};

export default FishTank;
