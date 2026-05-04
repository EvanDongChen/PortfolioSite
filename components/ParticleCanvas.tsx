import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

type ThemeMode = 'underwater' | 'deepsea' | 'other';

interface FishSnapshot {
  x: number;
  y: number;
}

export interface ParticleCanvasRef {
  emitTrailBubble: (x: number, worldY: number, isDeepSea?: boolean) => void;
  emitAmbientBubble: (isDeepSea?: boolean) => void;
  emitFoodCrumbs: (x: number, worldY: number, isLove?: boolean) => void;
  emitHearts: (x: number, worldY: number) => void;
  emitJellyfishPop: (x: number, worldY: number, scale: number) => void;
  emitClickRipple: (x: number, screenY: number, theme: string) => void;
  emitTransitionBurst: (direction: 'dive' | 'surface') => void;
  setScrollY: (y: number) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFishSnapshot: (fishes: FishSnapshot[]) => void;
}

interface Trail {
  x: number;
  worldY: number;
  size: number;
  driftX: number;
  duration: number;
  elapsed: number;
  isDeepSea?: boolean;
}

interface AmbientBubble {
  x: number;
  worldY: number;
  size: number;
  driftX: number;
  duration: number;
  elapsed: number;
  isDeepSea?: boolean;
}

interface Crumb {
  x: number;
  worldY: number;
  size: number;
  driftX: number;
  driftY: number;
  duration: number;
  elapsed: number;
  isLove?: boolean;
}

interface JellyPop {
  x: number;
  worldY: number;
  size: number;
  driftX: number;
  driftY: number;
  duration: number;
  elapsed: number;
}

interface JellyRing {
  x: number;
  worldY: number;
  size: number;
  duration: number;
  elapsed: number;
}

interface ClickRipple {
  x: number;
  screenY: number;
  theme: string;
  duration: number;
  elapsed: number;
  delay: number;
}

interface Heart {
  x: number;
  worldY: number;
  size: number;
  driftX: number;
  driftY: number;
  rotation: number;
  rotationSpeed: number;
  duration: number;
  elapsed: number;
}

interface TransitionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  duration: number;
  elapsed: number;
  opacity: number;
}

