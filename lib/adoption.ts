import { Species } from './pixelOcean';

// The visitor's adopted creature, remembered on this device only. The reef
// itself restarts on every visit, so the creature is released afresh, and
// when it dies the adoption passes to one of its children.

export interface Adoption {
  /** The name the visitor chose, before any generation numeral. */
  name: string;
  species: Species;
  palette: number;
  generation: number;
  /** When the line was first adopted (ms since epoch). */
  since: number;
}

const KEY = 'reef.adoption';

export const loadAdoption = (): Adoption | null => {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Adoption) : null;
  } catch {
    return null;
  }
};

export const saveAdoption = (adoption: Adoption | null) => {
  try {
    if (adoption) window.localStorage.setItem(KEY, JSON.stringify(adoption));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage can be unavailable (private windows); the adoption just won't persist.
  }
};

const NUMERALS: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const roman = (n: number) => {
  let out = '';
  for (const [value, numeral] of NUMERALS) {
    while (n >= value) { out += numeral; n -= value; }
  }
  return out;
};

/** "Mochi", then "Mochi II", "Mochi III"... down the family line. */
export const displayName = (a: Adoption) => (a.generation > 1 ? `${a.name} ${roman(a.generation)}` : a.name);
