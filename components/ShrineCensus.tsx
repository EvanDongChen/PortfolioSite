import React, { useState } from 'react';
import CensusSlots from './CensusSlots';
import { ShrineHappening, ShrineSpecies, ShrineStats } from '../lib/shrine';
import { shrineIcon } from '../lib/shrineArt';
import PixelMeter from './PixelMeter';

interface ShrineCensusProps {
  stats: ShrineStats | null;
}

const FEED_LENGTH = 2;

const WILD: ShrineSpecies[] = ['deer', 'hare', 'mouse', 'owl', 'bat', 'crow', 'frog', 'koi'];
const SPIRITS: ShrineSpecies[] = ['hahaki', 'baku', 'tsuchinoko', 'nekomata', 'akaname', 'kappa', 'kodama', 'hitodama', 'kasa', 'chochin'];
const PLURAL: Record<ShrineSpecies, string> = {
  tanuki: 'Tanuki', kitsune: 'Kitsune', hahaki: 'Broom spirits', baku: 'Baku', tsuchinoko: 'Tsuchinoko', nekomata: 'Nekomata', akaname: 'Akaname', mouse: 'Field mice', hare: 'Hares', deer: 'Sika deer', owl: 'Owls', bat: 'Bats', crow: 'Crows', frog: 'Frogs', koi: 'Koi',
  kappa: 'Kappa', kodama: 'Kodama', hitodama: 'Soul-flames', kasa: 'Umbrella ghosts', chochin: 'Lantern ghosts',
};
const HAPPENING_LABEL: Record<ShrineHappening, string> = { festival: 'Lantern festival', parade: 'Night parade', moonview: 'Moon viewing', contest: 'Disguise contest' };

let icons: Record<string, string> | null = null;
const iconOf = (kind: string) => {
  icons ??= Object.fromEntries(['tanuki', 'kitsune', ...WILD, ...SPIRITS].map(k => [k, shrineIcon(k).toDataURL()]));
  return icons[kind];
};

const Row: React.FC<{ label: string; value: string | number; fill: number; color: string }> = ({ label, value, fill, color }) => (
  <div className="eco-row">
    <span>{label}</span>
    <PixelMeter value={fill} color={color} />
    <span className="eco-value">{value}</span>
  </div>
);

/** Live census of the forest, bottom left: the feud's running score, then everyone else. */
const ShrineCensus: React.FC<ShrineCensusProps> = ({ stats }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!stats) return null;
  const { deaths, score } = stats;
  const total = Math.max(1, score.tanuki + score.kitsune);

  return (
    <section className={`eco-hud census shrine-census fixed bottom-8 left-8 z-40 hidden sm:block ${isOpen ? 'is-open w-80' : 'w-auto'}`} aria-label="Shrine records">
      <button type="button" onClick={() => setIsOpen(open => !open)} className="eco-header" aria-expanded={isOpen}>
        
        <span className="eco-title">Shrine records</span>
        <span className="eco-toggle" aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="eco-body">
          {stats.happening && (
            <Row label={HAPPENING_LABEL[stats.happening.kind]} value="" fill={1 - stats.happening.progress} color="#ffc978" />
          )}
          <p className="pond-census-label">The feud: offerings taken</p>
          <div className="shrine-feud" aria-label={`Tanuki ${score.tanuki}, kitsune ${score.kitsune}`}>
            <img className="eco-icon" src={iconOf('tanuki')} alt="" />
            <span className="eco-value">{score.tanuki}</span>
            <span className="shrine-feud-bar" aria-hidden="true">
              <span style={{ width: `${(score.tanuki / total) * 100}%` }} />
            </span>
            <span className="eco-value">{score.kitsune}</span>
            <img className="eco-icon" src={iconOf('kitsune')} alt="" />
          </div>
          <Row label="Stands stocked" value={`${stats.stocked}/${stats.altars}`} fill={stats.stocked / Math.max(1, stats.altars)} color="#f4f0dc" />
          <Row label="Berries" value={stats.berries} fill={stats.berries / Math.max(1, stats.berriesFull)} color="#e2484c" />
          <p className="census-tally">{stats.counts.tanuki} tanuki and {stats.counts.kitsune} kitsune about, {stats.disguised} of them "objects". {stats.scraps} scraps, {stats.shifts} changes, {stats.caught} found out.</p>
          <CensusSlots label="The forest's animals" items={WILD.map(s => ({ key: s, name: PLURAL[s], count: stats.counts[s], icon: iconOf(s) }))} />
          <p className="pond-census-label">Spirits</p>
          <CensusSlots label="The forest's spirits" items={SPIRITS.map(s => ({ key: s, name: PLURAL[s], count: stats.counts[s], icon: iconOf(s) }))} />
          <ul className="eco-feed" aria-label="Recent events">
            {stats.events.slice(0, FEED_LENGTH).map(event => (
              <li key={`${event.tick}-${event.text}`} className={event.starred ? 'is-starred' : undefined}>
                {event.starred && <span className="adopt-star" aria-label="Your creature">★ </span>}
                {event.text}
              </li>
            ))}
            {stats.events.length === 0 && <li className="eco-feed-empty">The forest is quiet…</li>}
          </ul>
          <p className="census-tally">So far: {stats.births} born, {deaths.eaten} eaten, {deaths.starved} starved, {deaths.oldAge} of old age.</p>
          <p className="eco-hint">Keep an eye on the teapots: nothing moves while you're looking. Click one to give it away, or any creature to follow it.</p>
        </div>
      )}
    </section>
  );
};

export default React.memo(ShrineCensus);
