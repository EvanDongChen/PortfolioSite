// The reef's light follows the visitor's local clock, unless they pick one.

export type TimeMode = 'auto' | 'day' | 'night';
export type Phase = 'dawn' | 'day' | 'dusk' | 'night';

const DAWN = [5, 7];
const DUSK = [18, 20];

/** 1 in full daylight, 0 at night, ramping through dawn and dusk. */
export const daylightAt = (date: Date) => {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= DAWN[1] && h < DUSK[0]) return 1;
  if (h >= DAWN[0] && h < DAWN[1]) return (h - DAWN[0]) / (DAWN[1] - DAWN[0]);
  if (h >= DUSK[0] && h < DUSK[1]) return 1 - (h - DUSK[0]) / (DUSK[1] - DUSK[0]);
  return 0;
};

export const targetDaylight = (mode: TimeMode, date = new Date()) =>
  mode === 'day' ? 1 : mode === 'night' ? 0 : daylightAt(date);

export const phaseOf = (mode: TimeMode, date = new Date()): Phase => {
  if (mode !== 'auto') return mode;
  const light = daylightAt(date);
  if (light >= 1) return 'day';
  if (light <= 0) return 'night';
  return date.getHours() < 12 ? 'dawn' : 'dusk';
};

export const NEXT_MODE: Record<TimeMode, TimeMode> = { auto: 'day', day: 'night', night: 'auto' };
