import React, { useState } from 'react';
import CensusSlots from './CensusSlots';
import { FROG_STAGES, FrogStage, PondHappening, PondSpecies, PondStats } from '../lib/pond';
import { pondIcon } from '../lib/pondArt';
import PixelMeter from './PixelMeter';

interface PondCensusProps {
  stats: PondStats | null;
}

// Algae rarely covers more of the bed than this, so it fills the meter.
const ALGAE_FULL_PERCENT = 12;
const DUCKWEED_FULL = 1600;
const FEED_LENGTH = 2;

const STAGE_LABEL: Record<FrogStage, string> = {
  spawn: 'Spawn', tadpole: 'Tadpoles', backLegs: 'Back legs', fourLegs: 'Four legs', froglet: 'Froglets', adult: 'Adults',
};
/** Everyone but the frogs (who are counted by stage), in the order the census lists them. */
const OTHERS: PondSpecies[] = [
  'mallard', 'tufted', 'moorhen', 'minnow', 'koi', 'catfish', 'pike', 'newt',
  'dragonfly', 'damselfly', 'butterfly', 'strider', 'whirligig', 'snail', 'turtle', 'beaver', 'swallow', 'kingfisher', 'heron',
];
const PLURAL: Record<string, string> = {
  mallard: 'Mallards', tufted: 'Tufted ducks', moorhen: 'Moorhens', minnow: 'Minnows', koi: 'Koi', catfish: 'Catfish', pike: 'Pike',
  newt: 'Newts', dragonfly: 'Dragonflies', damselfly: 'Damselflies', butterfly: 'Butterflies', strider: 'Water striders',
  whirligig: 'Whirligigs', swallow: 'Swallows', snail: 'Snails', turtle: 'Turtles', beaver: 'Beavers', kingfisher: 'Kingfishers', heron: 'Herons',
};
const HAPPENING_LABEL: Record<PondHappening, string> = { rain: 'Raining', hatch: 'Mayfly hatch', chorus: 'Evening chorus' };

let icons: Record<string, string> | null = null;
const iconOf = (kind: string) => {
  icons ??= Object.fromEntries([...FROG_STAGES, ...OTHERS].map(k => [k, pondIcon(k).toDataURL()]));
  return icons[kind];
};

const Row: React.FC<{ label: string; value: string | number; fill: number; color: string }> = ({ label, value, fill, color }) => (
  <div className="eco-row">
    <span>{label}</span>
    <PixelMeter value={fill} color={color} />
    <span className="eco-value">{value}</span>
  </div>
);

/** Live census of the pond, bottom left: a frog's life stage by stage, then everyone else. */
const PondCensus: React.FC<PondCensusProps> = ({ stats }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!stats) return null;
  const { deaths } = stats;

  return (
    <section className={`eco-hud census pond-census fixed bottom-8 left-8 z-40 hidden sm:block ${isOpen ? 'is-open w-80' : 'w-auto'}`} aria-label="Pond census">
      <button type="button" onClick={() => setIsOpen(open => !open)} className="eco-header" aria-expanded={isOpen}>
        
        <span className="eco-title">Pond census</span>
        <span className="eco-toggle" aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="eco-body">
          {stats.happening && (
            <Row label={HAPPENING_LABEL[stats.happening.kind]} value="" fill={1 - stats.happening.progress} color="#f2b8cc" />
          )}
          <p className="pond-census-label">A frog's life</p>
          <ol className="pond-stages" aria-label="Frogs by life stage">
            {FROG_STAGES.map(s => (
              <li key={s} className={stats.stages[s] === 0 ? 'is-absent' : undefined}>
                <img className="eco-icon" src={iconOf(s)} alt="" />
                <span className="eco-value">{stats.stages[s]}</span>
                <span className="pond-stage-name">{STAGE_LABEL[s]}</span>
              </li>
            ))}
          </ol>
          <CensusSlots label="Other creatures" items={OTHERS.map(s => ({ key: s, name: PLURAL[s], count: stats.counts[s], icon: iconOf(s) }))} />
          <Row label="Algae" value={`${stats.algae}%`} fill={stats.algae / ALGAE_FULL_PERCENT} color="#5a9a4a" />
          <Row label="Duckweed" value={stats.duckweed} fill={stats.duckweed / DUCKWEED_FULL} color="#a8e08a" />
          <ul className="eco-feed" aria-label="Recent events">
            {stats.events.slice(0, FEED_LENGTH).map(event => (
              <li key={`${event.tick}-${event.text}`} className={event.starred ? 'is-starred' : undefined}>
                {event.starred && <span className="adopt-star" aria-label="Your creature">★ </span>}
                {event.text}
              </li>
            ))}
            {stats.events.length === 0 && <li className="eco-feed-empty">Watching the pond…</li>}
          </ul>
          <p className="census-tally">So far: {stats.births} born, {deaths.eaten} eaten, {deaths.starved} starved, {deaths.oldAge} of old age, {stats.meals} flies caught.</p>
          <p className="eco-hint">Click any creature to follow it, or adopt it as yours.</p>
        </div>
      )}
    </section>
  );
};

export default React.memo(PondCensus);
