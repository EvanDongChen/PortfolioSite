import React, { useState } from 'react';
import { ShrineEvent, ShrineHappening, ShrineSpecies, ShrineStats, TICKS_PER_SECOND } from '../lib/shrine';
import { shrineIcon } from '../lib/shrineArt';
import PixelMeter from './PixelMeter';

interface ShrineCensusProps {
  stats: ShrineStats | null;
}

const FEED_LENGTH = 3;

const EVENT_COLOR: Record<ShrineEvent['kind'], string> = {
  shift: '#ffc978', offering: '#f4f0dc', scrap: '#ff7a5a', caught: '#ff7a5a', theft: '#9aa6c8', eaten: '#e2484c', birth: '#f2a6c2', visit: '#8fd0ff', death: '#9aa6c8',
};
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

const clock = (ticks: number) => {
  const seconds = Math.floor(ticks / TICKS_PER_SECOND);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

const Row: React.FC<{ label: string; value: string | number; fill: number; color: string }> = ({ label, value, fill, color }) => (
  <div className="eco-row">
    <span className="eco-swatch" style={{ background: color }} />
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
    <section className={`eco-hud shrine-census fixed bottom-8 left-8 z-40 hidden sm:block ${isOpen ? 'w-80' : 'w-auto'}`} aria-label="Shrine records">
      <button type="button" onClick={() => setIsOpen(open => !open)} className="eco-header" aria-expanded={isOpen}>
        <span className="eco-live" aria-hidden="true" />
        <span className="eco-title">Shrine records</span>
        <span className="eco-clock">{clock(stats.tick)}</span>
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
          <div className="eco-totals">
            <span>{stats.counts.tanuki} tanuki</span>
            <span>{stats.counts.kitsune} kitsune</span>
            <span>{stats.disguised} "objects"</span>
            <span>{stats.scraps} scraps</span>
            <span>{stats.shifts} changes</span>
            <span>{stats.caught} found out</span>
          </div>
          <ul className="eco-species" aria-label="The forest's animals">
            {WILD.map(s => (
              <li key={s} className={stats.counts[s] === 0 ? 'is-absent' : undefined}>
                <img className="eco-icon" src={iconOf(s)} alt="" />
                <span>{PLURAL[s]}</span>
                <span className="eco-value">{stats.counts[s]}</span>
              </li>
            ))}
          </ul>
          <p className="pond-census-label">Spirits</p>
          <ul className="eco-species" aria-label="The forest's spirits">
            {SPIRITS.map(s => (
              <li key={s} className={stats.counts[s] === 0 ? 'is-absent' : undefined}>
                <img className="eco-icon" src={iconOf(s)} alt="" />
                <span>{PLURAL[s]}</span>
                <span className="eco-value">{stats.counts[s]}</span>
              </li>
            ))}
          </ul>
          <ul className="eco-feed" aria-label="Recent events">
            {stats.events.slice(0, FEED_LENGTH).map(event => (
              <li key={`${event.tick}-${event.text}`} className={event.starred ? 'is-starred' : undefined}>
                <span className="eco-feed-dot" style={{ background: EVENT_COLOR[event.kind] }} aria-hidden="true" />
                <span className="eco-feed-time">{clock(event.tick)}</span>
                {event.starred && <span className="adopt-star" aria-label="Your creature">★ </span>}
                {event.text}
              </li>
            ))}
            {stats.events.length === 0 && <li className="eco-feed-empty">The forest is quiet…</li>}
          </ul>
          <div className="eco-totals">
            <span>{stats.births} born</span>
            <span>{deaths.eaten} eaten</span>
            <span>{deaths.starved} starved</span>
            <span>{deaths.oldAge} old age</span>
          </div>
          <p className="eco-hint">Keep an eye on the teapots: nothing moves while you're looking. Click one to give it away, or any creature to follow it.</p>
        </div>
      )}
    </section>
  );
};

export default React.memo(ShrineCensus);
