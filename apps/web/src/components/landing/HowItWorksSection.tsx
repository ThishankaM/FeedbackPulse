import {
  BarChart3,
  BellRing,
  Blocks,
  Check,
  FileText,
  Globe2,
  Layers3,
  LockKeyhole,
  MessageSquare,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const smallFeatures = [
  {
    key: 'setup',
    icon: Zap,
  },
  {
    key: 'embed',
    icon: Blocks,
  },
  {
    key: 'brand',
    icon: Palette,
  },
  {
    key: 'secure',
    icon: ShieldCheck,
  },
];

export function HowItWorksSection() {
  const { t } = useTranslation();
  const trendingThemes = t('landing.platform.themes', { returnObjects: true }) as string[];

  return (
    <section id="solutions" className="bg-[#f4f4f1] py-24 dark:bg-[#0b0b0e] sm:py-32">
      <div className="fp-landing-shell">
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#0d44e8] dark:text-[#86a2ff]">
              {t('landing.platform.eyebrow')}
            </p>
            <h2 className="fp-section-title mt-4 text-[40px] text-[#161618] dark:text-white sm:text-[54px]">
              {t('landing.platform.title')}
            </h2>
          </div>
          <p className="max-w-md text-[14px] font-medium leading-[1.7] text-[#6d6d74] dark:text-white/54 sm:text-[16px]">
            {t('landing.platform.description')}
          </p>
        </div>

        <div className="mt-14 grid gap-3 md:grid-cols-2 lg:grid-cols-12">
          <div className="relative min-h-[430px] overflow-hidden rounded-[24px] bg-[#161618] p-7 text-white lg:col-span-7 lg:row-span-2 lg:p-9">
            <div className="absolute -right-20 -top-24 size-80 rounded-full bg-[#0d44e8]/45 blur-3xl" />
            <div className="relative max-w-lg">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/75">
                <Sparkles className="size-3" />
                {t('landing.platform.aiBadge')}
              </span>
              <h3 className="fp-section-title mt-5 text-[34px] leading-[1.08] text-white sm:text-[40px]">
                {t('landing.platform.aiTitle')}
              </h3>
              <p className="mt-4 max-w-md text-[14px] font-medium leading-[1.7] text-white/55">
                {t('landing.platform.aiDescription')}
              </p>
            </div>

            <div className="relative mt-10 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[18px] border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/45">{t('landing.platform.trending')}</p>
                  <Sparkles className="size-3.5 text-[#8ca6ff]" />
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    [trendingThemes[0], '92%', 'w-[92%]'],
                    [trendingThemes[1], '76%', 'w-[76%]'],
                    [trendingThemes[2], '61%', 'w-[61%]'],
                  ].map(([label, value, width]) => (
                    <div key={label}>
                      <div className="mb-1.5 flex justify-between text-[9px] font-semibold text-white/72">
                        <span>{label}</span>
                        <span>{value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full bg-[#7696ff] ${width}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/55">
                  <BarChart3 className="size-3.5 text-[#91a8ff]" />
                  {t('landing.platform.thisWeek')}
                </div>
                <p className="mt-5 text-[32px] font-bold tracking-[-0.05em]">{t('landing.platform.growth')}</p>
                <p className="mt-1 text-[9px] leading-relaxed text-white/38">
                  {t('landing.platform.growthDescription')}
                </p>
                <div className="mt-5 flex h-14 items-end gap-1.5">
                  {[34, 46, 31, 62, 51, 77, 92, 68, 84, 100].map((height, index) => (
                    <span
                      key={index}
                      className="flex-1 rounded-t-sm bg-[#4a72f0]"
                      style={{ height: `${height}%`, opacity: 0.4 + index * 0.05 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative min-h-[208px] overflow-hidden rounded-[24px] bg-[#ffefe4] p-6 lg:col-span-5">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-[#c15a19] shadow-sm">
              <BellRing className="size-4.5" />
            </span>
            <h3 className="mt-5 text-[19px] font-bold tracking-[-0.03em] text-[#161618]">{t('landing.platform.neverMissTitle')}</h3>
            <p className="mt-2 max-w-sm text-[12px] font-medium leading-relaxed text-[#775f52]">
              {t('landing.platform.neverMissDescription')}
            </p>
            <div className="absolute bottom-5 right-5 rounded-xl border border-black/[0.06] bg-white px-3 py-2 shadow-lg">
              <p className="text-[8px] font-bold text-[#161618]">{t('landing.platform.enterpriseCustomer')}</p>
              <p className="mt-0.5 text-[7px] text-[#96969c]">{t('landing.platform.votedRoadmap')}</p>
            </div>
          </div>

          <div className="relative min-h-[208px] overflow-hidden rounded-[24px] bg-[#e8f3ff] p-6 lg:col-span-5">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-[#0d44e8] shadow-sm">
              <Globe2 className="size-4.5" />
            </span>
            <h3 className="mt-5 text-[19px] font-bold tracking-[-0.03em] text-[#161618]">{t('landing.platform.syncTitle')}</h3>
            <p className="mt-2 max-w-sm text-[12px] font-medium leading-relaxed text-[#536a86]">
              {t('landing.platform.syncDescription')}
            </p>
            <div className="absolute -bottom-8 -right-7 flex size-32 items-center justify-center rounded-full border-[18px] border-white/70 text-[#0d44e8]">
              <Users className="size-8" />
            </div>
          </div>

          {smallFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.key}
                className="rounded-[24px] border border-black/[0.06] bg-white p-6 transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-[#151519] lg:col-span-3"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[#f2f4ff] text-[#0d44e8] dark:bg-[#7c99ff]/15 dark:text-[#90a9ff]">
                  <Icon className="size-4.5" />
                </span>
                <h3 className="mt-5 text-[16px] font-bold tracking-[-0.025em] text-[#161618] dark:text-white">
                  {t(`landing.platform.cards.${feature.key}.title`)}
                </h3>
                <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#74747b] dark:text-white/48">
                  {t(`landing.platform.cards.${feature.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 rounded-[24px] border border-black/[0.06] bg-white p-5 dark:border-white/10 dark:bg-[#151519] sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MessageSquare, key: 'feedback' },
            { icon: FileText, key: 'changelog' },
            { icon: Layers3, key: 'workspaces' },
            { icon: LockKeyhole, key: 'privacy' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="flex items-center gap-2.5 rounded-xl bg-[#f7f7f5] px-3 py-3 dark:bg-white/[0.05]">
                <Icon className="size-4 text-[#0d44e8]" />
                <span className="text-[12px] font-bold text-[#4d4d53] dark:text-white/70">{t(`landing.platform.checks.${item.key}`)}</span>
                <Check className="ml-auto size-3.5 text-[#1e9144]" />
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[12px] font-semibold text-[#8b8b91] dark:text-white/42">
          <span className="flex items-center gap-2"><Rocket className="size-4" /> {t('landing.platform.launch')}</span>
          <span className="flex items-center gap-2"><ShieldCheck className="size-4" /> {t('landing.platform.privacy')}</span>
          <span className="flex items-center gap-2"><Zap className="size-4" /> {t('landing.platform.scale')}</span>
        </div>
      </div>
    </section>
  );
}
