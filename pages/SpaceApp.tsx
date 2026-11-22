import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import PortfolioContent from '../components/PortfolioContent';
import SpaceSky from '../components/space/SpaceSky';
import SpaceDebugPanel, { SpaceDebugActions } from '../components/space/SpaceDebugPanel';
import BackToTopButton from '../components/BackToTopButton';
import ThemeSwitch from '../components/ThemeSwitch';
import PerformanceButton from '../components/PerformanceButton';
import HideUiButton from '../components/HideUiButton';
import PerformancePanel from '../components/PerformancePanel';
import DiveCard from '../components/DiveCard';
import { SPACE_COLORS } from '../lib/themeColors';
import { filterProjects, experiences, education, skills } from '../data/portfolio';
import { useRestoreScrollAfterSwitch } from '../contexts/ThemeContext';
import { markPageReady } from '../lib/pageTransition';
import '../styles/pixel-theme.css';
import '../styles/space-theme.css';

const BLINK_MS = 600;
const HERO_EXTRA = <DiveCard />;

/**
 * The portfolio as a flight log, over deep space: a real 3D scene of a sun,
 * planets, moons, asteroids and a comet, rendered as pixel art. It shares the
 * reef page's pixel UI (pixel-theme.css), re-coloured by space-theme.css.
 */
const SpaceApp: React.FC = () => {
  useRestoreScrollAfterSwitch();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('pixel-theme', 'space-theme');
    return () => root.classList.remove('pixel-theme', 'space-theme');
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
  const debug = useRef<SpaceDebugActions | null>(null);
  const [isPerformancePanelOpen, setIsPerformancePanelOpen] = useState(false);
  const filteredProjects = useMemo(() => filterProjects(searchTerm), [searchTerm]);
  const togglePerformancePanel = useCallback(() => setIsPerformancePanelOpen(open => !open), []);
  const closePerformancePanel = useCallback(() => setIsPerformancePanelOpen(false), []);

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden bg-[#04030a]">
      <SpaceSky onReady={markPageReady} debug={debug} />
      <PortfolioContent
        theme="underwater"
        colors={SPACE_COLORS}
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
      <HideUiButton />
      <ThemeSwitch />
      <SpaceDebugPanel actions={debug} />
    </div>
  );
};

export default SpaceApp;
