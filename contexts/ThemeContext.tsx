import React, { createContext, useState, useContext, useCallback, useLayoutEffect, ReactNode } from 'react';

type Theme = 'underwater' | 'deepsea';

// Keep deep-sea support available while it is temporarily disabled in the UI.
export const DEEP_SEA_MODE_ENABLED = false;

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  /** The pixel ecosystem replaces the whole aquarium page while on. */
  isPixelMode: boolean;
  togglePixelMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Switching pages remounts the content, so remember where the reader was.
let pendingScrollY: number | null = null;

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('underwater');
  // The pixel reef is the default look; the aquarium is one click away.
  const [isPixelMode, setIsPixelMode] = useState(true);

  const toggleTheme = () => {
    if (!DEEP_SEA_MODE_ENABLED) return;
    setTheme(prevTheme => (prevTheme === 'underwater' ? 'deepsea' : 'underwater'));
  };

  const togglePixelMode = useCallback(() => {
    pendingScrollY = window.scrollY;
    setIsPixelMode(prev => !prev);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isPixelMode, togglePixelMode }}>
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
