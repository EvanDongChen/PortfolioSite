import React, { createContext, useState, useContext, useCallback, useLayoutEffect, ReactNode } from 'react';
import { loadAquarium, loadPond, loadShrine, loadSky, loadSpace, loadHotpot } from '../lib/pageLoaders';
import { movePage } from '../lib/pageTransition';

type Theme = 'underwater' | 'deepsea';
/** The pages: the aquarium, the pixel reef, the pixel pond, the shrine forest, deep space, the sky islands and the hot pot. */
export type Page = 'aquarium' | 'reef' | 'pond' | 'shrine' | 'space' | 'sky' | 'hotpot';

// Keep deep-sea support available while it is temporarily disabled in the UI.
export const DEEP_SEA_MODE_ENABLED = false;

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  /** The pixel ecosystem replaces the whole aquarium page while on. */
  isPixelMode: boolean;
  /** The pixel pond replaces whichever page was showing while on. */
  isPondMode: boolean;
  /** The shrine forest replaces whichever page was showing while on. */
  isShrineMode: boolean;
  /** Deep space replaces whichever page was showing while on. */
  isSpaceMode: boolean;
  /** The sky islands replace whichever page was showing while on. */
  isSkyMode: boolean;
  /** The hot pot replaces whichever page was showing while on. */
  isHotpotMode: boolean;
  /** Which page is showing, and switching to another; the transition ripples out from `origin` if given. */
  page: Page;
  setPage: (page: Page, origin?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/** The worlds a visit can open on; the archived aquarium is left out. */
const WORLDS: Page[] = ['reef', 'pond', 'shrine', 'space', 'sky', 'hotpot'];
/** Each visit opens on a world picked at random; the switch moves between them as before. */
const firstPage: Page = WORLDS[Math.floor(Math.random() * WORLDS.length)];

// Switching pages remounts the content, so remember where the reader was.
let pendingScrollY: number | null = null;

/** The page's code and its lettering, fetched while the transition is covering the screen. */
const preparePage = async (page: Page) => {
  if (page === 'pond') {
    await loadPond();
    await Promise.all([document.fonts?.load("16px 'Pond Display'"), document.fonts?.load("16px 'Pond Label'")]);
  } else if (page === 'shrine') {
    await loadShrine();
    await Promise.all([document.fonts?.load("16px 'Shrine Display'"), document.fonts?.load("16px 'Shrine Label'")]);
  } else if (page === 'space') {
    await loadSpace();
    await Promise.all([document.fonts?.load("16px 'Space Display'"), document.fonts?.load("16px 'Space Label'")]);
  } else if (page === 'sky') {
    await loadSky();
    await Promise.all([document.fonts?.load("italic 600 16px 'Sky Display'"), document.fonts?.load("italic 600 16px 'Sky Label'")]);
  } else if (page === 'hotpot') {
    await loadHotpot();
    await Promise.all([document.fonts?.load("16px 'Hotpot Display'"), document.fonts?.load("16px 'Hotpot Label'")]);
  }
  else if (page === 'aquarium') await loadAquarium();
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('underwater');
  // The reef stays on underneath every world but the aquarium, which is one click away in settings.
  const [isPixelMode, setIsPixelMode] = useState(true);
  const [isPondMode, setIsPondMode] = useState(firstPage === 'pond');
  const [isShrineMode, setIsShrineMode] = useState(firstPage === 'shrine');
  const [isSpaceMode, setIsSpaceMode] = useState(firstPage === 'space');
  const [isSkyMode, setIsSkyMode] = useState(firstPage === 'sky');
  const [isHotpotMode, setIsHotpotMode] = useState(firstPage === 'hotpot');

  const toggleTheme = () => {
    if (!DEEP_SEA_MODE_ENABLED) return;
    setTheme(prevTheme => (prevTheme === 'underwater' ? 'deepsea' : 'underwater'));
  };

  const page: Page = isHotpotMode ? 'hotpot' : isSkyMode ? 'sky' : isSpaceMode ? 'space' : isShrineMode ? 'shrine' : isPondMode ? 'pond' : isPixelMode ? 'reef' : 'aquarium';

  const setPage = useCallback((next: Page, origin?: { x: number; y: number }) => {
    const swap = () => {
      pendingScrollY = window.scrollY;
      // No page's look may outlive it (a hot reload can leave one behind); the next page adds its own.
      document.documentElement.classList.remove('pond-theme', 'shrine-theme', 'space-theme', 'sky-theme', 'hotpot-theme');
      setIsPondMode(next === 'pond');
      setIsShrineMode(next === 'shrine');
      setIsSpaceMode(next === 'space');
      setIsSkyMode(next === 'sky');
      setIsHotpotMode(next === 'hotpot');
      if (next === 'reef' || next === 'aquarium') setIsPixelMode(next === 'reef');
    };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { swap(); return; }
    movePage({ to: next, origin, prepare: () => preparePage(next), swap });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isPixelMode, isPondMode, isShrineMode, isSpaceMode, isSkyMode, isHotpotMode, page, setPage }}>
      {children}
    </ThemeContext.Provider>
  );
};

/** Call once in each page so the reader lands where they were before a switch. */
export const useRestoreScrollAfterSwitch = () => {
  useLayoutEffect(() => {
    if (pendingScrollY === null) return;
    window.scrollTo(0, pendingScrollY);
    pendingScrollY = null;
  }, []);
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
