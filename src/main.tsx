import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { TactileThemeProvider } from './context/TactileThemeContext';

// Register PWA Service Worker
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TactileThemeProvider defaultTheme="astro-neu" defaultFont="tech-modern">
      <App />
    </TactileThemeProvider>
  </StrictMode>,
);
