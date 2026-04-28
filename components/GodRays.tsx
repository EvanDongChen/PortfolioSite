import React, { useMemo } from 'react';

const GodRays: React.FC = () => {
  const rays = useMemo(() => {
    // Generate an array of rays with randomized properties
    return Array.from({ length: 12 }).map((_, i) => {
      const width = 80 + Math.random() * 250; // 80px to 330px wide
      const left = -10 + Math.random() * 120; // -10% to 110% of screen width
      // Opacity needs to be subtle. We use white and soft light/overlay
      const opacity = 0.08 + Math.random() * 0.12; 
      const duration = 12 + Math.random() * 15; // 12s to 27s slow sway
      const delay = -(Math.random() * 30); // Random starting phase
      const rotation = 12 + Math.random() * 16; // 12deg to 28deg slant

      return { id: i, width, left, opacity, duration, delay, rotation };
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-overlay" style={{ zIndex: 0 }}>
      <style>{`
        @keyframes godRaySway {
          0%, 100% {
            transform: rotate(var(--ray-rot)) skewX(calc(var(--ray-rot) * -0.2)) translateX(0px);
          }
          50% {
            transform: rotate(var(--ray-rot)) skewX(calc(var(--ray-rot) * -0.2)) translateX(60px);
          }
        }
      `}</style>
      {rays.map((ray) => (
        <div
          key={ray.id}
          style={{
            position: 'absolute',
            top: '-20%',
            left: `${ray.left}%`,
            width: `${ray.width}px`,
            height: '140%',
            background: 'linear-gradient(to bottom, rgba(200, 245, 255, 0.8) 0%, rgba(200, 245, 255, 0) 100%)',
            opacity: ray.opacity,
            transformOrigin: 'top center',
            ['--ray-rot' as any]: `${ray.rotation}deg`,
            animation: `godRaySway ${ray.duration}s ease-in-out ${ray.delay}s infinite`,
            filter: 'blur(15px)', // Soften the edges immensely
          }}
        />
      ))}
    </div>
  );
};

export default GodRays;
