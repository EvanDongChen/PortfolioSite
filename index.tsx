import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { PerformanceProvider } from './contexts/PerformanceContext';
import './index.css';

// The pixel ecosystem is its own page, fetched only when someone switches to it.
const PixelApp = lazy(() => import('./PixelApp'));

const Page: React.FC = () => {
  const { isPixelMode } = useTheme();
  if (!isPixelMode) return <App />;
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020b24]" />}>
      <PixelApp />
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