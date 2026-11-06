import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDot,
  Inbox,
  MessageCircle,
  MousePointer2,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';

export interface FeaturesSectionProps {
  onGetStarted: () => void;
}

function BoardVisual() {
  const { t } = useTranslation();
  const cards = [
    ['darkMode', '342', '#e8efff', '#2657c8'],
    ['digest', '268', '#ffefe5', '#a34b12'],
    ['exportCsv', '194', '#e7f8eb', '#19783a'],
  ];

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[26px] bg-[#e9edff] p-5 sm:p-8">
      <div className="absolute -right-16 -top-20 size-64 rounded-full bg-[#91a7ff]/45 blur-3xl" />
      <div className="absolute -bottom-20 -left-12 size-56 rounded-full bg-white/55 blur-2xl" />
      <div className="relative mx-auto mt-8 max-w-[560px] overflow-hidden rounded-[18px] bg-white fp-card-shadow">
        <div className="flex items-center justify-between border-b border-black/[0.07] px-5 py-4">
          <div>
            <p className="text-[10px] font-medium text-[#96969c]">{t('landing.visuals.board.eyebrow')}</p>
            <p className="mt-0.5 text-[15px] font-bold tracking-[-0.03em] text-[#161618]">
              {t('landing.visuals.board.title')}
            </p>
          </div>
          <button className="flex items-center gap-1 rounded-lg bg-[#0d44e8] px-2.5 py-1.5 text-[8px] font-bold text-white">
            <Plus className="size-2.5" />
            {t('landing.visuals.board.submit')}
          </button>
        </div>
        <div className="flex items-center gap-2 border-b border-black/[0.05] px-5 py-2.5">
          <Search className="size-3 text-[#a2a2a8]" />
          <span className="text-[9px] text-[#9a9aa0]">{t('landing.visuals.board.search')}</span>
          <span className="ml-auto flex items-center gap-1 text-[8px] font-semibold text-[#6d6d74]">
            {t('feedback.filter.top')}
            <ChevronDown className="size-2.5" />
          </span>
        </div>
        <div className="space-y-2 p-3">
          {cards.map(([titleKey, votes, bg, color]) => (
            <div
              key={titleKey}
              className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-[#fbfbfa] p-3"
            >
              <div className="flex w-9 shrink-0 flex-col items-center rounded-lg border border-black/[0.08] bg-white py-1.5">
                <span className="text-[8px] text-[#85858b]">▲</span>
                <span className="text-[10px] font-extrabold">{votes}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold text-[#242429]">
                  {t(`landing.visuals.board.cards.${titleKey}`)}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 text-[7px] font-bold"
                    style={{ backgroundColor: bg, color }}
                  >
                    {t('landing.visuals.board.request')}
                  </span>
                  <span className="flex items-center gap-1 text-[7px] text-[#9a9aa0]">
                    <MessageCircle className="size-2.5" />
                    {t('landing.visuals.board.replies', { count: Math.floor(Number(votes) / 11) })}
                  </span>
                </div>
              </div>
              <ArrowUpRight className="ml-auto size-3.5 text-[#b2b2b7]" />
            </div>
          ))}
        </div>
      </div>
      <div className="relative -mt-3 ml-auto mr-2 w-fit rounded-xl border border-black/[0.08] bg-[#161618] px-3 py-2 text-white shadow-xl sm:mr-8">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-[#ffe3d1] text-[8px] font-bold text-[#9a4515]">MC</span>
          <div>
            <p className="text-[8px] font-bold">{t('landing.visuals.board.voted')}</p>
            <p className="mt-0.5 text-[7px] text-white/45">{t('landing.visuals.board.justNow')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoadmapVisual() {
  const { t } = useTranslation();
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[26px] bg-[#fff0e7] p-5 sm:p-8">
      <div className="absolute -bottom-28 -right-10 size-72 rounded-full bg-[#ffb58d]/35 blur-3xl" />
      <div className="relative mx-auto mt-7 max-w-[580px] rounded-[18px] border border-black/[0.06] bg-[#fdfbf9] p-4 fp-card-shadow">
        <div className="flex items-center justify-between px-1 pb-4">
          <div>
            <p className="text-[9px] font-medium text-[#9a9aa0]">{t('landing.visuals.roadmap.eyebrow')}</p>
            <p className="text-[15px] font-bold tracking-[-0.03em] text-[#161618]">
              {t('landing.visuals.roadmap.title')}
            </p>
          </div>
          <div className="flex -space-x-1.5">
            {['MC', 'AK', 'JL'].map((person, index) => (
              <span
                key={person}
                className={`grid size-6 place-items-center rounded-full border-2 border-[#fdfbf9] text-[6px] font-bold ${
                  index === 0
                    ? 'bg-[#dbe5ff] text-[#2657c8]'
                    : index === 1
                      ? 'bg-[#ffe3d1] text-[#9a4515]'
                      : 'bg-[#e0f4e5] text-[#19783a]'
                }`}
              >
                {person}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              titleKey: 'planned',
              tone: 'bg-[#f1f1ef]',
              dot: 'bg-[#8c8c92]',
              items: [['customerSegments', 86], ['slackIntegration', 73]],
            },
            {
              titleKey: 'inProgress',
              tone: 'bg-[#e9efff]',
              dot: 'bg-[#0d44e8]',
              items: [['roadmapRedesign', 214], ['aiSummaries', 168]],
            },
            {
              titleKey: 'shipped',
              tone: 'bg-[#e8f7eb]',
              dot: 'bg-[#27a14f]',
              items: [['publicChangelog', 402], ['widgetEmbed', 319]],
            },
          ].map((column) => (
            <div key={column.titleKey} className={`rounded-xl p-2 ${column.tone}`}>
              <div className="flex items-center gap-1.5 px-1 py-1.5">
                <span className={`size-1.5 rounded-full ${column.dot}`} />
                <span className="text-[8px] font-bold text-[#4d4d53]">
                  {t(`landing.visuals.roadmap.${column.titleKey}`)}
                </span>
              </div>
              <div className="space-y-1.5">
                {column.items.map(([titleKey, votes]) => (
                  <div key={String(titleKey)} className="rounded-lg bg-white p-2 shadow-sm">
                    <p className="text-[8px] font-bold leading-snug text-[#2d2d32]">
                      {t(`landing.visuals.roadmap.items.${titleKey}`)}
                    </p>
                    <p className="mt-2 text-[7px] font-semibold text-[#9a9aa0]">▲ {votes}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="relative -mt-2 ml-2 flex w-fit items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3 py-2 shadow-lg sm:ml-7">
        <span className="grid size-7 place-items-center rounded-full bg-[#e8f7eb] text-[#19783a]">
          <Check className="size-3.5" />
        </span>
        <div>
          <p className="text-[8px] font-bold text-[#161618]">{t('landing.visuals.roadmap.updatePublished')}</p>
          <p className="text-[7px] text-[#97979d]">
            {t('landing.visuals.roadmap.customersNotified', { count: 214 })}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoopVisual() {
  const { t } = useTranslation();
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[26px] bg-[#e8f7ec] p-5 sm:p-8">
      <div className="absolute -left-20 -top-20 size-64 rounded-full bg-[#9cddb0]/45 blur-3xl" />
      <div className="relative mx-auto mt-5 max-w-[560px] space-y-3">
        <div className="rounded-[18px] border border-black/[0.07] bg-white p-4 fp-card-shadow">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-[#0d44e8] text-white">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-[9px] font-bold text-[#161618]">{t('landing.visuals.loop.digestTitle')}</p>
                <p className="text-[7px] text-[#9a9aa0]">{t('landing.visuals.loop.readTime')}</p>
              </div>
            </div>
            <span className="rounded-full bg-[#e9f8ed] px-2 py-1 text-[7px] font-bold text-[#19783a]">
              {t('landing.visuals.loop.new')}
            </span>
          </div>
          <div className="py-5">
            <p className="text-[16px] font-bold tracking-[-0.03em] text-[#161618]">
              {t('landing.visuals.loop.headline')}
            </p>
            <p className="mt-2 max-w-[430px] text-[9px] leading-relaxed text-[#7c7c82]">
              {t('landing.visuals.loop.description')}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {['filters', 'search', 'roadmap'].map((itemKey, index) => (
                <div key={itemKey} className="rounded-lg bg-[#f6f6f4] p-2">
                  <span className="mb-3 block size-3 rounded-full bg-[#0d44e8]" style={{ opacity: 1 - index * 0.22 }} />
                  <p className="text-[8px] font-bold text-[#44444a]">
                    {t(`landing.visuals.loop.${itemKey}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#f7f7f5] px-3 py-2.5">
            <span className="text-[8px] font-semibold text-[#6f6f75]">{t('landing.visuals.loop.useful')}</span>
            <div className="flex gap-1">
              <span className="rounded-md bg-white px-2 py-1 text-[8px] shadow-sm">👍</span>
              <span className="rounded-md bg-white px-2 py-1 text-[8px] shadow-sm">👎</span>
            </div>
          </div>
        </div>
        <div className="ml-auto w-fit rounded-xl border border-black/[0.08] bg-[#161618] px-3 py-2 text-white shadow-xl">
          <p className="text-[8px] font-bold">{t('landing.visuals.loop.customersReplied')}</p>
          <p className="mt-0.5 text-[7px] text-white/45">{t('landing.visuals.loop.smarter')}</p>
        </div>
      </div>
    </div>
  );
}

const showcaseRows = [
  {
    key: 'capture',
    visual: BoardVisual,
  },
  {
    key: 'prioritize',
    visual: RoadmapVisual,
    reverse: true,
  },
  {
    key: 'loop',
    visual: LoopVisual,
  },
];

export function FeaturesSection({ onGetStarted }: FeaturesSectionProps) {
  const { t } = useTranslation();
  const smallCards = [
    { key: 'source', icon: Inbox },
    { key: 'priorities', icon: CircleDot },
    { key: 'teams', icon: Users },
    { key: 'ai', icon: Sparkles },
  ];

  return (
    <section id="features" className="relative border-t border-black/[0.06] py-24 dark:border-white/10 sm:py-32">
      <div className="fp-landing-shell">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#eef2ff] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0d44e8] dark:bg-[#7595ff]/12 dark:text-[#93acff]">
            <MousePointer2 className="size-3.5" />
            {t('landing.features.eyebrow')}
          </div>
          <h2 className="fp-section-title mt-5 text-[40px] text-[#161618] dark:text-white sm:text-[54px]">
            {t('landing.features.title')}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] font-medium leading-[1.7] text-[#6b6b72] dark:text-white/55 sm:text-[18px]">
            {t('landing.features.description')}
          </p>
        </div>

        <div className="mt-20 space-y-24 sm:mt-24 sm:space-y-32">
          {showcaseRows.map((row) => {
            const Visual = row.visual;
            return (
              <article
                key={row.key}
                className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                  row.reverse ? 'lg:[&>*:first-child]:order-2' : ''
                }`}
              >
                <div className="max-w-[470px]">
                  <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#0d44e8] dark:text-[#87a3ff]">
                    {t(`landing.features.rows.${row.key}.eyebrow`)}
                  </p>
                  <h3 className="fp-section-title mt-3 text-[34px] text-[#161618] dark:text-white sm:text-[44px]">
                    {t(`landing.features.rows.${row.key}.title`)}
                  </h3>
                  <p className="mt-5 text-[15px] font-medium leading-[1.75] text-[#6c6c73] dark:text-white/55 sm:text-[17px]">
                    {t(`landing.features.rows.${row.key}.description`)}
                  </p>
                  <div className="mt-7 space-y-3.5">
                    {(t(`landing.features.rows.${row.key}.points`, { returnObjects: true }) as string[]).map((point) => (
                      <div key={point} className="flex items-center gap-3 text-[13px] font-semibold text-[#44444a]">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#eef2ff] text-[#0d44e8] dark:bg-[#6e8fff]/15 dark:text-[#8aa5ff]">
                          <Check className="size-3 stroke-[2.5]" />
                        </span>
                        <span className="dark:text-white/72">{point}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={onGetStarted}
                    className="mt-7 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#0d44e8] transition-all hover:gap-2.5 dark:text-[#8ca6ff]"
                  >
                    {t('landing.features.explore')}
                    <ArrowRight className="size-4" />
                  </button>
                </div>
                <Visual />
              </article>
            );
          })}
        </div>

        <div className="mt-24 grid gap-3 sm:mt-32 sm:grid-cols-2 lg:grid-cols-4">
          {smallCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.key}
                className="rounded-[20px] border border-black/[0.07] bg-[#f7f7f5] p-5 transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-[#111114]"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-white text-[#0d44e8] shadow-sm ring-1 ring-black/[0.06] dark:bg-white/10 dark:text-[#8aa5ff] dark:ring-white/10">
                  <Icon className="size-4" />
                </span>
                <h3 className="mt-5 text-[14px] font-bold tracking-[-0.02em] text-[#161618] dark:text-white">
                  {t(`landing.features.small.${feature.key}.title`)}
                </h3>
                <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#74747b] dark:text-white/48">
                  {t(`landing.features.small.${feature.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            onClick={onGetStarted}
            className="h-11 rounded-xl bg-[#161618] px-5 text-[13px] font-bold text-white shadow-none hover:bg-black dark:bg-white dark:text-[#161618] dark:hover:bg-white/88"
          >
            {t('landing.features.build')}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
