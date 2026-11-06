import { useEffect, useState, type MouseEvent } from 'react';
import { Activity, ArrowRight, Languages, Menu, Moon, Sun, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { useTheme } from '../../context/ThemeProvider';

export interface LandingNavbarProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  onGoToDashboard?: () => void;
  isLoggedIn?: boolean;
}

const navItems = [
  { labelKey: 'landing.nav.product', href: '#product' },
  { labelKey: 'landing.nav.solutions', href: '#solutions' },
  { labelKey: 'landing.nav.pricing', href: '#pricing' },
  { labelKey: 'landing.nav.resources', href: '#resources' },
];

export function LandingNavbar({
  onSignIn,
  onGetStarted,
  onGoToDashboard,
  isLoggedIn,
}: LandingNavbarProps) {
  const { t, i18n } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('product');
  const language = i18n.resolvedLanguage?.startsWith('es') ? 'es' : 'en';
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((section): section is HTMLElement => Boolean(section));

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (current?.target.id) {
          setActiveSection(current.target.id);
        }
      },
      { rootMargin: '-88px 0px -58% 0px', threshold: [0, 0.1, 0.35] }
    );

    sections.forEach((section) => observer.observe(section));

    const syncFromHash = () => {
      const id = window.location.hash.replace('#', '');
      if (!navItems.some((item) => item.href === `#${id}`)) return;
      setActiveSection(id);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);

    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, []);

  const toggleLanguage = () => {
    void i18n.changeLanguage(language === 'en' ? 'es' : 'en');
  };

  const toggleTheme = () => {
    setTheme(nextTheme);
  };

  const navigateToSection = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    window.history.pushState(null, '', href);
    setActiveSection(id);
    setIsOpen(false);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="flex h-[66px] w-full items-center justify-between bg-white/55 px-5 shadow-[0_10px_35px_-16px_rgba(22,22,24,0.24),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl backdrop-saturate-150 dark:bg-[#0c0c0f]/72 dark:shadow-[0_10px_35px_-16px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.07)] sm:px-8 lg:px-10">
        <a href="#" className="flex items-center gap-2.5" aria-label={t('landing.nav.brandHome')}>
          <span className="grid size-9 place-items-center rounded-[11px] bg-[#0d44e8] text-white shadow-[0_5px_15px_-6px_rgba(13,68,232,0.8)]">
            <Activity className="size-5 stroke-[2.7]" />
          </span>
          <span className="text-[17px] font-extrabold tracking-[-0.045em] text-[#161618] dark:text-white">
            {t('nav.brand')}
          </span>
        </a>

        <nav className="hidden items-center rounded-xl bg-[#f4f4f2] p-1 dark:bg-white/[0.06] lg:flex">
          {navItems.map((item) => (
            <a
              key={item.labelKey}
              href={item.href}
              onClick={(event) => navigateToSection(event, item.href)}
              aria-current={activeSection === item.href.slice(1) ? 'location' : undefined}
              data-active={activeSection === item.href.slice(1)}
              className="fp-nav-link rounded-lg px-3.5 py-2 text-[13px] font-semibold text-[#66666d] transition-colors hover:bg-white hover:text-[#161618] hover:shadow-sm dark:text-white/58 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {t(item.labelKey)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={t('landing.nav.toggleLanguage')}
            title={t('landing.nav.toggleLanguage')}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-black/[0.06] bg-white/55 px-2.5 text-[11px] font-bold text-[#4f4f55] transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Languages className="size-3.5" />
            {language.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t('landing.nav.toggleTheme', {
              theme: t(`common.theme.${nextTheme}`).toLowerCase(),
            })}
            title={t('landing.nav.toggleTheme', {
              theme: t(`common.theme.${nextTheme}`).toLowerCase(),
            })}
            className="grid size-9 place-items-center rounded-xl border border-black/[0.06] bg-white/55 text-[#4f4f55] transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          {isLoggedIn ? (
            <Button
              onClick={onGoToDashboard}
              className="h-10 rounded-xl bg-[#161618] px-4 text-[13px] font-bold text-white shadow-none hover:bg-black dark:bg-white dark:text-[#161618] dark:hover:bg-white/88"
            >
              {t('landing.nav.dashboard')}
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          ) : (
            <>
              <button
                onClick={onSignIn}
                className="rounded-xl px-3.5 py-2 text-[13px] font-semibold text-[#66666d] transition-colors hover:bg-[#f3f3f1] hover:text-[#161618] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {t('landing.nav.logIn')}
              </button>
              <Button
                onClick={onGetStarted}
                className="h-10 rounded-xl bg-[#0d44e8] px-4 text-[13px] font-bold text-white shadow-none hover:bg-[#0836c4]"
              >
                {t('landing.nav.startFree')}
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={isOpen ? t('landing.nav.closeMenu') : t('landing.nav.openMenu')}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="grid size-10 place-items-center rounded-xl bg-[#f3f3f1] text-[#161618] dark:bg-white/10 dark:text-white sm:hidden"
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="mx-3 mt-2 rounded-[20px] bg-white/90 p-3 shadow-xl backdrop-blur-2xl dark:bg-[#111114]/92 sm:hidden">
          <nav className="grid gap-1">
            {navItems.map((item) => (
              <a
                key={item.labelKey}
                href={item.href}
                onClick={(event) => navigateToSection(event, item.href)}
                aria-current={activeSection === item.href.slice(1) ? 'location' : undefined}
                data-active={activeSection === item.href.slice(1)}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-[#4f4f55] hover:bg-[#f4f4f2] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {t(item.labelKey)}
              </a>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/[0.07] pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f3f3f1] text-[13px] font-semibold text-[#161618] dark:bg-white/10 dark:text-white"
            >
              <Languages className="size-4" />
              {language.toUpperCase()}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f3f3f1] text-[13px] font-semibold text-[#161618] dark:bg-white/10 dark:text-white"
            >
              {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {t(`common.theme.${nextTheme}`)}
            </button>
            <Button
              variant="outline"
              onClick={isLoggedIn ? onGoToDashboard : onSignIn}
              className="h-11 rounded-xl border-black/10 text-[13px] font-semibold text-[#161618] dark:border-white/10 dark:text-white"
            >
              {isLoggedIn ? t('landing.nav.dashboard') : t('landing.nav.logIn')}
            </Button>
            <Button
              onClick={onGetStarted}
              className="h-11 rounded-xl bg-[#0d44e8] text-[13px] font-bold text-white hover:bg-[#0836c4]"
            >
              {t('landing.nav.startFree')}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
