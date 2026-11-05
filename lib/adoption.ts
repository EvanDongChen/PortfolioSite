import { Species } from './pixelOcean';

// The visitor's adopted creature, remembered on this device only. The reef
// itself restarts on every visit, so the creature is released afresh, and
// when it dies the adoption passes to one of its children.

export interface Adoption<S extends string = Species> {
  /** The name the visitor chose, before any generation numeral. */
  name: string;
  species: S;
  palette: number;
  generation: number;
  /** When the line was first adopted (ms since epoch). */
  since: number;
}

const KEY = 'reef.adoption';
/** Where the pond keeps its own adopted creature, apart from the reef's. */
export const POND_ADOPTION_KEY = 'pond.adoption';
/** Where the shrine forest keeps its own. */
export const SHRINE_ADOPTION_KEY = 'shrine.adoption';

export const loadAdoption = <S extends string = Species>(key = KEY): Adoption<S> | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Adoption<S>) : null;
  } catch {
    return null;
  }
};

export const saveAdoption = <S extends string = Species>(adoption: Adoption<S> | null, key = KEY) => {
  try {
    if (adoption) window.localStorage.setItem(key, JSON.stringify(adoption));
    else window.localStorage.removeItem(key);
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
export const displayName = (a: Adoption<string>) => (a.generation > 1 ? `${a.name} ${roman(a.generation)}` : a.name);
