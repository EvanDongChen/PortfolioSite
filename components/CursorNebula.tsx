import React, { useState, useEffect, useRef, useCallback } from 'react';

// Define the structure of a particle
interface Particle {
  id: number;
  x: number;
  y: number;
  createdAt: number;
  opacity: number;
  size: number;
  color: string;
}

const PARTICLE_LIFESPAN = 3000; // in milliseconds
const PARTICLE_SPAWN_RATE = 50; // in milliseconds
const PARTICLE_COLORS = ['#5a67d8', '#805ad5', '#d53f8c'];

const CursorNebula: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const lastSpawnTimeRef = useRef(0);
  const animationFrameId = useRef<number | null>(null);

  // Function to create a new particle
  const createParticle = (x: number, y: number) => {
    const newParticle: Particle = {
      id: Date.now() + Math.random(),
      x,
      y,
      createdAt: Date.now(),
      opacity: 1,
      size: Math.random() * 20 + 10, // Initial size
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    };
    setParticles(prev => [...prev, newParticle]);
  };

  // Mouse move handler with throttling
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const now = Date.now();
    if (now - lastSpawnTimeRef.current > PARTICLE_SPAWN_RATE) {
      createParticle(event.clientX, event.clientY);
      lastSpawnTimeRef.current = now;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      const now = Date.now();
      setParticles(currentParticles => 
        currentParticles
          .map(p => {
            const age = now - p.createdAt;
            if (age > PARTICLE_LIFESPAN) {
              return null;
            }
            const lifeRatio = age / PARTICLE_LIFESPAN;
            return {
              ...p,
              opacity: 1 - lifeRatio,
              size: p.size + lifeRatio * 10, // Grow over time (reduced from 25)
            };
          })
          .filter((p): p is Particle => p !== null)
      );
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [handleMouseMove]);

  return (
    <div className="w-full h-full fixed inset-0 pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${p.color}, transparent 60%)`,
            filter: 'blur(30px)',
            opacity: p.opacity,
            transform: `translate(${p.x - p.size / 2}px, ${p.y - p.size / 2}px)`,
            willChange: 'transform, opacity, width, height',
          }}
        />
      ))}
    </div>
  );
};

export default CursorNebula;