import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import PortfolioContent from '../components/PortfolioContent';
import CryptidForest from '../components/cryptid/CryptidForest';
import CryptidDebugPanel, { CryptidDebugActions } from '../components/cryptid/CryptidDebugPanel';
import BackToTopButton from '../components/BackToTopButton';
import ThemeSwitch from '../components/ThemeSwitch';
import PerformanceButton from '../components/PerformanceButton';
import PerformancePanel from '../components/PerformancePanel';
import DiveCard from '../components/DiveCard';
import { CRYPTID_COLORS } from '../lib/themeColors';
import { filterProjects, experiences, education, skills } from '../data/portfolio';
import { useRestoreScrollAfterSwitch } from '../contexts/ThemeContext';
import { markPageReady } from '../lib/pageTransition';
import '../styles/pixel-theme.css';
import '../styles/cryptid-theme.css';

const BLINK_MS = 600;
const HERO_EXTRA = <DiveCard />;

/**
 * The portfolio as a cryptid hunter's case file, over a dark forest at night:
 * a real 3D scene of pines, dead trees, an abandoned campsite and the things
 * that live out there, rendered as pixel art and lit by a flashlight that
 * follows the cursor. It shares the reef page's pixel UI (pixel-theme.css),
 * re-coloured and re-lettered by cryptid-theme.css.
 */
const CryptidApp: React.FC = () => {
  useRestoreScrollAfterSwitch();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('pixel-theme', 'cryptid-theme');
    return () => root.classList.remove('pixel-theme', 'cryptid-theme');
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
  const debug = useRef<CryptidDebugActions | null>(null);
  const [isPerformancePanelOpen, setIsPerformancePanelOpen] = useState(false);
  const filteredProjects = useMemo(() => filterProjects(searchTerm), [searchTerm]);
  const togglePerformancePanel = useCallback(() => setIsPerformancePanelOpen(open => !open), []);
  const closePerformancePanel = useCallback(() => setIsPerformancePanelOpen(false), []);

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden bg-[#06090c]">
      <CryptidForest onReady={markPageReady} debug={debug} />
      <PortfolioContent
        theme="underwater"
        colors={CRYPTID_COLORS}
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
      <CryptidDebugPanel actions={debug} />
    </div>
  );
};

export default CryptidApp;
