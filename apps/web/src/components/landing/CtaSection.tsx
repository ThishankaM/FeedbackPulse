import { ArrowRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';

export interface CtaSectionProps {
  onGetStarted: () => void;
}

export function CtaSection({ onGetStarted }: CtaSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="px-3 py-6 sm:py-8">
      <div className="relative mx-auto max-w-[1232px] overflow-hidden rounded-[28px] bg-[#161618] px-6 py-16 text-center text-white sm:px-10 sm:py-20">
        <div className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="absolute -left-24 -top-32 size-96 rounded-full bg-[#0d44e8]/45 blur-[110px]" />
        <div className="absolute -bottom-48 -right-20 size-96 rounded-full bg-[#ff6e3d]/20 blur-[110px]" />
        <div className="relative mx-auto max-w-3xl">
          <h2 className="fp-section-title mt-6 text-[42px] leading-[1.02] text-white sm:text-[62px]">
            {t('landing.cta.title')}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] font-medium leading-[1.7] text-white/55 sm:text-[17px]">
            {t('landing.cta.description')}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              onClick={onGetStarted}
              className="h-12 w-full rounded-[14px] bg-white px-6 text-[14px] font-bold text-[#161618] shadow-none hover:bg-[#f0f0ee] sm:w-auto"
            >
              {t('landing.cta.start')}
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-12 w-full rounded-[14px] border border-white/15 bg-white/10 px-6 text-[14px] font-bold text-white shadow-none hover:bg-white/15 sm:w-auto"
            >
              {t('landing.cta.pricing')}
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[10px] font-semibold text-white/40">
            <span className="flex items-center gap-1.5"><Check className="size-3.5 text-[#7f9eff]" /> {t('landing.cta.freePlan')}</span>
            <span className="flex items-center gap-1.5"><Check className="size-3.5 text-[#7f9eff]" /> {t('landing.cta.setup')}</span>
            <span className="flex items-center gap-1.5"><Check className="size-3.5 text-[#7f9eff]" /> {t('landing.cta.noCard')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
