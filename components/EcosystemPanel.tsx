import React, { useState } from 'react';
import { OceanEvent, OceanStats, SPECIES_LIST, Species, TICKS_PER_SECOND } from '../lib/pixelOcean';
import { creatureSprite } from '../lib/pixelOceanArt';
import PixelMeter from './PixelMeter';
import { Phase, TimeMode } from '../lib/reefClock';

interface EcosystemPanelProps {
  stats: OceanStats | null;
  timeMode: TimeMode;
  phase: Phase;
  onCycleTimeMode: () => void;
}

const TIME_LABEL: Record<TimeMode, string> = { auto: 'Local time', day: 'Always day', night: 'Always night' };

// Algae cover rarely passes this, so it fills the meter.
const ALGAE_FULL_PERCENT = 40;
const FEED_LENGTH = 3;
const OPEN_BY_DEFAULT_MIN_WIDTH = 1900;

const EVENT_COLOR: Record<OceanEvent['kind'], string> = {
  birth: '#7fd18b',
  eaten: '#ff7a63',
  stung: '#e88ad8',
  starved: '#f0d8a0',
  oldAge: '#8aa6b4',
};

const SPECIES_COLOR: Record<Species, string> = {
  minnow: '#8fe3dc',
  barracuda: '#ff7a63',
  crab: '#e0603c',
  jelly: '#e88ad8',
  turtle: '#a8b85a',
};

const PLURAL: Record<Species, string> = {
  minnow: 'Minnows',
  barracuda: 'Barracuda',
  crab: 'Crabs',
  jelly: 'Jellies',
  turtle: 'Turtles',
};

// Each species' own sprite as a tiny icon, drawn once.
let icons: Record<Species, string> | null = null;
const speciesIcons = () => {
  icons ??= Object.fromEntries(
    SPECIES_LIST.map(s => [s, creatureSprite(s, 0, 0).toDataURL()]),
  ) as Record<Species, string>;
  return icons;
};

const clock = (ticks: number) => {
  const seconds = Math.floor(ticks / TICKS_PER_SECOND);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

const Row: React.FC<{ icon?: string; label: string; value: string | number; fill: number; color: string }> = ({ icon, label, value, fill, color }) => (
  <div className="eco-row">
    {icon
      ? <img className="eco-icon" src={icon} alt="" />
      : <span className="eco-icon" style={{ background: color, width: 6, height: 6, justifySelf: 'center' }} />}
    <span>{label}</span>
    <PixelMeter value={fill} color={color} />
    <span className="eco-value">{value}</span>
  </div>
);

/** Live census of the reef, bottom left by the food button. */
const EcosystemPanel: React.FC<EcosystemPanelProps> = ({ stats, timeMode, phase, onCycleTimeMode }) => {
  // Open by default only where it has room beside the content.
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= OPEN_BY_DEFAULT_MIN_WIDTH);
  if (!stats) return null;
  const { deaths } = stats;
  const icon = speciesIcons();

  return (
    <section className={`eco-hud fixed bottom-8 left-24 z-40 hidden sm:block ${isOpen ? 'w-72' : 'w-auto'}`} aria-label="Reef census">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className="eco-header"
        aria-expanded={isOpen}
      >
        <span className="eco-live" aria-hidden="true" />
        <span className="eco-title">Reef census</span>
        <span className="eco-clock">{clock(stats.tick)}</span>
        <span className="eco-toggle" aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="eco-body">
          <button
            type="button"
            className="eco-time"
            onClick={onCycleTimeMode}
            title="Switch between local time, always day and always night"
          >
            <span className={`eco-time-icon is-${phase}`} aria-hidden="true" />
            <span className="eco-time-phase">{phase}</span>
            <span className="eco-time-mode">{TIME_LABEL[timeMode]}</span>
          </button>
          {SPECIES_LIST.map(s => (
            <Row
              key={s}
              icon={icon[s]}
              label={PLURAL[s]}
              value={stats.counts[s]}
              fill={stats.counts[s] / stats.caps[s]}
              color={SPECIES_COLOR[s]}
            />
          ))}
          <Row label="Plankton" value={stats.plankton} fill={stats.plankton / stats.planktonCap} color="#7fd18b" />
          <Row label="Algae" value={`${stats.algae}%`} fill={stats.algae / ALGAE_FULL_PERCENT} color="#3a8a5a" />
          <ul className="eco-feed" aria-label="Recent events">
            {stats.events.slice(0, FEED_LENGTH).map(event => (
              <li key={`${event.tick}-${event.text}`} className={event.starred ? 'is-starred' : undefined}>
                <span className="eco-feed-dot" style={{ background: EVENT_COLOR[event.kind] }} aria-hidden="true" />
                <span className="eco-feed-time">{clock(event.tick)}</span>
                {event.starred && <span className="adopt-star" aria-label="Your creature">★ </span>}
                {event.text}
              </li>
            ))}
            {stats.events.length === 0 && <li className="eco-feed-empty">Watching the reef…</li>}
          </ul>
          <div className="eco-totals">
            <span>{stats.births} born</span>
            <span>{deaths.eaten} eaten</span>
            <span>{deaths.stung} stung</span>
            <span>{deaths.starved} starved</span>
            <span>{deaths.oldAge} old age</span>
          </div>
          <p className="eco-hint">Click any creature to follow it, or adopt it as yours.</p>
        </div>
      )}
    </section>
  );
};

export default React.memo(EcosystemPanel);
