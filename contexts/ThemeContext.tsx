import React, { createContext, useState, useContext, useCallback, useLayoutEffect, ReactNode } from 'react';

type Theme = 'underwater' | 'deepsea';
/** The three pages: the aquarium, the pixel reef and the pixel pond. */
export type Page = 'aquarium' | 'reef' | 'pond';

// Keep deep-sea support available while it is temporarily disabled in the UI.
export const DEEP_SEA_MODE_ENABLED = false;

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  /** The pixel ecosystem replaces the whole aquarium page while on. */
  isPixelMode: boolean;
  /** The pixel pond replaces whichever page was showing while on. */
  isPondMode: boolean;
  /** Which page is showing, and switching to another (see ThemeDial). */
  page: Page;
  setPage: (page: Page) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Switching pages remounts the content, so remember where the reader was.
let pendingScrollY: number | null = null;

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('underwater');
  // The pixel reef is the default look; the aquarium is one click away.
  const [isPixelMode, setIsPixelMode] = useState(true);
  const [isPondMode, setIsPondMode] = useState(false);

  const toggleTheme = () => {
    if (!DEEP_SEA_MODE_ENABLED) return;
    setTheme(prevTheme => (prevTheme === 'underwater' ? 'deepsea' : 'underwater'));
  };

  const page: Page = isPondMode ? 'pond' : isPixelMode ? 'reef' : 'aquarium';

  const setPage = useCallback((next: Page) => {
    pendingScrollY = window.scrollY;
    setIsPondMode(next === 'pond');
    if (next !== 'pond') setIsPixelMode(next === 'reef');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isPixelMode, isPondMode, page, setPage }}>
      {children}
    </ThemeContext.Provider>
  );
};

/** True while a page is mounting because the reader switched to it (not on first load). */
export const isSwitchingPages = () => pendingScrollY !== null;

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