interface PlanktonParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  twinkle: number;
  phase: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const ParticleCanvas = forwardRef<ParticleCanvasRef>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollYRef = useRef(0);
  const fishSnapshotRef = useRef<FishSnapshot[]>([]);
  const themeModeRef = useRef<ThemeMode>('underwater');

  // Active arrays
  const trailsRef = useRef<Trail[]>([]);
  const ambientBubblesRef = useRef<AmbientBubble[]>([]);
  const crumbsRef = useRef<Crumb[]>([]);
  const jellyPopsRef = useRef<JellyPop[]>([]);
  const jellyRingsRef = useRef<JellyRing[]>([]);
  const ripplesRef = useRef<ClickRipple[]>([]);
  const heartsRef = useRef<Heart[]>([]);
  const transitionParticlesRef = useRef<TransitionParticle[]>([]);
  const planktonRef = useRef<PlanktonParticle[]>([]);

  // Pools for short-lived particles
  const trailPoolRef = useRef<Trail[]>([]);
  const ambientBubblePoolRef = useRef<AmbientBubble[]>([]);
  const crumbPoolRef = useRef<Crumb[]>([]);
  const jellyPopPoolRef = useRef<JellyPop[]>([]);
  const jellyRingPoolRef = useRef<JellyRing[]>([]);
  const ripplePoolRef = useRef<ClickRipple[]>([]);
  const heartPoolRef = useRef<Heart[]>([]);
  const transitionParticlePoolRef = useRef<TransitionParticle[]>([]);

  useImperativeHandle(ref, () => ({
    setScrollY: (y) => {
      scrollYRef.current = y;
    },
    setThemeMode: (mode) => {
      themeModeRef.current = mode;
      if (mode !== 'deepsea') {
        planktonRef.current.length = 0;
      }
    },
    setFishSnapshot: (fishes) => {
      fishSnapshotRef.current = fishes;
    },
    emitTrailBubble: (x, worldY, isDeepSea) => {
      const p = trailPoolRef.current.pop() ?? ({} as Trail);
      p.x = x;
      p.worldY = worldY;
      p.size = 3 + Math.random() * 4;
      p.driftX = (Math.random() - 0.5) * 20;
      p.duration = 650 + Math.random() * 450;
      p.elapsed = 0;
      p.isDeepSea = isDeepSea;
      trailsRef.current.push(p);
    },
    emitAmbientBubble: (isDeepSea) => {
      const p = ambientBubblePoolRef.current.pop() ?? ({} as AmbientBubble);
      p.x = Math.random() * window.innerWidth;
      p.worldY = scrollYRef.current + window.innerHeight + 40;
      p.size = isDeepSea ? (Math.random() * 26 + 12) : (Math.random() * 60 + 20);
      p.driftX = (Math.random() - 0.5) * (isDeepSea ? 24 : 44);
      p.duration = isDeepSea ? (12000 + Math.random() * 12000) : (10000 + Math.random() * 15000);
      p.elapsed = 0;
      p.isDeepSea = isDeepSea;
      ambientBubblesRef.current.push(p);
    },
    emitFoodCrumbs: (x, worldY, isLove) => {
      const count = isLove ? 3 : 6;
      for (let i = 0; i < count; i++) {
        const p = crumbPoolRef.current.pop() ?? ({} as Crumb);
        p.x = x + (Math.random() - 0.5) * 12;
        p.worldY = worldY + (Math.random() - 0.5) * 8;
        p.size = 2 + Math.random() * 2.5;
        p.driftX = (Math.random() - 0.5) * 26;
        p.driftY = -10 - Math.random() * 20;
        p.duration = 280 + Math.random() * 220;
        p.elapsed = 0;
        p.isLove = isLove;
        crumbsRef.current.push(p);
      }
    },
    emitHearts: (x, worldY) => {
      for (let i = 0; i < 2; i++) {
        const p = heartPoolRef.current.pop() ?? ({} as Heart);
        p.x = x;
        p.worldY = worldY;
        p.size = 16 + Math.random() * 12;
        p.driftX = (Math.random() - 0.5) * 120;
        p.driftY = -70 - Math.random() * 80;
        p.rotation = Math.random() * Math.PI * 2;
        p.rotationSpeed = (Math.random() - 0.5) * 0.1;
        p.duration = 2500 + Math.random() * 1000;
        p.elapsed = 0;
        heartsRef.current.push(p);
      }
    },
    emitJellyfishPop: (x, worldY, scale) => {
      const ring = jellyRingPoolRef.current.pop() ?? ({} as JellyRing);
      ring.x = x;
      ring.worldY = worldY;
      ring.size = 26 + scale * 26;
      ring.duration = 420;
      ring.elapsed = 0;
      jellyRingsRef.current.push(ring);

      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 12 + Math.random() * 22;
        const pop = jellyPopPoolRef.current.pop() ?? ({} as JellyPop);
        pop.x = x;
        pop.worldY = worldY;
        pop.size = 4 + Math.random() * 4;
        pop.driftX = Math.cos(angle) * speed;
        pop.driftY = Math.sin(angle) * speed - 12;
        pop.duration = 360 + Math.random() * 260;
        pop.elapsed = 0;
        jellyPopsRef.current.push(pop);
      }
    },
    emitClickRipple: (x, screenY, theme) => {
      const delays = [0, 150, 300];
      for (let i = 0; i < delays.length; i++) {
        const p = ripplePoolRef.current.pop() ?? ({} as ClickRipple);
        p.x = x;
        p.screenY = screenY;
        p.theme = theme;
        p.delay = delays[i];
        p.duration = 800;
        p.elapsed = 0;
        ripplesRef.current.push(p);
      }
    },
    emitTransitionBurst: (direction) => {
      const palette = direction === 'dive'
        ? ['#7dd3fc', '#67e8f9', '#22d3ee', '#38bdf8']
        : ['#34d399', '#6ee7b7', '#2dd4bf', '#a7f3d0'];

      for (let i = 0; i < 64; i++) {
        const p = transitionParticlePoolRef.current.pop() ?? ({} as TransitionParticle);
        p.x = Math.random() * window.innerWidth;
        p.y = direction === 'dive' ? -24 - Math.random() * 40 : window.innerHeight + 24 + Math.random() * 40;
        p.vx = (Math.random() - 0.5) * 1.5;
        p.vy = direction === 'dive'
          ? (1.8 + Math.random() * 3.2)
          : -(1.8 + Math.random() * 3.2);
        p.size = 3 + Math.random() * 5;
        p.color = palette[Math.floor(Math.random() * palette.length)];
        p.duration = 780 + Math.random() * 420;
        p.elapsed = 0;
        p.opacity = 0.55 + Math.random() * 0.4;
        transitionParticlesRef.current.push(p);
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let lastTime = performance.now();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (themeModeRef.current === 'deepsea' && planktonRef.current.length > 0) {
        for (let i = 0; i < planktonRef.current.length; i++) {
          planktonRef.current[i].x = Math.random() * canvas.width;
          planktonRef.current[i].y = Math.random() * canvas.height;
        }
      }
    };

    window.addEventListener('resize', resize);
    resize();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeOutQuad = (t: number) => t * (2 - t);

    const ensurePlankton = () => {
      if (themeModeRef.current !== 'deepsea') return;
      if (planktonRef.current.length > 0) return;
      const count = Math.max(36, Math.min(78, Math.floor(canvas.width / 18)));
      for (let i = 0; i < count; i++) {
        planktonRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2.8 + 1.2,
          hue: 155 + Math.random() * 55,
          twinkle: 0.012 + Math.random() * 0.02,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const animate = (time: number) => {
      const dtRaw = time - lastTime;
      lastTime = time;
      const dt = Math.min(50, Math.max(0, dtRaw));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sy = scrollYRef.current;

      ensurePlankton();

      // Canvas deep-sea plankton with fish-reactive displacement.
      if (themeModeRef.current === 'deepsea' && planktonRef.current.length > 0) {
        const fishSnapshot = fishSnapshotRef.current;
        for (let i = 0; i < planktonRef.current.length; i++) {
          const p = planktonRef.current[i];
          let vx = p.vx + Math.sin(time / 1300 + p.phase) * 0.01;
          let vy = p.vy + Math.cos(time / 1500 + p.phase) * 0.01;

          for (let f = 0; f < fishSnapshot.length; f += 2) {
            const fish = fishSnapshot[f];
            const fishX = fish.x;
            const fishY = fish.y - sy;
            const dx = p.x - fishX;
            const dy = p.y - fishY;
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

          p.x += vx;
          p.y += vy;
          p.vx = vx;
          p.vy = vy;
          p.phase += p.twinkle;

          const pad = 30;
          if (p.x < -pad) p.x = canvas.width + pad;
          else if (p.x > canvas.width + pad) p.x = -pad;
          if (p.y < -pad) p.y = canvas.height + pad;
          else if (p.y > canvas.height + pad) p.y = -pad;

          const alpha = 0.35 + (Math.sin(p.phase * 2.6) + 1) * 0.2;
          const color = `hsla(${p.hue}, 98%, 72%, ${alpha})`;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = p.size * 6;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Ambient bubbles
      {
        const arr = ambientBubblesRef.current;
        let write = 0;
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          p.elapsed += dt;
          if (p.elapsed >= p.duration) {
            ambientBubblePoolRef.current.push(p);
            continue;
          }

          const t = p.elapsed / p.duration;
          const easeT = easeOutQuad(t);
          const drawX = p.x + p.driftX * easeT;
          const drawY = p.worldY - sy - (p.isDeepSea ? 58 : 84) * easeT;
          const scale = 1 - easeT * (p.isDeepSea ? 0.5 : 0.42);
          const opacityBase = p.isDeepSea ? 0.34 : 0.56;
          const opacity = Math.max(0, opacityBase * (1 - easeT));
          const r = (p.size * scale) / 2;

          if (r > 0 && opacity > 0 && drawY > -80 && drawY < canvas.height + 80) {
            ctx.save();
            ctx.translate(drawX, drawY);
            if (p.isDeepSea) {
              ctx.shadowColor = `rgba(42,48,56,${opacity * 0.7})`;
              ctx.shadowBlur = 4;
            } else {
              ctx.shadowColor = `rgba(125,211,252,${opacity * 0.95})`;
              ctx.shadowBlur = 8;
            }

            const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 0, 0, 0, r);
            if (p.isDeepSea) {
              grad.addColorStop(0, `rgba(130,138,150,${opacity * 0.45})`);
              grad.addColorStop(1, `rgba(40,46,54,${opacity * 0.88})`);
            } else {
              grad.addColorStop(0, `rgba(255,255,255,${opacity * 0.95})`);
              grad.addColorStop(1, `rgba(125,211,252,${opacity * 0.88})`);
            }
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          arr[write] = p;
          write += 1;
        }
        arr.length = write;
      }

      // Trail bubbles
      {
        const arr = trailsRef.current;
        let write = 0;
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          p.elapsed += dt;
          if (p.elapsed >= p.duration) {
            trailPoolRef.current.push(p);
            continue;
          }

          const t = p.elapsed / p.duration;
          const easeT = easeOutQuad(t);
          const drawX = p.x + p.driftX * easeT;
          const drawY = p.worldY - sy - 42 * easeT;
          const scale = 1 - easeT * 0.55;
          const opacity = Math.max(0, 0.95 * (1 - easeT));
          const r = (p.size * scale) / 2;

          if (r > 0 && opacity > 0 && drawY > -20 && drawY < canvas.height + 20) {
            ctx.save();
            ctx.translate(drawX, drawY);
            const glowColor = p.isDeepSea
              ? `rgba(58,64,72,${opacity * 0.55})`
              : `rgba(125,211,252,${opacity * 0.95})`;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = p.isDeepSea ? 4 : 7;

            const grad = ctx.createRadialGradient(-r * 0.4, -r * 0.4, 0, 0, 0, r);
            grad.addColorStop(0, p.isDeepSea ? `rgba(112,120,132,${opacity * 0.48})` : `rgba(255,255,255,${opacity * 0.98})`);
            grad.addColorStop(1, p.isDeepSea ? `rgba(42,48,56,${opacity * 0.7})` : `rgba(125,211,252,${opacity * 0.88})`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          arr[write] = p;
          write += 1;
        }
        arr.length = write;
      }

      // Food crumbs
      {
        const arr = crumbsRef.current;
        let write = 0;
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          p.elapsed += dt;
          if (p.elapsed >= p.duration) {
            crumbPoolRef.current.push(p);
            continue;
          }

          const t = p.elapsed / p.duration;
          const easeT = easeOutQuad(t);
          const drawX = p.x + p.driftX * easeT;
          const drawY = p.worldY - sy + p.driftY * easeT;
          const scale = 1 - easeT * 0.65;
          const opacity = Math.max(0, 1 - easeT);
          const r = (p.size * scale) / 2;

          if (r > 0 && opacity > 0 && drawY > -20 && drawY < canvas.height + 20) {
            ctx.save();
            ctx.translate(drawX, drawY);

            const color = p.isLove ? 'rgba(244,63,94,' : 'rgba(251,191,36,';
            ctx.shadowColor = `${color}${opacity * 0.95})`;
            ctx.shadowBlur = 6;

            const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
            grad.addColorStop(0, p.isLove ? `rgba(255,190,200,${opacity * 0.98})` : `rgba(255,243,182,${opacity * 0.98})`);
            grad.addColorStop(1, `${color}${opacity * 0.9})`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          arr[write] = p;
          write += 1;
        }
        arr.length = write;
      }

      // Hearts
      {
        const arr = heartsRef.current;
        let write = 0;
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          p.elapsed += dt;
          if (p.elapsed >= p.duration) {
            heartPoolRef.current.push(p);
            continue;
          }

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

          arr[write] = p;
          write += 1;
        }
        arr.length = write;
      }

      // Jelly rings
      {
        const arr = jellyRingsRef.current;
        let write = 0;
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          p.elapsed += dt;
          if (p.elapsed >= p.duration) {
            jellyRingPoolRef.current.push(p);
            continue;
          }

          const t = p.elapsed / p.duration;
          const easeT = easeOutQuad(t);
          const drawY = p.worldY - sy;
          const scale = 0.45 + easeT * 1.35;
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

          arr[write] = p;
          write += 1;
        }
        arr.length = write;
      }

      // Jelly pops
      {
        const arr = jellyPopsRef.current;
        let write = 0;
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          p.elapsed += dt;
          if (p.elapsed >= p.duration) {
            jellyPopPoolRef.current.push(p);
            continue;
          }

          const t = p.elapsed / p.duration;
          const easeT = easeOutCubic(t);
          const drawX = p.x + p.driftX * easeT;
          const drawY = p.worldY - sy + p.driftY * easeT;
          const scale = 1 - easeT * 0.75;
          const opacity = Math.max(0, 0.95 * (1 - easeT));
          const r = (p.size * scale) / 2;

          if (r > 0 && opacity > 0 && drawY > -20 && drawY < canvas.height + 20) {
            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.shadowColor = `rgba(236,72,153,${opacity * 0.9})`;
            ctx.shadowBlur = 10;

            const grad = ctx.createRadialGradient(-r * 0.4, -r * 0.4, 0, 0, 0, r);
            grad.addColorStop(0, `rgba(255,255,255,${opacity * 0.95})`);
            grad.addColorStop(1, `rgba(244,114,182,${opacity * 0.92})`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          arr[write] = p;
          write += 1;
        }
        arr.length = write;
      }

      // Transition particles
      {
        const arr = transitionParticlesRef.current;
        let write = 0;
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          p.elapsed += dt;
          if (p.elapsed >= p.duration) {
            transitionParticlePoolRef.current.push(p);
            continue;
          }

          const t = p.elapsed / p.duration;
          const fade = 1 - easeOutQuad(t);
          p.x += p.vx * (dt / 16.666);
          p.y += p.vy * (dt / 16.666);
          p.vx *= 0.992;
          p.vy *= 0.992;

          if (p.x < -40 || p.x > canvas.width + 40 || p.y < -40 || p.y > canvas.height + 40) {
            transitionParticlePoolRef.current.push(p);
            continue;
          }

          const alpha = p.opacity * fade;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = clamp(alpha, 0, 1);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          arr[write] = p;
          write += 1;
        }
        arr.length = write;
      }

      // Click ripples
      {
        const arr = ripplesRef.current;
        let write = 0;
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          if (p.delay > 0) {
            p.delay -= dt;
            arr[write] = p;
            write += 1;
            continue;
          }

          p.elapsed += dt;
          if (p.elapsed >= p.duration) {
            ripplePoolRef.current.push(p);
            continue;
          }

          const t = p.elapsed / p.duration;
          const easeT = easeOutCubic(t);
          const isUnderwater = p.theme === 'underwater';
          const baseSize = isUnderwater ? 180 : 120;
          const scale = 0.1 + easeT * 0.9;
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

            if (isUnderwater) {
              ctx.shadowBlur = 5;
              ctx.stroke();
            }
            ctx.restore();
          }

          arr[write] = p;
          write += 1;
        }
        arr.length = write;
      }

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
