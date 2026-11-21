import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import PixelApp from './pages/PixelApp';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { PerformanceProvider } from './contexts/PerformanceContext';
import { loadAquarium, loadPond, loadShrine, loadSky, loadSpace, loadHotpot } from './lib/pageLoaders';
import './index.css';

// The pixel reef is the default page; the aquarium, the pond and the shrine are fetched
// only when someone switches to them.
const App = lazy(loadAquarium);
const PondApp = lazy(loadPond);
const ShrineApp = lazy(loadShrine);
const SpaceApp = lazy(loadSpace);
const SkyApp = lazy(loadSky);
const HotpotApp = lazy(loadHotpot);

const Page: React.FC = () => {
  const { isPixelMode, isPondMode, isShrineMode, isSpaceMode, isSkyMode, isHotpotMode } = useTheme();
  if (isHotpotMode) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#1e0406]" />}>
        <HotpotApp />
      </Suspense>
    );
  }
  if (isSkyMode) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#7eb8ea]" />}>
        <SkyApp />
      </Suspense>
    );
  }
  if (isSpaceMode) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#04030a]" />}>
        <SpaceApp />
      </Suspense>
    );
  }
  if (isShrineMode) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#0a1022]" />}>
        <ShrineApp />
      </Suspense>
    );
  }
  if (isPondMode) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#0b1a14]" />}>
        <PondApp />
      </Suspense>
    );
  }
  if (isPixelMode) return <PixelApp />;
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#000428]" />}>
      <App />
    </Suspense>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PerformanceProvider>
      <ThemeProvider>
        <Page />
      </ThemeProvider>
    </PerformanceProvider>
  </React.StrictMode>
);
