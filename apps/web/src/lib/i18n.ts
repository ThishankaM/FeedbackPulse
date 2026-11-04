import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import es from '../locales/es.json';

const supportedLanguages = ['en', 'es'] as const;

function getInitialLanguage() {
  if (typeof window === 'undefined') return 'en';

  let savedLanguage: string | null = null;
  try {
    savedLanguage = window.localStorage.getItem('feedbackpulse-language');
  } catch {
    // Storage can be unavailable in private browsing; detect from navigator instead.
  }
  if (savedLanguage && supportedLanguages.includes(savedLanguage as (typeof supportedLanguages)[number])) {
    return savedLanguage;
  }

  return window.navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  supportedLngs: supportedLanguages,
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

i18n.on('languageChanged', (language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('feedbackpulse-language', language);
    } catch {
      // Language still changes for the session when storage is unavailable.
    }
  }
});

export default i18n;
