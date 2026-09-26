import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { PerformanceProvider } from './contexts/PerformanceContext';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PerformanceProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </PerformanceProvider>
  </React.StrictMode>
);