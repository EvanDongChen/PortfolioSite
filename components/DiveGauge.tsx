import React, { useEffect, useRef, useState } from 'react';

// The bottom of the page sits at this depth.
const MAX_DEPTH_M = 120;

interface Mark {
  id: string;
  label: string;
  /** 0 at the top of the track, 1 at the bottom. */
  at: number;
}

const formatDepth = (m: number) => String(Math.round(m)).padStart(3, '0');

/**
 * Treats scrolling as a dive: a depth readout and a track down the right
 * edge, with a mark per section. Each section heading is also labelled with
 * its own depth (read by the pixel theme through data-depth).
 */
const DiveGauge: React.FC = () => {
  const [marks, setMarks] = useState<Mark[]>([]);
  // Whole metres: the gauge only re-renders when the readout changes. The
  // diver marker moves every frame, but by transform, outside React.
  const [depth, setDepth] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = () => Array.from(document.querySelectorAll<HTMLElement>('main > section[id]'))
      .filter(section => section.id !== 'home');
    const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    const measure = () => {
      const max = maxScroll();
      setMarks(sections().map(section => {
        const at = Math.min(1, section.offsetTop / max);
        const heading = section.querySelector<HTMLElement>('.section-title');
        if (heading) heading.dataset.depth = `${Math.round(at * MAX_DEPTH_M)} m`;
        return { id: section.id, label: heading?.textContent?.trim() ?? section.id, at };
      }));
    };

    let raf = 0;
    const handleScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const progress = Math.min(1, window.scrollY / maxScroll());
        if (railRef.current) railRef.current.style.transform = `translateY(${progress * 100}%)`;
        setDepth(Math.round(progress * MAX_DEPTH_M));
      });
    };

    measure();
    handleScroll();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      for (const section of sections()) delete section.querySelector<HTMLElement>('.section-title')?.dataset.depth;
    };
  }, []);

  // The current section is the deepest one the diver has passed.
  const current = [...marks].reverse().find(mark => depth / MAX_DEPTH_M >= mark.at - 0.02)?.id;

  return (
    <nav className="dive-gauge hidden xl:flex" aria-label="Dive depth">
      <div className="dive-gauge-label">Depth</div>
      <div className="dive-gauge-readout" aria-live="off">
        {formatDepth(depth)}<small>m</small>
      </div>
      <div className="dive-gauge-label">Surface</div>
      <div className="dive-gauge-track">
        {marks.map(mark => (
          <button
            key={mark.id}
            type="button"
            className="dive-gauge-mark"
            style={{ top: `${mark.at * 100}%` }}
            aria-current={mark.id === current}
            onClick={() => document.getElementById(mark.id)?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span>{mark.label}</span>
          </button>
        ))}
        {/* A rail as tall as the track, slid down it: a transform, so no layout. */}
        <div ref={railRef} className="dive-gauge-rail" aria-hidden="true">
          <div className="dive-gauge-diver" />
        </div>
      </div>
      <div className="dive-gauge-label">Seabed</div>
    </nav>
  );
};

export default DiveGauge;
