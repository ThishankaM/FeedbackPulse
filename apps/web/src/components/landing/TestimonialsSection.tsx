import { ArrowRight, Quote, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const testimonials = [
  {
    key: 'maya',
    initials: 'MC',
    tone: 'bg-[#dce6ff] text-[#234eae]',
  },
  {
    key: 'alex',
    initials: 'AK',
    tone: 'bg-[#ffe4d3] text-[#9a4817]',
  },
  {
    key: 'jordan',
    initials: 'JL',
    tone: 'bg-[#def3e4] text-[#1e773c]',
  },
  {
    key: 'priya',
    initials: 'PS',
    tone: 'bg-[#f0e4ff] text-[#7042a5]',
  },
  {
    key: 'noah',
    initials: 'NW',
    tone: 'bg-[#e1f4f2] text-[#23766e]',
  },
  {
    key: 'sofia',
    initials: 'SM',
    tone: 'bg-[#fff0c7] text-[#8a6814]',
  },
];

export function TestimonialsSection() {
  const { t } = useTranslation();

  return (
    <section id="resources" className="py-24 sm:py-32">
      <div className="fp-landing-shell">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#0d44e8] dark:text-[#86a2ff]">{t('landing.testimonials.eyebrow')}</p>
            <h2 className="fp-section-title mt-4 max-w-2xl text-[40px] text-[#161618] dark:text-white sm:text-[54px]">
              {t('landing.testimonials.title')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="size-4 fill-[#f28a4c] text-[#f28a4c]" />
                ))}
              </div>
              <p className="mt-1.5 text-[12px] font-semibold text-[#74747b] dark:text-white/48">
                {t('landing.testimonials.proof')}
              </p>
            </div>
            <a
              href="#pricing"
              className="grid size-10 place-items-center rounded-full border border-black/[0.1] bg-white text-[#161618] transition-transform hover:translate-x-1 dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
              aria-label={t('landing.testimonials.viewPlans')}
            >
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>

        <div className="mt-14 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <figure
              key={testimonial.key}
              className={`flex min-h-[260px] flex-col rounded-[22px] border border-black/[0.07] p-6 ${
                index === 0
                  ? 'bg-[#161618] text-white dark:bg-[#151519]'
                  : index === 2
                    ? 'bg-[#f4f4f1] dark:bg-[#111114]'
                    : 'bg-white dark:bg-[#151519]'
              }`}
            >
              <Quote className={`size-6 ${index === 0 ? 'text-white/30' : 'text-[#c4c4c9]'}`} />
              <blockquote
                className={`mt-5 text-[16px] font-semibold leading-[1.55] tracking-[-0.02em] ${
                  index === 0 ? 'text-white' : 'text-[#2c2c31]'
                }`}
              >
                “{t(`landing.testimonials.items.${testimonial.key}.quote`)}”
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3 pt-8">
                <span className={`grid size-10 place-items-center rounded-full text-[10px] font-extrabold ${testimonial.tone}`}>
                  {testimonial.initials}
                </span>
                <div>
                  <p className={`text-[12px] font-bold ${index === 0 ? 'text-white' : 'text-[#161618] dark:text-white'}`}>
                    {t(`landing.testimonials.items.${testimonial.key}.name`)}
                  </p>
                  <p className={`mt-0.5 text-[10px] font-medium ${index === 0 ? 'text-white/45' : 'text-[#88888e] dark:text-white/42'}`}>
                    {t(`landing.testimonials.items.${testimonial.key}.role`)}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
