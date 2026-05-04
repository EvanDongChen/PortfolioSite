import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface ParticleCanvasRef {
  emitTrailBubble: (x: number, worldY: number, isDeepSea?: boolean) => void;
  emitFoodCrumbs: (x: number, worldY: number, isLove?: boolean) => void;
  emitHearts: (x: number, worldY: number) => void;
  emitJellyfishPop: (x: number, worldY: number, scale: number) => void;
  emitClickRipple: (x: number, screenY: number, theme: string) => void;
  setScrollY: (y: number) => void;
}

interface Trail {
  x: number; worldY: number; size: number; driftX: number;
  duration: number; elapsed: number; isDeepSea?: boolean;
}
interface Crumb {
  x: number; worldY: number; size: number; driftX: number; driftY: number;
  duration: number; elapsed: number;
}
interface JellyPop {
  x: number; worldY: number; size: number; driftX: number; driftY: number;
  duration: number; elapsed: number;
}
interface JellyRing {
  x: number; worldY: number; size: number;
  duration: number; elapsed: number;
}
interface ClickRipple {
  x: number; screenY: number; theme: string;
  duration: number; elapsed: number; delay: number;
}
interface Heart {
  x: number; worldY: number; size: number; driftX: number; driftY: number;
  rotation: number; rotationSpeed: number;
  duration: number; elapsed: number;
}

