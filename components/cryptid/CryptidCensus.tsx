import React, { useState } from 'react';
import CensusSlots from '../CensusSlots';
import { CRYPTIDS, CRYPTID_NAME, CryptidKind, ForestStats } from '../../lib/cryptid/forestLife';

/** A photo in the case file: the picture and when it was taken. */
export interface CasePhoto { url: string; at: number }
export type CaseFile = Partial<Record<CryptidKind, CasePhoto>>;

interface CryptidCensusProps {
  stats: ForestStats | null;
  photos: CaseFile;
}

// Pixel icons for the ordinary animals ('X' body, 'o' eyes or a highlight).
const ICONS: Record<string, { rows: string[]; body: string; eye: string }> = {
  owl: { rows: ['.X....X.', '.XXXXXX.', 'XoXXXXoX', 'XXXXXXXX', '.XXXXXX.', '.XXXXXX.', '..XXXX..', '..X..X..'], body: '#8a6a4a', eye: '#8ef07a' },
  deer: { rows: ['X.X.......', '.X........', 'XXo.......', '.XXXXXXXX.', '..XXXXXXXo', '..XXXXXXX.', '..X.X.X.X.', '..X.X.X.X.'], body: '#b0845a', eye: '#f4f6f8' },
  raccoon: { rows: ['.X..X.....', '.XXXX.....', 'XoooX..XX.', '.XXXXXXXXo', '..XXXXXXX.', '..XXXXXX..', '..X.X.X...'], body: '#8a8a96', eye: '#1a1a22' },
  firefly: { rows: ['..X..X..', '...XX...', '..XXXX..', '.XXXXXX.', '..oooo..', '..oooo..', '...oo...'], body: '#5a4a3a', eye: '#e6f070' },
  moth: { rows: ['X......X', 'XX.XX.XX', 'XXXXXXXX', '.XXooXX.', '..XXXX..', '.XX..XX.'], body: '#c8bea8', eye: '#6a5a4a' },
};
const LABEL: Record<string, string> = { owl: 'Owls', deer: 'Deer', raccoon: 'Raccoons', firefly: 'Fireflies', moth: 'Moths in your light' };

let iconUrls: Record<string, string> | null = null;
const iconOf = (k: string) => {
  if (!iconUrls) {
    iconUrls = {};
    for (const [key, ic] of Object.entries(ICONS)) {
      const c = document.createElement('canvas');
      c.width = ic.rows[0].length;
      c.height = ic.rows.length;
      const g = c.getContext('2d');
      if (g) ic.rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return;
        g.fillStyle = ch === 'o' ? ic.eye : ic.body;
        g.fillRect(x, y, 1, 1);
      }));
      iconUrls[key] = c.toDataURL();
    }
  }
  return iconUrls[k];
};

const when = (at: number) => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * The case file, bottom left: a polaroid for every cryptid you've caught in
 * your light (kept between visits), a blank for the ones still out there, and
 * a tally of the forest's ordinary night life.
 */
const CryptidCensus: React.FC<CryptidCensusProps> = ({ stats, photos }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!stats) return null;
  const found = CRYPTIDS.filter(k => photos[k]).length;

  return (
    <section className={`eco-hud census cryptid-census fixed bottom-8 left-8 z-40 hidden sm:block ${isOpen ? 'is-open w-80' : 'w-auto'}`} aria-label="Case file">
      <button type="button" onClick={() => setIsOpen(open => !open)} className="eco-header" aria-expanded={isOpen}>
        <span className="eco-title">Case file</span>
        <span className="eco-value cryptid-found">{found}/{CRYPTIDS.length}</span>
        <span className="eco-toggle" aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="eco-body">
          <ul className="cryptid-polaroids" aria-label="Cryptids documented">
            {CRYPTIDS.map(k => {
              const ph = photos[k];
              return (
                <li key={k} className={ph ? 'is-found' : 'is-missing'} aria-label={ph ? `${CRYPTID_NAME[k]}, documented` : 'Not yet documented'}>
                  <span className="cryptid-photo">{ph ? <img src={ph.url} alt="" /> : <span aria-hidden="true">?</span>}</span>
                  <span className="cryptid-caption">{ph ? CRYPTID_NAME[k] : '???'}</span>
                  {ph && <span className="cryptid-date">{when(ph.at)}</span>}
                </li>
              );
            })}
          </ul>
          <CensusSlots label="The forest's night life" items={Object.keys(ICONS).map(k => ({ key: k, name: LABEL[k], count: stats.counts[k as keyof ForestStats['counts']], icon: iconOf(k) }))} />
          <ul className="eco-feed" aria-label="Recent sightings">
            {stats.events.slice(0, 2).map(e => (
              <li key={`${e.t}-${e.text}`} className={e.star ? 'is-starred' : undefined}>
                {e.star && <span className="adopt-star" aria-hidden="true">★ </span>}
                {e.text}
              </li>
            ))}
            {stats.events.length === 0 && <li className="eco-feed-empty">Something is out there…</li>}
          </ul>
          <p className="eco-hint">Hold a cryptid in your flashlight to photograph it. Rest the light somewhere and see what it draws in.</p>
        </div>
      )}
    </section>
  );
};

export default React.memo(CryptidCensus);
