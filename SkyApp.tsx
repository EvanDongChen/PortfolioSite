import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import PortfolioContent from './components/PortfolioContent';
import SkyIslands from './components/SkyIslands';
import SkyDebugPanel, { SkyDebugActions } from './components/SkyDebugPanel';
import BackToTopButton from './components/BackToTopButton';
import ThemeSwitch from './components/ThemeSwitch';
import PerformanceButton from './components/PerformanceButton';
import PerformancePanel from './components/PerformancePanel';
import DiveCard from './components/DiveCard';
import { SKY_COLORS } from './lib/themeColors';
import { filterProjects, experiences, education, skills } from './data/portfolio';
import { useRestoreScrollAfterSwitch } from './contexts/ThemeContext';
import { markPageReady } from './lib/pageTransition';
import './pixel-theme.css';
import './sky-theme.css';

const BLINK_MS = 600;
const HERO_EXTRA = <DiveCard />;

/**
 * The portfolio as a traveller's journal, over a sky of floating islands: a
 * real 3D scene of islands, waterfalls, clouds and a long dragon chasing its
 * pearl, rendered as pixel art. It shares the reef page's pixel UI
 * (pixel-theme.css), re-coloured and re-lettered by sky-theme.css.
 */
const SkyApp: React.FC = () => {
  useRestoreScrollAfterSwitch();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('pixel-theme', 'sky-theme');
    return () => root.classList.remove('pixel-theme', 'sky-theme');
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const timer = window.setInterval(() => root.toggleAttribute('data-blink-off'), BLINK_MS);
    return () => {
      window.clearInterval(timer);
      root.removeAttribute('data-blink-off');
    };
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const debug = useRef<SkyDebugActions | null>(null);
  const [isPerformancePanelOpen, setIsPerformancePanelOpen] = useState(false);
  const filteredProjects = useMemo(() => filterProjects(searchTerm), [searchTerm]);
  const togglePerformancePanel = useCallback(() => setIsPerformancePanelOpen(open => !open), []);
  const closePerformancePanel = useCallback(() => setIsPerformancePanelOpen(false), []);

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden bg-[#7eb8ea]">
      <SkyIslands onReady={markPageReady} debug={debug} />
      <PortfolioContent
        theme="underwater"
        colors={SKY_COLORS}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filteredProjects={filteredProjects}
        experiences={experiences}
        education={education}
        skills={skills}
        showSandDune={false}
        heroExtra={HERO_EXTRA}
      />
      <BackToTopButton />
      <PerformanceButton isOpen={isPerformancePanelOpen} onToggle={togglePerformancePanel} />
      <PerformancePanel isOpen={isPerformancePanelOpen} onClose={closePerformancePanel} />
      <ThemeSwitch />
      <SkyDebugPanel actions={debug} />
    </div>
  );
};

export default SkyApp;
