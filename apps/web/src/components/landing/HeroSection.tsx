import { ArrowRight, Check, Play, Sparkles, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { ProductPreview } from './ProductPreview';

export interface HeroSectionProps {
  onGetStarted: () => void;
}

const customerLogos = [
  { name: 'Northstar', mark: 'N' },
  { name: 'Chapter', mark: 'C' },
  { name: 'Almanac', mark: 'A' },
  { name: 'Orbit', mark: 'O' },
  { name: 'Nimbus', mark: 'N' },
  { name: 'Coastline', mark: 'C' },
];

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  const { t } = useTranslation();

  return (
    <section id="product" className="relative overflow-hidden pb-24 pt-16 sm:pt-20 lg:pb-32">
      <div className="fp-hero-glow" />
      <div className="fp-dot-field pointer-events-none absolute inset-x-0 top-0 h-[780px] opacity-55" />

      <div className="fp-landing-shell relative">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">

          <h1 className="fp-display fp-hero-heading fp-reveal fp-reveal-delay-1 mt-8 max-w-[1000px] text-[48px] sm:text-[68px] lg:text-[84px]">
            {t('landing.hero.title')}
            <br className="hidden sm:block" /> {t('landing.hero.titleAccent')}
          </h1>

          <p className="fp-reveal fp-reveal-delay-2 mt-6 max-w-2xl text-[16px] font-medium leading-[1.7] text-[#66666d] dark:text-white/58 sm:text-[18px]">
            {t('landing.hero.description')}
          </p>

          <div className="fp-reveal fp-reveal-delay-3 mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Button
              onClick={onGetStarted}
              className="h-12 w-full rounded-[14px] bg-[#0d44e8] px-6 text-[14px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(13,68,232,0.7)] hover:bg-[#0836c4] sm:w-auto"
            >
              {t('landing.hero.primaryCta')}
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-12 w-full rounded-[14px] border-black/[0.1] bg-white px-5 text-[14px] font-bold !text-[#161618] shadow-sm hover:bg-[#f7f7f5] dark:border-white/12 dark:bg-white/[0.08] dark:!text-white dark:hover:bg-white/[0.12] sm:w-auto"
            >
              <span className="mr-2 grid size-6 place-items-center rounded-full bg-[#f0f0ee] dark:bg-white/10">
                <Play className="ml-0.5 size-2.5 fill-[#161618] dark:fill-white" />
              </span>
              {t('landing.hero.secondaryCta')}
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-semibold text-[#85858b] dark:text-white/45">
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-[#0d44e8]" />
              {t('landing.hero.freePlan')}
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-[#0d44e8]" />
              {t('landing.hero.noCard')}
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="size-3.5 fill-[#ff8b4a] text-[#ff8b4a]" />
              {t('landing.hero.lovedBy')}
            </span>
          </div>
        </div>

        <div className="relative mt-16 sm:mt-20 lg:mt-24">
          <div className="absolute -left-8 top-16 hidden rounded-2xl border border-black/[0.08] bg-white p-3 text-left shadow-xl dark:border-white/10 dark:bg-[#151519] lg:block fp-float">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-[#e9f8ed] text-[#147536]">
                <Check className="size-4" />
              </span>
              <div>
                <p className="text-[11px] font-bold text-[#161618] dark:text-white">{t('landing.hero.floatingShipped')}</p>
                <p className="mt-0.5 text-[9px] text-[#88888e] dark:text-white/45">{t('landing.hero.floatingNotified')}</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-5 bottom-14 hidden rounded-2xl border border-black/[0.08] bg-white p-3 text-left shadow-xl dark:border-white/10 dark:bg-[#151519] xl:block">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9a9aa0]">{t('landing.hero.floatingInsight')}</p>
            <p className="mt-1.5 max-w-[150px] text-[11px] font-bold leading-snug text-[#161618] dark:text-white">
              {t('landing.hero.floatingInsightText')}
            </p>
            <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-[#0d44e8]">
              <Sparkles className="size-3" />
              {t('landing.hero.floatingRequests')}
            </div>
          </div>
          <ProductPreview />
        </div>

        <div className="mt-20 text-center sm:mt-24">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9a9aa0]">
            {t('landing.hero.logosLabel')}
          </p>
          <div className="relative mt-7 overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent dark:from-[#08080a]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent dark:from-[#08080a]" />
            <div className="fp-logo-track flex w-max items-center">
              {[...customerLogos, ...customerLogos].map((logo, index) => (
                <div
                  key={`${logo.name}-${index}`}
                  className="flex w-[170px] items-center justify-center gap-2 text-[17px] font-bold tracking-[-0.04em] text-[#9b9ba1] dark:text-white/32"
                >
                  <span className="grid size-6 place-items-center rounded-md border border-[#d7d7db] text-[10px] font-extrabold text-[#85858b] dark:border-white/15 dark:text-white/38">
                    {logo.mark}
                  </span>
                  {logo.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
