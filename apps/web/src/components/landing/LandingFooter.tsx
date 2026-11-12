import { Activity, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const currentYear = new Date().getFullYear();

const footerColumns = [
  {
    titleKey: 'landing.footer.product',
    links: ['feedbackBoards', 'roadmap', 'changelog', 'widgets'],
  },
  {
    titleKey: 'landing.footer.company',
    links: ['about', 'customers', 'careers', 'contact'],
  },
  {
    titleKey: 'landing.footer.resources',
    links: ['help', 'updates', 'guide', 'status'],
  },
  {
    titleKey: 'landing.footer.legal',
    links: ['privacy', 'terms', 'security', 'dpa'],
  },
];

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="px-3 pb-3 pt-14 text-[#161618] dark:text-white">
      <div className="fp-landing-shell pb-12">
        <div className="grid gap-12 border-b border-black/[0.08] pb-12 dark:border-white/10 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <a href="#" className="flex w-fit items-center gap-2.5" aria-label={t('landing.nav.brandHome')}>
              <span className="grid size-9 place-items-center rounded-[11px] bg-[#0d44e8] text-white">
                <Activity className="size-5 stroke-[2.7]" />
              </span>
              <span className="text-[17px] font-extrabold tracking-[-0.045em]">{t('nav.brand')}</span>
            </a>
            <p className="mt-4 max-w-xs text-[13px] font-medium leading-[1.7] text-[#5f6068] dark:text-white/70">
              {t('landing.footer.description')}
            </p>
            <a
              href="mailto:hello@feedbackpulse.dev"
              className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#0d44e8]"
            >
              hello@feedbackpulse.dev
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-7 sm:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.titleKey}>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#62636b] dark:text-white/68">{t(column.titleKey)}</h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-[12px] font-semibold text-[#4f5058] transition-colors hover:text-[#0d44e8] dark:text-white/78 dark:hover:text-[#a9bbff]">
                        {t(`landing.footer.links.${link}`)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-6 text-[11px] font-medium text-[#66676f] dark:text-white/62 sm:flex-row">
          <p>{t('landing.footer.rights', { year: currentYear })}</p>
          <div className="flex items-center gap-5">
            <span>{t('landing.footer.madeFor')}</span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#2ab65a]" />
              {t('landing.footer.operational')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
