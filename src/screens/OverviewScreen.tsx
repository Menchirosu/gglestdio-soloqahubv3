import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Icon } from '@iconify/react';
import { Screen, BugStory, Tip, Proposal, Achievement } from '../types';
import { timeAgo } from '../utils/timeAgo';

/**
 * Lumie Overview — the identity-defining screen.
 *
 * Anchored on three locked decisions:
 *   Q5  Newsreader italic reserved for hero + big numbers + whispers
 *   Q8  Progress/Closure hook = primary, streak chip = secondary
 *   Q9  Stale-tolerant snapshot with a drift-detection pill
 *
 * Animation budget (Q6: <=3 per screen):
 *   1. Hero + tile stagger on mount
 *   2. Closure progress bar fill on mount
 *   3. Hover lift on stat tiles
 */

interface OverviewScreenProps {
  onNavigate: (screen: Screen) => void;
  onShare: () => void;
  bugs: BugStory[];
  tips: Tip[];
  proposals: Proposal[];
  achievements: Achievement[];
  searchQuery: string;
  activeUsers: { uid: string; displayName: string; photoURL: string }[];
  userName: string;
}

interface ActivityItem {
  id: string;
  type: 'bug' | 'tip' | 'proposal' | 'achievement';
  title: string;
  author: string;
  date: string;
  createdAt?: any;
}

const toMs = (item: any): number => {
  const v = item?.createdAt;
  if (!v) return new Date(item?.date ?? 0).getTime();
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (v.seconds) return v.seconds * 1000;
  return new Date(v).getTime();
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Friendly greeting by time-of-day. */
function timeOfDayGreeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return 'Late tonight';
  if (h < 12) return 'This morning';
  if (h < 17) return 'This afternoon';
  if (h < 21) return 'This evening';
  return 'Tonight';
}

/** First word of a display name, or a warm fallback. */
function firstName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0];
}

