import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';

export interface PricingSectionProps {
  onSelectPlan: (plan: string) => void;
}

const plans = [
  {
    key: 'starter',
    id: 'free',
    monthly: 0,
    annual: 0,
  },
  {
    key: 'pro',
    id: 'pro',
    monthly: 19,
    annual: 15,
    popular: true,
  },
  {
    key: 'scale',
    id: 'scale',
    monthly: 49,
    annual: 39,
  },
];

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const { t } = useTranslation();
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="border-y border-black/[0.06] bg-[#f5f5f2] py-24 dark:border-white/10 dark:bg-[#0b0b0e] sm:py-32">
      <div className="fp-landing-shell">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="fp-section-title mt-5 text-[40px] text-[#161618] dark:text-white sm:text-[54px]">
            {t('landing.pricing.title')}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] font-medium leading-[1.7] text-[#6b6b72] dark:text-white/55">
            {t('landing.pricing.description')}
          </p>

          <div className="mt-8 inline-flex items-center rounded-xl border border-black/[0.08] bg-white p-1 shadow-sm dark:border-white/10 dark:bg-[#151519]">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-lg px-3.5 py-2 text-[12px] font-bold transition-all ${
                !annual ? 'bg-[#161618] text-white shadow-sm dark:bg-white dark:text-[#161618]' : 'text-[#727278] dark:text-white/50'
              }`}
            >
              {t('landing.pricing.monthly')}
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`rounded-lg px-3.5 py-2 text-[12px] font-bold transition-all ${
                annual ? 'bg-[#161618] text-white shadow-sm dark:bg-white dark:text-[#161618]' : 'text-[#727278] dark:text-white/50'
              }`}
            >
              {t('landing.pricing.yearly')}
              <span className="ml-1.5 text-[9px] font-extrabold text-[#1a9444] dark:text-[#5fe08b]">{t('landing.pricing.save')}</span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl items-stretch gap-3 lg:grid-cols-3">
          {plans.map((plan) => {
            const price = annual ? plan.annual : plan.monthly;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-[22px] p-6 sm:p-7 ${
                  plan.popular
                    ? 'bg-[#0d44e8] text-white shadow-[0_24px_55px_-24px_rgba(13,68,232,0.65)] dark:bg-[#264ec8]'
                    : 'border border-black/[0.07] bg-white text-[#161618] dark:border-white/10 dark:bg-[#151519] dark:text-white'
                }`}
              >
                {plan.popular && (
                  <div className="absolute right-5 top-5 rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white">
                    {t('landing.pricing.popular')}
                  </div>
                )}
                <p className={`text-[13px] font-bold ${plan.popular ? 'text-white' : 'text-[#161618] dark:text-white'}`}>
                  {t(`landing.pricing.plans.${plan.key}.name`)}
                </p>
                <p className={`mt-2 min-h-10 max-w-[240px] text-[12px] font-medium leading-relaxed ${plan.popular ? 'text-white/60' : 'text-[#797980] dark:text-white/48'}`}>
                  {t(`landing.pricing.plans.${plan.key}.description`)}
                </p>
                <div className="mt-7 flex items-end gap-1.5">
                  <span className={`text-[44px] font-bold leading-none tracking-[-0.06em] ${plan.popular ? 'text-white' : 'text-[#161618] dark:text-white'}`}>
                    ${price}
                  </span>
                  <span className={`mb-1 text-[11px] font-medium ${plan.popular ? 'text-white/50' : 'text-[#96969c] dark:text-white/40'}`}>
                    {t('landing.pricing.perMonth')}
                  </span>
                </div>
                <p className={`mt-1.5 text-[10px] font-medium ${plan.popular ? 'text-white/45' : 'text-[#a0a0a5] dark:text-white/32'}`}>
                  {annual && price > 0
                    ? t('landing.pricing.billedYearly', { price: price * 12 })
                    : plan.monthly === 0
                      ? t('landing.pricing.freeForever')
                      : t('landing.pricing.billedMonthly')}
                </p>

                <Button
                  onClick={() => onSelectPlan(plan.id)}
                  className={`mt-7 h-11 w-full rounded-xl text-[13px] font-bold shadow-none ${
                    plan.popular
                      ? 'bg-white text-[#0d44e8] hover:bg-[#f0f3ff]'
                      : 'bg-[#161618] text-white hover:bg-black dark:bg-white dark:text-[#161618] dark:hover:bg-white/88'
                  }`}
                >
                  {t(`landing.pricing.plans.${plan.key}.cta`)}
                  <ArrowRight className="ml-2 size-4" />
                </Button>

                <div className={`my-6 h-px ${plan.popular ? 'bg-white/15' : 'bg-black/[0.07] dark:bg-white/10'}`} />
                <p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${plan.popular ? 'text-white/45' : 'text-[#9a9aa0]'}`}>
                  {t('landing.pricing.includes')}
                </p>
                <ul className="mt-4 space-y-3">
                  {(t(`landing.pricing.plans.${plan.key}.features`, { returnObjects: true }) as string[]).map((feature) => (
                    <li key={feature} className={`flex items-center gap-2.5 text-[12px] font-semibold ${plan.popular ? 'text-white/85' : 'text-[#4e4e54] dark:text-white/70'}`}>
                      <span className={`grid size-4.5 shrink-0 place-items-center rounded-full ${plan.popular ? 'bg-white/15 text-white' : 'bg-[#eef2ff] text-[#0d44e8]'}`}>
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[11px] font-medium text-[#8c8c92] dark:text-white/35">
          {t('landing.pricing.trial')}
        </p>
      </div>
    </section>
  );
}
