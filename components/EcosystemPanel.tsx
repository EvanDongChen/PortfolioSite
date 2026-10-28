import React, { useState } from 'react';
import { OceanEvent, OceanStats, TICKS_PER_SECOND } from '../lib/pixelOcean';
import PixelMeter from './PixelMeter';

interface EcosystemPanelProps {
  stats: OceanStats | null;
}

// Algae cover rarely passes this, so it fills the meter.
const ALGAE_FULL_PERCENT = 40;
const FEED_LENGTH = 3;
const OPEN_BY_DEFAULT_MIN_WIDTH = 1600;

const EVENT_COLOR: Record<OceanEvent['kind'], string> = {
  birth: '#7bd88f',
  eaten: '#ff6b6b',
  stung: '#e88ad8',
  starved: '#ffd166',
  oldAge: '#9af1ff',
};

const clock = (ticks: number) => {
  const seconds = Math.floor(ticks / TICKS_PER_SECOND);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

const Row: React.FC<{ label: string; value: string | number; fill: number; color: string }> = ({ label, value, fill, color }) => (
  <div className="eco-row">
    <span className="eco-label">{label}</span>
    <PixelMeter value={fill} color={color} />
    <span className="eco-value">{value}</span>
  </div>
);

/** Live census of the reef, styled as a game HUD, bottom-left by the food button. */
const EcosystemPanel: React.FC<EcosystemPanelProps> = ({ stats }) => {
  // Open by default only where it has room beside the content.
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= OPEN_BY_DEFAULT_MIN_WIDTH);
  if (!stats) return null;
  const { deaths } = stats;

  return (
    <section className="eco-hud fixed bottom-8 left-24 z-40 hidden sm:block w-72" aria-label="Reef ecosystem">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className="eco-header"
        aria-expanded={isOpen}
      >
        <span className="eco-live" aria-hidden="true" />
        <span className="eco-title">Reef live</span>
        <span className="eco-clock">T+{clock(stats.tick)}</span>
        <span className="eco-toggle" aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="eco-body">
          <Row label="Minnows" value={stats.counts.minnow} fill={stats.counts.minnow / stats.caps.minnow} color="#9af1ff" />
          <Row label="Barracuda" value={stats.counts.barracuda} fill={stats.counts.barracuda / stats.caps.barracuda} color="#ff6b6b" />
          <Row label="Plankton" value={stats.plankton} fill={stats.plankton / stats.planktonCap} color="#7bd88f" />
          <Row label="Algae" value={`${stats.algae}%`} fill={stats.algae / ALGAE_FULL_PERCENT} color="#3aa86a" />
          <ul className="eco-feed" aria-label="Recent events">
            {stats.events.slice(0, FEED_LENGTH).map(event => (
              <li key={`${event.tick}-${event.text}`}>
                <span className="eco-feed-dot" style={{ background: EVENT_COLOR[event.kind] }} aria-hidden="true" />
                <span className="eco-feed-time">{clock(event.tick)}</span>
                {event.text}
              </li>
            ))}
            {stats.events.length === 0 && <li className="eco-feed-empty">Watching the reef…</li>}
          </ul>
          <div className="eco-totals">
            <span>{stats.births} born</span>
            <span>{deaths.eaten} eaten</span>
            <span>{deaths.starved} starved</span>
            <span>{deaths.oldAge} old age</span>
          </div>
          <p className="eco-hint">Hover or click a fish to inspect it.</p>
        </div>
      )}
    </section>
  );
};

export default React.memo(EcosystemPanel);