const ParticleCanvas = forwardRef<ParticleCanvasRef>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollYRef = useRef(0);
  
  // Particle Arrays
  const trailsRef = useRef<Trail[]>([]);
  const crumbsRef = useRef<Crumb[]>([]);
  const jellyPopsRef = useRef<JellyPop[]>([]);
  const jellyRingsRef = useRef<JellyRing[]>([]);
  const ripplesRef = useRef<ClickRipple[]>([]);
  const heartsRef = useRef<Heart[]>([]);

  useImperativeHandle(ref, () => ({
    setScrollY: (y: number) => {
      scrollYRef.current = y;
    },
    emitTrailBubble: (x, worldY, isDeepSea) => {
      trailsRef.current.push({
        x, worldY, size: 3 + Math.random() * 4,
        driftX: (Math.random() - 0.5) * 20,
        duration: 650 + Math.random() * 450,
        elapsed: 0,
        isDeepSea
      });
    },
    emitFoodCrumbs: (x, worldY, isLove) => {
      const count = isLove ? 3 : 6;
      for (let i = 0; i < count; i++) {
        crumbsRef.current.push({
          x: x + (Math.random() - 0.5) * 12,
          worldY: worldY + (Math.random() - 0.5) * 8,
          size: 2 + Math.random() * 2.5,
          driftX: (Math.random() - 0.5) * 26,
          driftY: -10 - Math.random() * 20,
          duration: 280 + Math.random() * 220,
          elapsed: 0,
          isLove
        } as any);
      }
    },
    emitHearts: (x, worldY) => {
      for (let i = 0; i < 2; i++) {
        heartsRef.current.push({
          x, worldY,
          size: 16 + Math.random() * 12,
          driftX: (Math.random() - 0.5) * 120,
          driftY: -70 - Math.random() * 80,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
          duration: 2500 + Math.random() * 1000,
          elapsed: 0
        });
      }
    },
    emitJellyfishPop: (x, worldY, scale) => {
      jellyRingsRef.current.push({
        x, worldY, size: 26 + scale * 26,
        duration: 420, elapsed: 0
      });
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 12 + Math.random() * 22;
        jellyPopsRef.current.push({
          x, worldY, size: 4 + Math.random() * 4,
          driftX: Math.cos(angle) * speed,
          driftY: Math.sin(angle) * speed - 12,
          duration: 360 + Math.random() * 260,
          elapsed: 0
        });
      }
    },
    emitClickRipple: (x, screenY, theme) => {
      [0, 150, 300].forEach(delay => {
        ripplesRef.current.push({
          x, screenY, theme, delay,
          duration: 800, elapsed: 0
        });
      });
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Ease-out cubic function equivalent to CSS cubic-bezier(0.2, 0.7, 0.2, 1) roughly
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeOutQuad = (t: number) => t * (2 - t);

    const animate = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sy = scrollYRef.current; // Parallax is 1.0

      // Draw Trails
      trailsRef.current = trailsRef.current.filter(p => {
        p.elapsed += dt;
        if (p.elapsed >= p.duration) return false;
        
        const t = p.elapsed / p.duration;
        const easeT = easeOutQuad(t);
        const drawX = p.x + p.driftX * easeT;
        const drawY = p.worldY - sy - 42 * easeT;
        const scale = 1 - easeT * 0.55; // 1 to 0.45
        const opacity = Math.max(0, 0.95 * (1 - easeT));
        
        const r = (p.size * scale) / 2;
        if (r > 0 && opacity > 0 && drawY > -20 && drawY < canvas.height + 20) {
          ctx.save();
          ctx.translate(drawX, drawY);
          
          // Glow color shifts darker in deep sea.
          const glowColor = p.isDeepSea
            ? `rgba(58,64,72,${opacity * 0.55})`
            : `rgba(125,211,252,${opacity * 0.95})`;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = p.isDeepSea ? 4 : 7;
          
          const grad = ctx.createRadialGradient(-r*0.4, -r*0.4, 0, 0, 0, r);
          grad.addColorStop(0, p.isDeepSea ? `rgba(112,120,132,${opacity * 0.48})` : `rgba(255,255,255,${opacity * 0.98})`);
          grad.addColorStop(1, p.isDeepSea ? `rgba(42,48,56,${opacity * 0.7})` : `rgba(125,211,252,${opacity * 0.88})`);
          
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        return true;
      });

      // Draw Crumbs
      crumbsRef.current = crumbsRef.current.filter(p => {
        p.elapsed += dt;
        if (p.elapsed >= p.duration) return false;
        
        const t = p.elapsed / p.duration;
        const easeT = easeOutQuad(t);
        const drawX = p.x + p.driftX * easeT;
        const drawY = p.worldY - sy + p.driftY * easeT;
        const scale = 1 - easeT * 0.65; // 1 to 0.35
        const opacity = Math.max(0, 1 - easeT);
        
        const r = (p.size * scale) / 2;
        if (r > 0 && opacity > 0 && drawY > -20 && drawY < canvas.height + 20) {
          ctx.save();
          ctx.translate(drawX, drawY);
          
          const color = (p as any).isLove ? 'rgba(244,63,94,' : 'rgba(251,191,36,';
          ctx.shadowColor = `${color}${opacity * 0.95})`;
          ctx.shadowBlur = 6;
          
          const grad = ctx.createRadialGradient(-r*0.3, -r*0.3, 0, 0, 0, r);
          grad.addColorStop(0, (p as any).isLove ? `rgba(255,190,200,${opacity * 0.98})` : `rgba(255,243,182,${opacity * 0.98})`);
          grad.addColorStop(1, `${color}${opacity * 0.9})`);
          
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        return true;
      });

      // Draw Hearts
      heartsRef.current = heartsRef.current.filter(p => {
        p.elapsed += dt;
        if (p.elapsed >= p.duration) return false;

        const t = p.elapsed / p.duration;
        const easeT = easeOutQuad(t);
        const drawX = p.x + p.driftX * easeT;
        const drawY = p.worldY - sy + p.driftY * easeT;
        const opacity = Math.max(0, 1 - t);
        const scale = p.size * (1 - t * 0.3);

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(p.rotation + p.elapsed * p.rotationSpeed * 0.01);
        ctx.scale(scale / 20, scale / 20);
        ctx.fillStyle = `rgba(244,63,94,${opacity})`;
        ctx.shadowColor = `rgba(244,63,94,${opacity * 0.5})`;
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.bezierCurveTo(-5, -5, -15, 0, -15, 10);
        ctx.bezierCurveTo(-15, 20, 0, 30, 0, 30);
        ctx.bezierCurveTo(0, 30, 15, 20, 15, 10);
        ctx.bezierCurveTo(15, 0, 5, -5, 0, 5);
        ctx.fill();
        ctx.restore();
        return true;
      });

      // Draw Jelly Rings
      jellyRingsRef.current = jellyRingsRef.current.filter(p => {
        p.elapsed += dt;
        if (p.elapsed >= p.duration) return false;
        
        const t = p.elapsed / p.duration;
        const easeT = easeOutQuad(t);
        const drawY = p.worldY - sy;
        const scale = 0.45 + easeT * 1.35; // 0.45 to 1.8
        const opacity = Math.max(0, 0.9 * (1 - easeT));
        
        const r = (p.size * scale) / 2;
        if (r > 0 && opacity > 0 && drawY > -r && drawY < canvas.height + r) {
          ctx.save();
          ctx.translate(p.x, drawY);
          
          ctx.shadowColor = `rgba(244,114,182,${opacity * 0.8})`;
          ctx.shadowBlur = 14;
          
          ctx.strokeStyle = `rgba(251,113,133,${opacity * 0.85})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        return true;
      });

      // Draw Jelly Pops
      jellyPopsRef.current = jellyPopsRef.current.filter(p => {
        p.elapsed += dt;
        if (p.elapsed >= p.duration) return false;
        
        const t = p.elapsed / p.duration;
        const easeT = easeOutCubic(t); // using cubic for pops
        const drawX = p.x + p.driftX * easeT;
        const drawY = p.worldY - sy + p.driftY * easeT;
        const scale = 1 - easeT * 0.75; // 1 to 0.25
        const opacity = Math.max(0, 0.95 * (1 - easeT));
        
        const r = (p.size * scale) / 2;
        if (r > 0 && opacity > 0 && drawY > -20 && drawY < canvas.height + 20) {
          ctx.save();
          ctx.translate(drawX, drawY);
          
          ctx.shadowColor = `rgba(236,72,153,${opacity * 0.9})`;
          ctx.shadowBlur = 10;
          
          const grad = ctx.createRadialGradient(-r*0.4, -r*0.4, 0, 0, 0, r);
          grad.addColorStop(0, `rgba(255,255,255,${opacity * 0.95})`);
          grad.addColorStop(1, `rgba(244,114,182,${opacity * 0.92})`);
          
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        return true;
      });

      // Draw Click Ripples
      ripplesRef.current = ripplesRef.current.filter(p => {
        if (p.delay > 0) {
          p.delay -= dt;
          return true; // wait for delay
        }
        p.elapsed += dt;
        if (p.elapsed >= p.duration) return false;
        
        const t = p.elapsed / p.duration;
        // cubic-bezier(0.1, 0.8, 0.3, 1) is a strong ease-out
        const easeT = easeOutCubic(t); 
        
        const isUnderwater = p.theme === 'underwater';
        const baseSize = isUnderwater ? 180 : 120;
        const scale = 0.1 + easeT * 0.9; // 0.1 to 1.0
        const opacity = Math.max(0, 0.6 * (1 - easeT));
        
        const r = (baseSize * scale) / 2;
        if (r > 0 && opacity > 0) {
          ctx.save();
          ctx.translate(p.x, p.screenY);
          
          ctx.lineWidth = isUnderwater ? 2 : 1.5;
          ctx.strokeStyle = isUnderwater 
            ? `rgba(130,240,255,${opacity})` 
            : `rgba(167,139,250,${opacity * 0.8})`;
            
          ctx.shadowColor = isUnderwater 
            ? `rgba(130,240,255,${opacity * 0.3})`
            : `rgba(167,139,250,${opacity * 0.6})`;
          ctx.shadowBlur = isUnderwater ? 10 : 15;
          
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner shadow emulation via second stroke with different blur
          if (isUnderwater) {
            ctx.shadowBlur = 5;
            ctx.stroke();
          }
          
          ctx.restore();
        }
        return true;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[5]"
    />
  );
});

export default React.memo(ParticleCanvas);
