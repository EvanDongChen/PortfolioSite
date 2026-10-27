import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const BASE_URL = import.meta.env.BASE_URL;
const PHOTO_URL = `${BASE_URL}images/profile.webp`;
// Pixel mode shows the photo at this many blocks across until hovered.
const PIXEL_PHOTO_SIZE = 36;

const ProfilePhoto: React.FC = () => {
  const { theme, isPixelMode } = useTheme();
  const pixelCanvasRef = useRef<HTMLCanvasElement>(null);
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

  // Draw a centre-cropped, low-resolution copy for the pixel look.
  useEffect(() => {
    const canvas = pixelCanvasRef.current;
    if (!isPixelMode || !canvas) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, PIXEL_PHOTO_SIZE, PIXEL_PHOTO_SIZE);
    };
    img.src = PHOTO_URL;
  }, [isPixelMode]);

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
        className={`profile-frame group relative w-full h-full rounded-full shadow-2xl border-4 ${theme === 'underwater' ? 'border-cyan-400/50' : 'border-indigo-400/50'} overflow-hidden`}
        style={{
          transform: `rotateY(${photoRotation}deg)`,
          transition: photoSpinRef.current.isDragging ? 'none' : 'transform 0.05s linear',
          transformStyle: 'preserve-3d',
        }}
      >
        <img
          src={PHOTO_URL}
          alt="Evan Chen"
          className="w-full h-full object-cover pointer-events-none"
          fetchPriority="high"
          decoding="async"
          draggable={false}
        />
        {isPixelMode && (
          <canvas
            ref={pixelCanvasRef}
            width={PIXEL_PHOTO_SIZE}
            height={PIXEL_PHOTO_SIZE}
            className="profile-pixels absolute inset-0 w-full h-full pointer-events-none"
            style={{ imageRendering: 'pixelated' }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(ProfilePhoto);
