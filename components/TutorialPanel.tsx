import React, { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { DiveIcon, NetIcon, SurfaceIcon, TankIcon } from './Icons';

const BASE_URL = import.meta.env.BASE_URL;

interface TutorialPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialSection {
  id: string;
  title: string;
  description: string;
  images: string[];
  details?: string[];
}

const TutorialPanel: React.FC<TutorialPanelProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();

  const tutorialSections: TutorialSection[] = [
    {
      id: 'fish',
      title: 'Fish',
      description: 'Fish spawn and swim around the world with different behaviors and variants.',
      images: ['tutorialfish.png'],
      details: [
        'Behavior types: cruise, dart, loiter, conga, and curious, use census to highlight fish with specific behaviors.',
        'Pufferfish behavior: click a pufferfish to make it puff up briefly.',
        'Rare variant: rainbow fish can appear as a rare spawn and clown fish as an uncommon spawn.',
        'Angler fish (deep sea): hidden in darkness and revealed by nearby cursor light.',
        'Turtle & Jelly Fish (shallow sea): Turtles gracefully swim in arcs chasing after the jelly fish for a snack',
        'Whales (shallow sea): gentle giants that slowly glide through the water a spout of water.',
      ],
    },
    {
      id: 'theme-toggle',
      title: 'Theme Toggle Button',
      description: 'Switch between the underwater and deep-sea world themes to catch different fish.',
      images: ['abovewatertheme.png', 'belowwatertheme.png'],
    },
    {
      id: 'fish-census',
      title: 'Fish Census Button',
      description: 'Open the fish census panel and inspect live behavior counts. Click on the behaviors to highlight the fish of the corresponding behavior.',
      images: ['fishcencus.png', 'highlightedfish.png'],
    },
    {
      id: 'love-mode',
      title: 'Love Mode Button',
      description: 'Toggle love mode so fish react to heart bait. They will swim to it, perform a dance, and create a baby.',
      images: ['breeding.png'],
    },
    {
      id: 'fish-food',
      title: 'Fish Food Button',
      description: 'Enable placement mode to drop fish food into the world. Fish will swim over and eat the food.',
      images: ['fishfood.png'],
    },
    {
      id: 'grab-and-tank',
      title: 'Grabber + Fish Tank Buttons',
      description: 'Use Grab Mode to pick up fish, then open the Portable Tank to store and manage them. You can breed fish in the tank and drag them in and out.',
      images: ['fishtank.png'],
    },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const panelClasses = theme === 'deepsea'
    ? 'bg-black/80 border-emerald-400/30 text-emerald-100'
    : 'bg-slate-900/75 border-cyan-300/35 text-cyan-100';
  const mutedTextClasses = theme === 'deepsea' ? 'text-emerald-200/70' : 'text-cyan-200/75';
  const slotClasses = theme === 'deepsea'
    ? 'border-emerald-400/25 bg-emerald-950/30'
    : 'border-cyan-300/25 bg-cyan-950/30';
  const iconChipClasses = theme === 'deepsea'
    ? 'bg-emerald-500/15 border-emerald-300/30 text-emerald-100'
    : 'bg-cyan-500/15 border-cyan-200/35 text-cyan-100';

  const renderSectionIcon = (sectionId: string) => {
    switch (sectionId) {
      case 'fish':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12c2.5-3.5 6.5-5.5 11-5.5 2.5 0 4.8.6 7 2.1l-2.5 2.4 2.5 1-2.5 1 2.5 2.4c-2.2 1.5-4.5 2.1-7 2.1-4.5 0-8.5-2-11-5.5z" />
            <circle cx="10" cy="11" r="0.8" fill="currentColor" stroke="none" />
          </svg>
        );
      case 'theme-toggle':
        return (
          <div className="flex items-center gap-1">
            <DiveIcon className="w-4 h-4" />
            <SurfaceIcon className="w-4 h-4" />
          </div>
        );
      case 'fish-census':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'love-mode':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'fish-food':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3h6l1 4H8L9 3z" />
            <rect x="7" y="7" width="10" height="13" rx="2" />
            <circle cx="10" cy="13" r="1" fill="currentColor" />
            <circle cx="14" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="15" r="1" fill="currentColor" />
          </svg>
        );
      case 'grab-and-tank':
        return (
          <div className="flex items-center gap-1">
            <NetIcon className="w-4 h-4" />
            <TankIcon className="w-4 h-4" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[65] bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        data-is-tutorial="true"
      />
      <aside
        data-is-tutorial="true"
        aria-hidden={!isOpen}
        className={`fixed z-[70] right-3 left-3 sm:left-auto sm:right-6 top-20 sm:top-24 w-auto sm:w-[28rem] max-h-[calc(100vh-7rem)] rounded-2xl border shadow-2xl backdrop-blur-lg transition-all duration-300 overflow-hidden ${panelClasses} ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold tracking-wide">Tutorial</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
            aria-label="Close tutorial"
            data-is-tutorial="true"
          >
            x
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto max-h-[calc(100vh-13rem)] space-y-4">
          <p className={`text-sm leading-relaxed ${mutedTextClasses}`}>
            Welcome to Evan's Fish Simulation (or portfolio site)! In this simulation you can explore different fish species, behaviors, and themes. Here's a quick guide to get you started:
          </p>

          {tutorialSections.map((section) => (
            <div key={section.id} className={`rounded-xl border p-3 ${slotClasses}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center justify-center h-7 min-w-7 rounded-full border px-1 ${iconChipClasses}`}>
                  {renderSectionIcon(section.id)}
                </span>
                <p className="text-sm font-semibold">{section.title}</p>
              </div>
              <p className={`text-xs mb-2 ${mutedTextClasses}`}>{section.description}</p>
              {section.details && section.details.length > 0 && (
                <ul className={`mb-3 space-y-1 text-[11px] leading-relaxed list-disc pl-4 ${mutedTextClasses}`}>
                  {section.details.map((detail) => (
                    <li key={`${section.id}-${detail}`}>{detail}</li>
                  ))}
                </ul>
              )}
              <div className="space-y-2">
                {section.images.map((imageName) => (
                  <img
                    key={`${section.id}-${imageName}`}
                    src={`${BASE_URL}images/${imageName}`}
                    alt={`${section.title} tutorial`}
                    className="w-full h-44 sm:h-52 object-cover rounded-lg border border-white/20"
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

export default TutorialPanel;
