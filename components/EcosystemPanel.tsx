import React, { useState } from 'react';
import CensusSlots from './CensusSlots';
import { OceanStats, SPECIES_LIST, Species } from '../lib/pixelOcean';
import { creatureSprite } from '../lib/pixelOceanArt';
import PixelMeter from './PixelMeter';

interface EcosystemPanelProps {
  stats: OceanStats | null;
}

// Algae cover rarely passes this, so it fills the meter.
const ALGAE_FULL_PERCENT = 40;
const FEED_LENGTH = 2;

const PLURAL: Record<Species, string> = {
  minnow: 'Minnows',
  puffer: 'Puffers',
  seahorse: 'Seahorses',
  clownfish: 'Clownfish',
  barracuda: 'Barracuda',
  eel: 'Morays',
  angler: 'Anglers',
  shark: 'Sharks',
  crab: 'Crabs',
  urchin: 'Urchins',
  starfish: 'Starfish',
  octopus: 'Octopuses',
  cuttlefish: 'Cuttlefish',
  jelly: 'Jellies',
  turtle: 'Turtles',
  manta: 'Mantas',
  dolphin: 'Dolphins',
  shrimp: 'Shrimp',
  mantis: 'Mantises',
  gardenEel: 'Garden eels',
  lionfish: 'Lionfish',
  hermit: 'Hermits',
};

// Each species' own sprite as a tiny icon, drawn once.
let icons: Record<Species, string> | null = null;
const speciesIcons = () => {
  icons ??= Object.fromEntries(
    SPECIES_LIST.map(s => [s, creatureSprite(s, 0, 0).toDataURL()]),
  ) as Record<Species, string>;
  return icons;
};

const Row: React.FC<{ label: string; value: string | number; fill: number; color: string }> = ({ label, value, fill, color }) => (
  <div className="eco-row">
    <span>{label}</span>
    <PixelMeter value={fill} color={color} />
    <span className="eco-value">{value}</span>
  </div>
);

/** Live census of the reef, bottom left: a diver's writing slate. */
const EcosystemPanel: React.FC<EcosystemPanelProps> = ({ stats }) => {
  // Closed until the visitor opens it.
  const [isOpen, setIsOpen] = useState(false);
  if (!stats) return null;
  const { deaths } = stats;
  const icon = speciesIcons();

  return (
    <section className={`eco-hud census fixed bottom-8 left-8 z-40 hidden sm:block ${isOpen ? 'is-open w-80' : 'w-auto'}`} aria-label="Reef census">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className="eco-header"
        aria-expanded={isOpen}
      >
        
        <span className="eco-title">Reef census</span>
        <span className="eco-toggle" aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="eco-body">
          <CensusSlots label="Creatures" items={SPECIES_LIST.map(s => ({ key: s, name: PLURAL[s], count: stats.counts[s], icon: icon[s] }))} />
          <Row label="Plankton" value={stats.plankton} fill={stats.plankton / stats.planktonCap} color="#7fd18b" />
          <Row label="Algae" value={`${stats.algae}%`} fill={stats.algae / ALGAE_FULL_PERCENT} color="#3a8a5a" />
          <ul className="eco-feed" aria-label="Recent events">
            {stats.events.slice(0, FEED_LENGTH).map(event => (
              <li key={`${event.tick}-${event.text}`} className={event.starred ? 'is-starred' : undefined}>
                {event.starred && <span className="adopt-star" aria-label="Your creature">★ </span>}
                {event.text}
              </li>
            ))}
            {stats.events.length === 0 && <li className="eco-feed-empty">Watching the reef…</li>}
          </ul>
          <p className="census-tally">So far: {stats.births} born, {deaths.eaten} eaten, {deaths.stung} stung, {deaths.starved} starved, {deaths.oldAge} of old age.</p>
          <p className="eco-hint">Click any creature to follow it, or adopt it as yours.</p>
        </div>
      )}
    </section>
  );
};

export default React.memo(EcosystemPanel);
