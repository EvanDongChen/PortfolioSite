import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import PixelApp from './PixelApp';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { PerformanceProvider } from './contexts/PerformanceContext';
import './index.css';

// The pixel reef is the default page; the aquarium is fetched only when
// someone switches to it.
const App = lazy(() => import('./App'));

const Page: React.FC = () => {
  const { isPixelMode } = useTheme();
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
