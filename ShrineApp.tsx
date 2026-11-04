import React, { useEffect, useLayoutEffect, useMemo, useState, useCallback } from 'react';
import PortfolioContent from './components/PortfolioContent';
import ShrineForest from './components/ShrineForest';
import BackToTopButton from './components/BackToTopButton';
import ThemeSwitch from './components/ThemeSwitch';
import PerformanceButton from './components/PerformanceButton';
import PerformancePanel from './components/PerformancePanel';
import PixelTransition from './components/PixelTransition';
import DiveCard from './components/DiveCard';
import ShrineCensus from './components/ShrineCensus';
import { ShrineStats } from './lib/shrine';
import { SHRINE_COLORS } from './lib/themeColors';
import { filterProjects, experiences, education, skills } from './data/portfolio';
import { isSwitchingPages, useRestoreScrollAfterSwitch } from './contexts/ThemeContext';
import './pixel-theme.css';
import './shrine-theme.css';

const BLINK_MS = 600;
const HERO_EXTRA = <DiveCard />;

/**
 * The portfolio as ema, votive tablets hung at a shrine, over a night forest
 * where tanuki and kitsune fight over the offerings. It shares the reef
 * page's pixel UI (pixel-theme.css), re-coloured by shrine-theme.css.
 */
const ShrineApp: React.FC = () => {
  useRestoreScrollAfterSwitch();
  // Both classes: the pixel UI, and the shrine's colours over it.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('pixel-theme', 'shrine-theme');
    return () => root.classList.remove('pixel-theme', 'shrine-theme');
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
  const [stats, setStats] = useState<ShrineStats | null>(null);

  const filteredProjects = useMemo(() => filterProjects(searchTerm), [searchTerm]);
  const togglePerformancePanel = useCallback(() => setIsPerformancePanelOpen(open => !open), []);
  const closePerformancePanel = useCallback(() => setIsPerformancePanelOpen(false), []);

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden bg-[#0a1022]">
      <ShrineForest onStats={setStats} />
      <PortfolioContent
        theme="underwater"
        colors={SHRINE_COLORS}
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
      <ShrineCensus stats={stats} />
      {isSwitchIn && <PixelTransition ink="#0a1022" edge="#2a1a30" />}
    </div>
  );
};

export default ShrineApp;
