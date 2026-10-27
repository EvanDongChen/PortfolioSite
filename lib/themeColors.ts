// Tailwind class sets the portfolio content uses for each look. Shared
// objects (rather than built per render) keep PortfolioContent memoized.
export type ThemeColors = typeof UNDERWATER_COLORS;

export const UNDERWATER_COLORS = {
  text: 'text-cyan-100', textLighter: 'text-cyan-100/90', highlight: 'text-cyan-300',
  highlightStrong: 'text-cyan-200', border: 'border-cyan-400/20', timeline: 'bg-cyan-400/30',
  timelineDot: 'bg-cyan-500', timelineDotBorder: 'border-[#002851]', cardBg: 'bg-black/20',
  tagBg: 'bg-cyan-900/50', tagHoverBg: 'hover:bg-cyan-800/70', toolTagBg: 'bg-slate-800/50',
  toolTagHoverBg: 'hover:bg-slate-700/70', searchBg: 'bg-slate-900/50', searchBorder: 'border-cyan-400/30',
  searchRing: 'focus:ring-cyan-400', searchPlaceholder: 'placeholder-cyan-200/50', periodBg: 'bg-[#004e92]',
  heroGradient: 'from-cyan-300 to-blue-400', contactIcon: 'text-cyan-300'
};

export const DEEPSEA_COLORS: ThemeColors = {
  text: 'text-emerald-100', textLighter: 'text-emerald-100/80', highlight: 'text-emerald-300',
  highlightStrong: 'text-emerald-200', border: 'border-emerald-400/15', timeline: 'bg-emerald-400/25',
  timelineDot: 'bg-emerald-400', timelineDotBorder: 'border-black', cardBg: 'bg-black/50',
  tagBg: 'bg-emerald-900/40', tagHoverBg: 'hover:bg-emerald-800/60', toolTagBg: 'bg-slate-900/60',
  toolTagHoverBg: 'hover:bg-slate-800/70', searchBg: 'bg-black/60', searchBorder: 'border-emerald-400/25',
  searchRing: 'focus:ring-emerald-400', searchPlaceholder: 'placeholder-emerald-200/40', periodBg: 'bg-[#001208]',
  heroGradient: 'from-emerald-300 to-cyan-400', contactIcon: 'text-emerald-300'
};

// The pixel ecosystem is busier behind the text than the aquarium, so cards
// and the period badges sit on darker backing.
export const PIXEL_COLORS: ThemeColors = {
  ...UNDERWATER_COLORS,
  cardBg: 'bg-[#020b24]/70',
  searchBg: 'bg-[#020b24]/80',
  periodBg: 'bg-[#06306b]',
};
