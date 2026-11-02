import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './lib/i18n';
import { ThemeProvider } from './context/ThemeProvider';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="feedbackpulse-theme">
      <App />
    </ThemeProvider>
  </StrictMode>
);
