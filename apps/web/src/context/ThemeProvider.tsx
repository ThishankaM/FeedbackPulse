import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    finished: Promise<unknown>;
    skipTransition: () => void;
  };
};

const FALLBACK_TRANSITION_MS = 200;
const FALLBACK_CLEANUP_MS = FALLBACK_TRANSITION_MS + 20;

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system';
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(storageKey: string, fallback: Theme): Theme {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isTheme(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function applyThemeToDOM(resolved: ResolvedTheme) {
  const root = window.document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.classList.toggle('light', resolved === 'light');
  if (root.style.colorScheme !== resolved) {
    root.style.colorScheme = resolved;
  }
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  resolvedTheme: 'light',
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'feedbackpulse-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme(storageKey, defaultTheme));
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  const appliedThemeRef = useRef<ResolvedTheme | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const transitionTokenRef = useRef(0);

  const applyTheme = useCallback((next: ResolvedTheme) => {
    if (appliedThemeRef.current === next) return;
    appliedThemeRef.current = next;

    const root = window.document.documentElement;

    // Respect the OS preference: switch without snapshot or transitions.
    if (prefersReducedMotion()) {
      applyThemeToDOM(next);
      return;
    }

    // Preferred path: a single compositor-driven cross-fade instead of
    // animating colors on every element in the document.
    const transitionDocument = window.document as ViewTransitionDocument;
    if (typeof transitionDocument.startViewTransition === 'function') {
      const token = ++transitionTokenRef.current;
      root.classList.add('theme-switching');

      const transition = transitionDocument.startViewTransition(() => {
        applyThemeToDOM(next);
      });

      const cleanup = () => {
        if (transitionTokenRef.current === token) {
          root.classList.remove('theme-switching');
        }
      };
      transition.finished.then(cleanup, cleanup);
      return;
    }

    // Fallback for browsers without View Transitions: a short, color-only
    // transition scoped to the temporary theme-transition class.
    root.classList.add('theme-transition');
    applyThemeToDOM(next);

    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
    }
    fallbackTimerRef.current = window.setTimeout(() => {
      root.classList.remove('theme-transition');
      fallbackTimerRef.current = null;
    }, FALLBACK_CLEANUP_MS);
  }, []);

  // The inline bootstrap script in index.html already applies the theme before
  // first paint; this keeps React state and the DOM in sync on mount.
  useLayoutEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    appliedThemeRef.current = resolved;
    applyThemeToDOM(resolved);

    return () => {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
      }
      window.document.documentElement.classList.remove('theme-transition', 'theme-switching');
    };
    // Mount-only sync with the inline bootstrap script.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      const resolved = resolveTheme(newTheme);
      try {
        window.localStorage.setItem(storageKey, newTheme);
      } catch {
        // Storage can be unavailable in private browsing; the in-memory theme still applies.
      }

      applyTheme(resolved);
      setThemeState(newTheme);
    },
    [applyTheme, storageKey]
  );

  // Follow OS changes while "system" is selected.
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const next = getSystemTheme();
      setSystemTheme(next);
      applyTheme(next);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme;
  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme]
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
