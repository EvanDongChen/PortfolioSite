import React, { useEffect, useLayoutEffect, useMemo, useState, useCallback } from 'react';
import PortfolioContent from './components/PortfolioContent';
import PondWater from './components/PondWater';
import BackToTopButton from './components/BackToTopButton';
import PondModeButton from './components/PondModeButton';
import PerformanceButton from './components/PerformanceButton';
import PerformancePanel from './components/PerformancePanel';
import PixelTransition from './components/PixelTransition';
import DiveCard from './components/DiveCard';
import PondCensus from './components/PondCensus';
import { PondStats } from './lib/pond';
import { POND_COLORS } from './lib/themeColors';
import { filterProjects, experiences, education, skills } from './data/portfolio';
import { isSwitchingPages, useRestoreScrollAfterSwitch } from './contexts/ThemeContext';
import './pixel-theme.css';
import './pond-theme.css';

const BLINK_MS = 600;
const HERO_EXTRA = <DiveCard />;

/**
 * The portfolio as a naturalist's field notes over a living pixel pond. It
 * shares the reef page's pixel UI (pixel-theme.css), re-coloured for the
 * pond by pond-theme.css.
 */
const PondApp: React.FC = () => {
  useRestoreScrollAfterSwitch();
  // Both classes: the pixel UI, and the pond's colours over it.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('pixel-theme', 'pond-theme');
    return () => root.classList.remove('pixel-theme', 'pond-theme');
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const timer = window.setInterval(() => root.toggleAttribute('data-blink-off'), BLINK_MS);
    return () => {
      window.clearInterval(timer);
      root.removeAttribute('data-blink-off');
    };
  }, []);
  const [isSwitchIn] = useState(isSwitchingPages);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPerformancePanelOpen, setIsPerformancePanelOpen] = useState(false);
  const [stats, setStats] = useState<PondStats | null>(null);

  const filteredProjects = useMemo(() => filterProjects(searchTerm), [searchTerm]);
  const togglePerformancePanel = useCallback(() => setIsPerformancePanelOpen(open => !open), []);
  const closePerformancePanel = useCallback(() => setIsPerformancePanelOpen(false), []);

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden bg-[#0b1a14]">
      <PondWater onStats={setStats} />
      <PortfolioContent
        theme="underwater"
        colors={POND_COLORS}
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
      <PondModeButton />
      <PondCensus stats={stats} />
      {isSwitchIn && <PixelTransition ink="#0b1a14" edge="#173226" />}
    </div>
  );
};

export default PondApp;