export function OverviewScreen({
  onNavigate,
  bugs,
  tips,
  proposals,
  achievements,
  activeUsers,
  userName,
}: OverviewScreenProps) {
  const reduceMotion = useReducedMotion();

  // --- Q9: stale-tolerant snapshot + drift pill --------------------------
  // Freeze the total signal count at first paint. Anything over that is "new."
  const initialSignalCount = useRef<number | null>(null);
  const liveSignalCount = bugs.length + tips.length + proposals.length + achievements.length;
  if (initialSignalCount.current === null) {
    initialSignalCount.current = liveSignalCount;
  }
  const drift = Math.max(0, liveSignalCount - initialSignalCount.current);

  // --- Q8 addiction hook: closure progress -------------------------------
  // Honest derivation: in the past 7 days, how many bugs gained at least one
  // comment (= "moving") out of all bugs posted that week. No fake status field.
  const { closureNumerator, closureDenominator, closurePct } = useMemo(() => {
    const since = Date.now() - WEEK_MS;
    const recent = bugs.filter(b => toMs(b) >= since);
    const moving = recent.filter(b => (b.comments?.length ?? 0) > 0).length;
    const denom = recent.length;
    const pct = denom === 0 ? 0 : Math.round((moving / denom) * 100);
    return { closureNumerator: moving, closureDenominator: denom, closurePct: pct };
  }, [bugs]);

  // --- Q8 secondary: activity streak -------------------------------------
  // Consecutive days (ending today) with at least one post anywhere.
  const streakDays = useMemo(() => {
    const activeDays = new Set<string>();
    const pushDay = (ts: number) => {
      const d = new Date(ts);
      activeDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    };
    [...bugs, ...tips, ...proposals, ...achievements].forEach(item => pushDay(toMs(item)));

    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 30; i++) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
      if (activeDays.has(key)) {
        streak += 1;
        cursor.setTime(cursor.getTime() - DAY_MS);
      } else {
        break;
      }
    }
    return streak;
  }, [bugs, tips, proposals, achievements]);

  // --- Stat counters (with last-week deltas shown subtly) ----------------
  const weekAgo = Date.now() - WEEK_MS;
  const recentBugs = bugs.filter(b => toMs(b) >= weekAgo).length;
  const recentTips = tips.filter(t => toMs(t) >= weekAgo).length;
  const recentProposals = proposals.filter(p => toMs(p) >= weekAgo).length;
  const recentAchievements = achievements.filter(a => toMs(a) >= weekAgo).length;

  // --- Needs Attention: bugs with zero comments --------------------------
  const needsAttention = useMemo(() => {
    return bugs
      .filter(b => !b.comments || b.comments.length === 0)
      .sort((a, b) => toMs(b) - toMs(a))
      .slice(0, 4);
  }, [bugs]);

  // --- Activity stream ---------------------------------------------------
  const activityFeed = useMemo((): ActivityItem[] => {
    const all: ActivityItem[] = [
      ...bugs.map(b => ({ id: b.id, type: 'bug' as const, title: b.title, author: b.isAnonymous ? 'Anonymous' : b.author, date: b.date, createdAt: b.createdAt })),
      ...tips.map(t => ({ id: t.id, type: 'tip' as const, title: t.title, author: t.author, date: t.date ?? t.time, createdAt: t.createdAt })),
      ...proposals.map(p => ({ id: p.id, type: 'proposal' as const, title: p.title, author: p.author, date: p.date, createdAt: p.createdAt })),
      ...achievements.map(a => ({ id: a.id, type: 'achievement' as const, title: a.title, author: a.author, date: a.date, createdAt: a.createdAt })),
    ];
    return all.sort((a, b) => toMs(b) - toMs(a)).slice(0, 16);
  }, [bugs, tips, proposals, achievements]);

  const activityMeta: Record<
    ActivityItem['type'],
    { icon: string; label: string; screen: Screen; tint: string }
  > = {
    bug: { icon: 'solar:bug-bold-duotone', label: 'Bug story', screen: 'bug-wall', tint: 'text-[var(--signal-warning)]' },
    tip: { icon: 'solar:lightbulb-bolt-bold-duotone', label: 'Tip', screen: 'tips-tricks', tint: 'text-[var(--terracotta)]' },
    proposal: { icon: 'solar:book-bookmark-bold-duotone', label: 'Knowledge post', screen: 'knowledge-sharing', tint: 'text-[var(--terracotta)]' },
    achievement: { icon: 'solar:star-shine-bold-duotone', label: 'Achievement', screen: 'achievements', tint: 'text-[var(--sage)]' },
  };

  // Progress bar fill target — we animate width from 0 to this.
  const [progressFill, setProgressFill] = useState(reduceMotion ? closurePct : 0);
  useEffect(() => {
    if (reduceMotion) {
      setProgressFill(closurePct);
      return;
    }
    const t = setTimeout(() => setProgressFill(closurePct), 120);
    return () => clearTimeout(t);
  }, [closurePct, reduceMotion]);

  const now = new Date();
  const greeting = `${timeOfDayGreeting(now)}, ${firstName(userName)}.`;

  // Conversational line — tied to what actually needs attention.
  const conversationalLine = useMemo(() => {
    if (needsAttention.length === 0 && recentBugs === 0) {
      return 'The queue is clear. This is a good moment to look ahead.';
    }
    if (needsAttention.length === 1) {
      return '1 bug story is waiting for its first read.';
    }
    if (needsAttention.length > 1) {
      return `${needsAttention.length} bug stories are waiting for their first read.`;
    }
    return 'The queue has moved. Nothing stalled yet.';
  }, [needsAttention.length, recentBugs]);

  const stagger = reduceMotion ? 0 : 0.05;

  return (
    <div className="space-y-8">
      {/* ========================================================
       *  Hero — conversational, serif italic, Q5/Q8
       * ====================================================== */}
      <section className="relative">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0, 0, 1] }}
          className="flex items-start justify-between gap-4"
        >
          <div className="min-w-0">
            <p className="page-kicker">Overview</p>
            <h1 className="page-title-serif mt-2 text-[44px] sm:text-[56px]">
              {greeting}
            </h1>
            <p className="mt-3 max-w-xl text-[15px] text-muted-foreground leading-relaxed">
              {conversationalLine}
            </p>
          </div>

          {/* Drift pill (Q9) — only renders if count grew since arrival */}
          {drift > 0 && (
            <motion.button
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: stagger * 6 }}
              onClick={() => {
                initialSignalCount.current = liveSignalCount;
              }}
              title="Sync snapshot"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[rgba(200,105,72,0.24)] bg-[rgba(200,105,72,0.08)] px-3 py-1.5 text-[12px] text-[var(--terracotta)] hover:bg-[rgba(200,105,72,0.14)] transition-colors"
            >
              <Icon icon="solar:refresh-bold-duotone" width={13} aria-hidden />
              <span>{drift} new since you arrived</span>
            </motion.button>
          )}
        </motion.div>

        {/* Streak chip — secondary, quiet */}
        {streakDays >= 2 && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: stagger * 4 }}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-[var(--frame)] px-3 py-1 text-[12px] text-muted-foreground"
          >
            <Icon icon="solar:fire-bold-duotone" width={13} className="text-[var(--terracotta)]" aria-hidden />
            <span>
              {streakDays}-day streak
              <span className="whisper ml-1.5 text-[12px]">keep it going</span>
            </span>
          </motion.div>
        )}
      </section>

      {/* ========================================================
       *  Closure hook — Q8 primary addiction surface
       * ====================================================== */}
      {closureDenominator > 0 && (
        <section className="page-panel px-6 py-5">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="page-kicker">Queue is moving</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                <span className="whisper text-[14px]">{closureNumerator} of {closureDenominator}</span>{' '}
                bugs posted this week have gained a reply.
              </p>
            </div>
            <p
              className="shrink-0 font-serif italic tabular-nums text-[40px] leading-none text-[var(--foreground)]"
              aria-label={`${closurePct} percent`}
            >
              {closurePct}
              <span className="ml-0.5 text-[20px] text-muted-foreground not-italic">%</span>
            </p>
          </div>
          <div
            className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-low)]"
            role="progressbar"
            aria-valuenow={closurePct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <motion.div
              initial={{ width: reduceMotion ? `${closurePct}%` : '0%' }}
              animate={{ width: `${progressFill}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.85, ease: [0.25, 0, 0, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-[var(--terracotta)] to-[var(--sage)]"
            />
          </div>
        </section>
      )}

      {/* ========================================================
       *  Stat tiles — big serif numbers, Iconify Solar icons
       * ====================================================== */}
      <section
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        aria-label="This week at a glance"
      >
        <StatTile
          icon="solar:bug-bold-duotone"
          label="Bug stories"
          value={bugs.length}
          delta={recentBugs}
          screen="bug-wall"
          onNavigate={onNavigate}
          index={0}
          stagger={stagger}
        />
        <StatTile
          icon="solar:lightbulb-bolt-bold-duotone"
          label="Tips shared"
          value={tips.length}
          delta={recentTips}
          screen="tips-tricks"
          onNavigate={onNavigate}
          index={1}
          stagger={stagger}
        />
        <StatTile
          icon="solar:book-bookmark-bold-duotone"
          label="Knowledge"
          value={proposals.length}
          delta={recentProposals}
          screen="knowledge-sharing"
          onNavigate={onNavigate}
          index={2}
          stagger={stagger}
        />
        <StatTile
          icon="solar:star-shine-bold-duotone"
          label="Recognition"
          value={achievements.length}
          delta={recentAchievements}
          screen="achievements"
          onNavigate={onNavigate}
          index={3}
          stagger={stagger}
        />
      </section>

      {/* ========================================================
       *  Two-column lower layout
       * ====================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Needs Attention */}
        <section className="lg:col-span-2 space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[13px] text-foreground" style={{ fontWeight: 590 }}>
              Needs attention
            </h2>
            <button
              onClick={() => onNavigate('bug-wall')}
              className="text-[12px] text-[var(--terracotta)] hover:underline focus-visible:outline-none"
            >
              View queue
              <Icon icon="solar:arrow-right-linear" width={11} className="ml-0.5 inline-block" aria-hidden />
            </button>
          </div>

          {needsAttention.length === 0 ? (
            <div className="page-empty">
              <p className="whisper text-[18px]">Nothing is stalled.</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Every bug has activity.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {needsAttention.map(bug => (
                <button
                  key={bug.id}
                  onClick={() => onNavigate('bug-wall')}
                  className="w-full rounded-[12px] border border-border bg-[var(--frame)] p-3.5 text-left transition-colors hover:border-[rgba(200,105,72,0.24)] hover:bg-[#FBF9F3]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] text-foreground leading-snug line-clamp-2" style={{ fontWeight: 520 }}>
                      {bug.title}
                    </p>
                    <Icon
                      icon="solar:arrow-right-linear"
                      width={13}
                      className="shrink-0 mt-0.5 text-muted-foreground/50"
                      aria-hidden
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Icon icon="solar:clock-circle-linear" width={11} aria-hidden />
                      {timeAgo(bug.createdAt ?? bug.date)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon icon="solar:chat-round-dots-linear" width={11} aria-hidden />
                      no replies yet
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeUsers.length > 0 && (
            <div className="pt-2">
              <h2 className="mb-2 text-[13px] text-foreground" style={{ fontWeight: 590 }}>
                Online now
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {activeUsers.slice(0, 8).map(u => (
                  <div key={u.uid} className="relative" title={u.displayName}>
                    <img
                      src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}
                      alt={u.displayName}
                      className="h-7 w-7 rounded-full border border-border object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full bg-[var(--sage)] ring-1 ring-[var(--frame)]" />
                  </div>
                ))}
                {activeUsers.length > 8 && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-[var(--surface-low)] text-[10px] text-muted-foreground">
                    +{activeUsers.length - 8}
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Activity Stream */}
        <section className="lg:col-span-3 space-y-3">
          <h2 className="text-[13px] text-foreground" style={{ fontWeight: 590 }}>
            Activity stream
          </h2>

          {activityFeed.length === 0 ? (
            <div className="page-empty">
              <p className="whisper text-[18px]">A quiet space.</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Post something to get the stream moving.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-border bg-[var(--frame)]">
              {activityFeed.map(item => {
                const meta = activityMeta[item.type];
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => onNavigate(meta.screen)}
                    className="flex w-full items-center gap-3 border-b border-border/60 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-[#FBF9F3]"
                  >
                    <Icon icon={meta.icon} width={15} className={`shrink-0 ${meta.tint}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] text-foreground" style={{ fontWeight: 520 }}>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.author} · {meta.label}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground/60 tabular-nums">
                      {timeAgo(item.createdAt ?? item.date)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Stat tile — big serif italic number, Iconify icon, hover lift.
// ----------------------------------------------------------------------------
function StatTile({
  icon,
  label,
  value,
  delta,
  screen,
  onNavigate,
  index,
  stagger,
}: {
  icon: string;
  label: string;
  value: number;
  delta: number;
  screen: Screen;
  onNavigate: (s: Screen) => void;
  index: number;
  stagger: number;
}) {
  return (
    <motion.button
      initial={stagger === 0 ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: stagger * (index + 1), ease: [0.25, 0, 0, 1] }}
      whileHover={{ y: -2 }}
      onClick={() => onNavigate(screen)}
      className="group flex flex-col justify-between gap-4 rounded-[16px] border border-border bg-[var(--frame)] p-5 text-left shadow-[0_1px_2px_rgba(26,23,20,0.04)] transition-shadow hover:shadow-[0_4px_14px_rgba(26,23,20,0.08)]"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--surface-low)]">
          <Icon icon={icon} width={18} className="text-[var(--terracotta)]" aria-hidden />
        </div>
        <Icon
          icon="solar:arrow-right-linear"
          width={13}
          className="mt-1 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--terracotta)]"
          aria-hidden
        />
      </div>
      <div>
        <p className="font-serif italic tabular-nums text-[36px] leading-none text-foreground">
          {value}
        </p>
        <p className="mt-2 flex items-baseline gap-2 text-[12px] text-muted-foreground">
          <span>{label}</span>
          {delta > 0 && (
            <span className="text-[11px] text-[var(--terracotta)]" aria-label={`${delta} new this week`}>
              +{delta} this week
            </span>
          )}
        </p>
      </div>
    </motion.button>
  );
}
