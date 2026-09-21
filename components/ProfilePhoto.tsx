import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const BASE_URL = import.meta.env.BASE_URL;

const ProfilePhoto: React.FC = () => {
  const { theme } = useTheme();
  const [photoRotation, setPhotoRotation] = useState(0);
  const photoSpinRef = useRef({ isDragging: false, lastX: 0, velocity: 0, rotation: 0, idleFrames: 0 });
  const photoAnimRef = useRef<number>(0);

  const ensureAnimating = useCallback(() => {
    if (photoAnimRef.current) return;
    const spin = photoSpinRef.current;
    const animate = () => {
      let scheduleNext = false;
      if (!spin.isDragging && Math.abs(spin.velocity) > 0.1) {
        spin.velocity *= 0.97;
        spin.rotation += spin.velocity;
        spin.idleFrames = 0;
        setPhotoRotation(spin.rotation);
        scheduleNext = true;
      } else if (!spin.isDragging) {
        spin.velocity = 0;
        spin.idleFrames++;

        // Keep polling while rotated away from 0 -- either still counting
        // toward the 1s idle delay below, or actively snapping back.
        if (Math.abs(spin.rotation % 360) > 0.5) {
          // After ~1 second of idle (60 frames), smoothly return to 0
          if (spin.idleFrames > 60) {
            // Normalize rotation to nearest equivalent within [-180, 180]
            let target = spin.rotation % 360;
            if (target > 180) target -= 360;
            if (target < -180) target += 360;
            spin.rotation -= target * 0.06;
            // Snap when close enough
            if (Math.abs(spin.rotation % 360) < 0.5) {
              spin.rotation = 0;
            }
            setPhotoRotation(spin.rotation);
          }
          scheduleNext = true;
        }
      }
      // Stop polling once settled instead of looping forever with nothing to do.
      photoAnimRef.current = scheduleNext ? requestAnimationFrame(animate) : 0;
    };
    photoAnimRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    return () => {
      if (photoAnimRef.current) cancelAnimationFrame(photoAnimRef.current);
    };
  }, []);

  const handlePhotoPointerDown = useCallback((e: React.PointerEvent) => {
    const spin = photoSpinRef.current;
    spin.isDragging = true;
    spin.lastX = e.clientX;
    spin.velocity = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePhotoPointerMove = useCallback((e: React.PointerEvent) => {
    const spin = photoSpinRef.current;
    if (!spin.isDragging) return;
    const deltaX = e.clientX - spin.lastX;
    spin.velocity = deltaX * 2;
    spin.rotation += deltaX * 2;
    spin.lastX = e.clientX;
    setPhotoRotation(spin.rotation);
  }, []);

  const handlePhotoPointerUp = useCallback(() => {
    photoSpinRef.current.isDragging = false;
    ensureAnimating();
  }, [ensureAnimating]);

  return (
    <div
      className="w-48 h-48 md:w-64 md:h-64 mb-8 cursor-grab active:cursor-grabbing select-none"
      style={{ perspective: '800px' }}
      onPointerDown={handlePhotoPointerDown}
      onPointerMove={handlePhotoPointerMove}
      onPointerUp={handlePhotoPointerUp}
      onPointerCancel={handlePhotoPointerUp}
    >
      <div
        className={`w-full h-full rounded-full shadow-2xl border-4 ${theme === 'underwater' ? 'border-cyan-400/50' : 'border-indigo-400/50'} overflow-hidden`}
        style={{
          transform: `rotateY(${photoRotation}deg)`,
          transition: photoSpinRef.current.isDragging ? 'none' : 'transform 0.05s linear',
          transformStyle: 'preserve-3d',
        }}
      >
        <img
          src={`${BASE_URL}images/profile.webp`}
          alt="Evan Chen"
          className="w-full h-full object-cover pointer-events-none"
          fetchPriority="high"
          decoding="async"
          draggable={false}
        />
      </div>
    </div>
  );
};

export default React.memo(ProfilePhoto);
