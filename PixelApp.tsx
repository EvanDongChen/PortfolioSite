import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import PortfolioContent from './components/PortfolioContent';
import PixelOcean from './components/PixelOcean';
import EcosystemPanel from './components/EcosystemPanel';
import BackToTopButton from './components/BackToTopButton';
import ThemeSwitch from './components/ThemeSwitch';
import PerformanceButton from './components/PerformanceButton';
import PerformancePanel from './components/PerformancePanel';
import DiveGauge from './components/DiveGauge';
import DiveCard from './components/DiveCard';
import { OceanStats } from './lib/pixelOcean';
import { PIXEL_COLORS } from './lib/themeColors';
import { filterProjects, experiences, education, skills } from './data/portfolio';
import { useRestoreScrollAfterSwitch } from './contexts/ThemeContext';
import { markPageReady } from './lib/pageTransition';
import './pixel-theme.css';

// How long the dive log's cursor and live dot stay on, then off.
const BLINK_MS = 600;

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
  // The cursor and live dot blink on one slow timer (see pixel-theme.css).
  useEffect(() => {
    const root = document.documentElement;
    const timer = window.setInterval(() => root.toggleAttribute('data-blink-off'), BLINK_MS);
    return () => {
      window.clearInterval(timer);
      root.removeAttribute('data-blink-off');
    };
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPerformancePanelOpen, setIsPerformancePanelOpen] = useState(false);
  const [stats, setStats] = useState<OceanStats | null>(null);
  // The world's first report means it's there to be seen: the page transition can uncover it.
  const worldUp = stats !== null;
  useEffect(() => { if (worldUp) markPageReady(); }, [worldUp]);

  const filteredProjects = useMemo(() => filterProjects(searchTerm), [searchTerm]);
  const togglePerformancePanel = useCallback(() => setIsPerformancePanelOpen(open => !open), []);
  const closePerformancePanel = useCallback(() => setIsPerformancePanelOpen(false), []);

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden bg-[#050d14]">
      <PixelOcean onStats={setStats} />
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
      <ThemeSwitch />
      <EcosystemPanel stats={stats} />
    </div>
  );
};

export default PixelApp;
