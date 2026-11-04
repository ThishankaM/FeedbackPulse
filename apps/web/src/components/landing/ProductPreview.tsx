import {
  Bell,
  Check,
  ChevronDown,
  CircleDot,
  FileText,
  Inbox,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Inbox', icon: Inbox },
  { label: 'Roadmap', icon: CircleDot },
  { label: 'Changelog', icon: FileText },
  { label: 'Customers', icon: Users },
];

const feedbackCards = [
  {
    title: 'Let customers follow topics they care about',
    label: 'Product updates',
    votes: 328,
    comments: 24,
    avatar: 'MC',
    avatarTone: 'bg-[#dbe5ff] text-[#2750b5]',
    tagTone: 'bg-[#e8f2ff] text-[#2255c7]',
  },
  {
    title: 'Add a compact view for the public roadmap',
    label: 'Roadmap',
    votes: 214,
    comments: 18,
    avatar: 'AK',
    avatarTone: 'bg-[#ffeadb] text-[#a4460c]',
    tagTone: 'bg-[#fff1e7] text-[#a4460c]',
  },
  {
    title: 'Notify me when an idea ships',
    label: 'Notifications',
    votes: 186,
    comments: 12,
    avatar: 'JL',
    avatarTone: 'bg-[#e5f7e9] text-[#187a38]',
    tagTone: 'bg-[#e8f8ec] text-[#187a38]',
  },
];

export function ProductPreview() {
  return (
    <div className="fp-product-shadow overflow-hidden rounded-[20px] bg-[#f8f8f6] text-left dark:bg-[#111114]" aria-hidden="true">
      <div className="flex h-11 items-center justify-between border-b border-white/10 bg-[#17171a] px-4 text-white">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="hidden min-w-72 items-center justify-center gap-2 rounded-lg bg-white/[0.07] px-4 py-1.5 text-[10px] font-medium text-white/58 sm:flex">
          <Search className="size-3" />
          Search feedback, customers, and releases
          <span className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[8px] text-white/35">
            ⌘ K
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="grid size-7 place-items-center rounded-lg bg-white/[0.07] text-white/55" aria-label="Notifications">
            <Bell className="size-3.5" />
          </button>
          <div className="grid size-7 place-items-center rounded-full bg-[#0d44e8] text-[9px] font-bold text-white">
            FP
          </div>
        </div>
      </div>

      <div className="flex h-[420px] sm:h-[520px]">
        <aside className="hidden w-[184px] shrink-0 flex-col bg-[#1b1b20] p-3 text-white sm:flex">
          <div className="flex items-center gap-2 border-b border-white/10 px-2 pb-3.5">
            <div className="grid size-7 place-items-center rounded-[9px] bg-[#0d44e8]">
              <MessageCircle className="size-4 fill-white" />
            </div>
            <span className="text-[12px] font-extrabold tracking-[-0.03em]">
              FeedbackPulse
            </span>
            <ChevronDown className="ml-auto size-3.5 text-white/35" />
          </div>
          <div className="mt-4 px-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/30">
            Workspace
          </div>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[10px] font-medium ${
                    item.active
                      ? 'bg-white/[0.1] text-white'
                      : 'text-white/48'
                  }`}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                  {item.label === 'Inbox' && (
                    <span className="ml-auto rounded-full bg-[#0d44e8] px-1.5 text-[8px] leading-4 text-white">
                      12
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.05] p-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold">
              <Sparkles className="size-3.5 text-[#6d92ff]" />
              AI insights
            </div>
            <p className="mt-1.5 text-[8px] leading-relaxed text-white/38">
              23 requests are trending this week.
            </p>
            <div className="mt-2.5 flex items-center gap-1 text-[8px] font-semibold text-[#7ea0ff]">
              Review insights
              <span aria-hidden="true">→</span>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden bg-[#f7f7f5] p-4 dark:bg-[#111114] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-medium text-[#8a8a90] dark:text-white/38">
                <span>Workspace</span>
                <span>/</span>
                <span>Feedback</span>
              </div>
              <h3 className="mt-1.5 text-[18px] font-bold tracking-[-0.04em] text-[#161618] dark:text-white sm:text-[22px]">
                Customer feedback
              </h3>
              <p className="mt-1 text-[9px] text-[#8a8a90] dark:text-white/38">
                Capture the signal. Build what matters.
              </p>
            </div>
            <button className="flex items-center gap-1.5 rounded-lg bg-[#0d44e8] px-2.5 py-2 text-[9px] font-bold text-white shadow-sm">
              <Plus className="size-3" />
              <span className="hidden sm:inline">New feedback</span>
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              { label: 'New this week', value: '128', change: '+18%', icon: Inbox },
              { label: 'Votes collected', value: '2,481', change: '+24%', icon: TrendingUp },
              { label: 'Ideas shipped', value: '36', change: '+8%', icon: Check },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-xl border border-black/[0.07] bg-white p-2.5 dark:border-white/10 dark:bg-[#19191d] sm:p-3">
                  <div className="flex items-center justify-between text-[8px] font-medium text-[#8a8a90] dark:text-white/38">
                    <span className="truncate">{metric.label}</span>
                    <Icon className="size-3 text-[#b1b1b6]" />
                  </div>
                  <div className="mt-1.5 flex items-end gap-1.5">
                    <span className="text-[15px] font-bold tracking-[-0.03em] text-[#161618] dark:text-white sm:text-[18px]">
                      {metric.value}
                    </span>
                    <span className="mb-0.5 rounded bg-[#e9f8ed] px-1 py-0.5 text-[7px] font-bold text-[#1a8b3b] dark:bg-[#1b6a35]/30 dark:text-[#67d88d]">
                      {metric.change}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {['All feedback', 'Recently active'].map((tab, index) => (
                <span
                  key={tab}
                  className={`rounded-lg px-2.5 py-1.5 text-[8px] font-semibold ${
                    index === 0
                      ? 'bg-white text-[#161618] shadow-sm ring-1 ring-black/[0.06] dark:bg-white/10 dark:text-white dark:ring-white/10'
                      : 'text-[#8a8a90] dark:text-white/38'
                  }`}
                >
                  {tab}
                </span>
              ))}
            </div>
            <MoreHorizontal className="size-4 text-[#a1a1a6] dark:text-white/35" />
          </div>

          <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
            {feedbackCards.map((card, index) => (
              <div
                key={card.title}
                className={`rounded-xl border border-black/[0.07] bg-white p-2.5 dark:border-white/10 dark:bg-[#19191d] sm:p-3 ${
                  index === 2 ? 'hidden md:block' : ''
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex w-8 shrink-0 flex-col items-center rounded-lg border border-black/[0.08] bg-[#fafaf9] py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
                    <span className="text-[7px] text-[#7b7b82] dark:text-white/35">▲</span>
                    <span className="text-[9px] font-extrabold text-[#161618] dark:text-white">{card.votes}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`rounded px-1.5 py-0.5 text-[7px] font-bold ${card.tagTone}`}>
                      {card.label}
                    </span>
                    <p className="mt-1.5 text-[10px] font-semibold leading-snug text-[#242429] dark:text-white/82 sm:text-[11px]">
                      {card.title}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-[8px] text-[#96969c] dark:text-white/35">
                      <span className={`grid size-5 place-items-center rounded-full text-[6px] font-bold ${card.avatarTone}`}>
                        {card.avatar}
                      </span>
                      <MessageCircle className="size-2.5" />
                      {card.comments} comments
                      <span className="ml-auto">2h ago</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
