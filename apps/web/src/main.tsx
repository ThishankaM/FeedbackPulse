import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './lib/i18n';
import { ThemeProvider } from './context/ThemeProvider';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/toast';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="feedbackpulse-theme">
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
