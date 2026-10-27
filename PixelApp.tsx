import React, { useCallback, useMemo, useState } from 'react';
import PortfolioContent from './components/PortfolioContent';
import PixelOcean from './components/PixelOcean';
import EcosystemPanel from './components/EcosystemPanel';
import FishFoodButton from './components/FishFoodButton';
import BackToTopButton from './components/BackToTopButton';
import PixelModeButton from './components/PixelModeButton';
import PerformanceButton from './components/PerformanceButton';
import PerformancePanel from './components/PerformancePanel';
import { OceanStats } from './lib/pixelOcean';
import { PIXEL_COLORS } from './lib/themeColors';
import { filterProjects, experiences, education, skills } from './data/portfolio';
import { useRestoreScrollAfterSwitch } from './contexts/ThemeContext';

/** The portfolio over a simulated pixel ocean instead of the aquarium. */
const PixelApp: React.FC = () => {
  useRestoreScrollAfterSwitch();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFoodMode, setIsFoodMode] = useState(false);
  const [isPerformancePanelOpen, setIsPerformancePanelOpen] = useState(false);
  const [stats, setStats] = useState<OceanStats | null>(null);

  const filteredProjects = useMemo(() => filterProjects(searchTerm), [searchTerm]);
  const toggleFoodMode = useCallback(() => setIsFoodMode(on => !on), []);
  const togglePerformancePanel = useCallback(() => setIsPerformancePanelOpen(open => !open), []);
  const closePerformancePanel = useCallback(() => setIsPerformancePanelOpen(false), []);

  return (
    <div className={`relative min-h-screen text-white overflow-x-hidden bg-[#020b24] ${isFoodMode ? 'cursor-crosshair' : ''}`}>
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
      />
      <BackToTopButton />
      <PerformanceButton isOpen={isPerformancePanelOpen} onToggle={togglePerformancePanel} />
      <PerformancePanel isOpen={isPerformancePanelOpen} onClose={closePerformancePanel} />
      <PixelModeButton />
      <FishFoodButton isActive={isFoodMode} onToggle={toggleFoodMode} />
      <EcosystemPanel stats={stats} />
    </div>
  );
};

export default PixelApp;
