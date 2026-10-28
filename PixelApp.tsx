import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import PortfolioContent from './components/PortfolioContent';
import PixelOcean from './components/PixelOcean';
import EcosystemPanel from './components/EcosystemPanel';
import FishFoodButton from './components/FishFoodButton';
import BackToTopButton from './components/BackToTopButton';
import PixelModeButton from './components/PixelModeButton';
import PerformanceButton from './components/PerformanceButton';
import PerformancePanel from './components/PerformancePanel';
import PixelTransition from './components/PixelTransition';
import DiveGauge from './components/DiveGauge';
import DiveCard from './components/DiveCard';
import { OceanStats } from './lib/pixelOcean';
import { PIXEL_COLORS } from './lib/themeColors';
import { filterProjects, experiences, education, skills } from './data/portfolio';
import { useRestoreScrollAfterSwitch } from './contexts/ThemeContext';
import './pixel-theme.css';

// Created once so the memoised page content never re-renders for it.
const HERO_EXTRA = <DiveCard />;

/** The portfolio as a dive log over a simulated pixel reef. */
const PixelApp: React.FC = () => {
  useRestoreScrollAfterSwitch();
  // On <html> rather than this page's root so portalled UI (the project
  // modal) and the scrollbar pick up the pixel styles too. Before paint, so
  // the page never shows a frame without them.
  useLayoutEffect(() => {
    document.documentElement.classList.add('pixel-theme');
    return () => document.documentElement.classList.remove('pixel-theme');
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFoodMode, setIsFoodMode] = useState(false);
  const [isPerformancePanelOpen, setIsPerformancePanelOpen] = useState(false);
  const [stats, setStats] = useState<OceanStats | null>(null);

  const filteredProjects = useMemo(() => filterProjects(searchTerm), [searchTerm]);
  const toggleFoodMode = useCallback(() => setIsFoodMode(on => !on), []);
  const togglePerformancePanel = useCallback(() => setIsPerformancePanelOpen(open => !open), []);
  const closePerformancePanel = useCallback(() => setIsPerformancePanelOpen(false), []);

  return (
    <div className={`relative min-h-screen text-white overflow-x-hidden bg-[#050d14] ${isFoodMode ? 'cursor-crosshair' : ''}`}>
      <PixelOcean isFoodMode={isFoodMode} onStats={setStats} />
      <PortfolioContent
        theme="underwater"
        colors={PIXEL_COLORS}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filteredProjects={filteredProjects}
        experiences={experiences}
        education={education}
        skills={skills}
        showSandDune={false}
        heroExtra={HERO_EXTRA}
      />
      <DiveGauge />
      <BackToTopButton />
      <PerformanceButton isOpen={isPerformancePanelOpen} onToggle={togglePerformancePanel} />
      <PerformancePanel isOpen={isPerformancePanelOpen} onClose={closePerformancePanel} />
      <PixelModeButton />
      <FishFoodButton isActive={isFoodMode} onToggle={toggleFoodMode} />
      <EcosystemPanel stats={stats} />
      <PixelTransition />
    </div>
  );
};

export default PixelApp;
