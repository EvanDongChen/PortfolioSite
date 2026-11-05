import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import PixelApp from './PixelApp';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { PerformanceProvider } from './contexts/PerformanceContext';
import { loadAquarium, loadPond, loadShrine } from './lib/pageLoaders';
import './index.css';

// The pixel reef is the default page; the aquarium, the pond and the shrine are fetched
// only when someone switches to them.
const App = lazy(loadAquarium);
const PondApp = lazy(loadPond);
const ShrineApp = lazy(loadShrine);

const Page: React.FC = () => {
  const { isPixelMode, isPondMode, isShrineMode } = useTheme();
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
