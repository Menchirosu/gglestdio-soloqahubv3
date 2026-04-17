import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Bug, Lightbulb, BookOpen, Sparkles, ArrowRight, MessageCircle, Clock, Users } from 'lucide-react';
import { Screen, BugStory, Tip, Proposal, Achievement } from '../types';
import { timeAgo } from '../utils/timeAgo';

interface OverviewScreenProps {
  onNavigate: (screen: Screen) => void;
  onShare: () => void;
  bugs: BugStory[];
  tips: Tip[];
  proposals: Proposal[];
  achievements: Achievement[];
  searchQuery: string;
  activeUsers: { uid: string; displayName: string; photoURL: string }[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  screen,
  onNavigate,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  screen: Screen;
  onNavigate: (s: Screen) => void;
  delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay, ease: [0.25, 0, 0, 1] }}
      onClick={() => onNavigate(screen)}
      className="flex flex-col gap-3 rounded-[8px] border border-border bg-card p-4 text-left hover:-translate-y-0.5 transition-transform"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-secondary">
          <Icon size={14} className="text-muted-foreground" />
        </div>
        <ArrowRight size={13} className="text-muted-foreground/40" />
      </div>
      <div>
        <p className="text-[24px] text-foreground tabular-nums" style={{ fontWeight: 620, letterSpacing: '-0.03em' }}>
          {value}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{label}</p>
      </div>
    </motion.button>
  );
}

interface ActivityItem {
  id: string;
  type: 'bug' | 'tip' | 'proposal' | 'achievement';
  title: string;
  author: string;
  date: string;
  createdAt?: any;
}

export function OverviewScreen({
  onNavigate,
  bugs,
  tips,
  proposals,
  achievements,
  activeUsers,
}: OverviewScreenProps) {
  const openBugs = bugs.length;
  const tipsCount = tips.length;
  const proposalsCount = proposals.length;
  const achievementsCount = achievements.length;

  const needsAttention = useMemo(() => {
    return bugs
      .filter(b => !b.comments || b.comments.length === 0)
      .slice(0, 4);
  }, [bugs]);

  const activityFeed = useMemo((): ActivityItem[] => {
    const toMs = (item: any): number => {
      const v = item.createdAt;
      if (!v) return new Date(item.date ?? 0).getTime();
      if (typeof v.toMillis === 'function') return v.toMillis();
      if (v.seconds) return v.seconds * 1000;
      return new Date(v).getTime();
    };

    const all: ActivityItem[] = [
      ...bugs.map(b => ({ id: b.id, type: 'bug' as const, title: b.title, author: b.isAnonymous ? 'Anonymous' : b.author, date: b.date, createdAt: b.createdAt })),
      ...tips.map(t => ({ id: t.id, type: 'tip' as const, title: t.title, author: t.author, date: t.date ?? t.time, createdAt: t.createdAt })),
      ...proposals.map(p => ({ id: p.id, type: 'proposal' as const, title: p.title, author: p.author, date: p.date, createdAt: p.createdAt })),
      ...achievements.map(a => ({ id: a.id, type: 'achievement' as const, title: a.title, author: a.author, date: a.date, createdAt: a.createdAt })),
    ];

    return all.sort((a, b) => toMs(b) - toMs(a)).slice(0, 20);
  }, [bugs, tips, proposals, achievements]);

  const activityMeta: Record<string, { icon: React.ElementType; label: string; screen: Screen; color: string }> = {
    bug: { icon: Bug, label: 'Bug story', screen: 'bug-wall', color: 'text-[var(--signal-warning)]' },
    tip: { icon: Lightbulb, label: 'Tip', screen: 'tips-tricks', color: 'text-primary' },
    proposal: { icon: BookOpen, label: 'Knowledge post', screen: 'knowledge-sharing', color: 'text-primary' },
    achievement: { icon: Sparkles, label: 'Achievement', screen: 'achievements', color: 'text-primary' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] text-foreground" style={{ fontWeight: 590, letterSpacing: '-0.03em' }}>
          Overview
        </h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">What needs attention now.</p>
      </div>

      {/* Stat counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Bug} label="Bug stories" value={openBugs} screen="bug-wall" onNavigate={onNavigate} delay={0.04} />
        <StatCard icon={Lightbulb} label="Tips shared" value={tipsCount} screen="tips-tricks" onNavigate={onNavigate} delay={0.08} />
        <StatCard icon={BookOpen} label="Knowledge posts" value={proposalsCount} screen="knowledge-sharing" onNavigate={onNavigate} delay={0.12} />
        <StatCard icon={Sparkles} label="Achievements" value={achievementsCount} screen="achievements" onNavigate={onNavigate} delay={0.16} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Needs Attention */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] text-foreground" style={{ fontWeight: 590 }}>Needs Attention</h2>
            <button
              onClick={() => onNavigate('bug-wall')}
              className="text-[12px] text-primary hover:underline focus-visible:outline-none"
            >
              View queue →
            </button>
          </div>

          {needsAttention.length === 0 ? (
            <div className="page-empty">
              <p className="text-[13px] text-muted-foreground">All bugs have activity.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {needsAttention.map((bug, i) => (
                <motion.button
                  key={bug.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 + i * 0.04 }}
                  onClick={() => onNavigate('bug-wall')}
                  className="w-full rounded-[8px] border border-border bg-card p-3 text-left hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] text-foreground leading-snug line-clamp-2" style={{ fontWeight: 510 }}>
                      {bug.title}
                    </p>
                    <ChevronRight size={13} className="shrink-0 mt-0.5 text-muted-foreground/40" />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Clock size={10} />
                      {timeAgo(bug.createdAt ?? bug.date)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageCircle size={10} />
                      no comments
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Active members */}
          {activeUsers.length > 0 && (
            <div className="mt-4">
              <h2 className="text-[13px] text-foreground mb-2" style={{ fontWeight: 590 }}>
                Online now
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {activeUsers.slice(0, 8).map(u => (
                  <div key={u.uid} className="relative" title={u.displayName}>
                    <img
                      src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}
                      alt={u.displayName}
                      className="h-7 w-7 rounded-full border border-border object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full bg-green-500 ring-1 ring-background" />
                  </div>
                ))}
                {activeUsers.length > 8 && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-secondary text-[10px] text-muted-foreground">
                    +{activeUsers.length - 8}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Global activity stream */}
        <div className="lg:col-span-3 space-y-2">
          <h2 className="text-[13px] text-foreground" style={{ fontWeight: 590 }}>Activity Stream</h2>

          {activityFeed.length === 0 ? (
            <div className="page-empty">
              <Users size={18} className="mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">No activity yet. Post something to get started.</p>
            </div>
          ) : (
            <div className="rounded-[8px] border border-border bg-card overflow-hidden">
              {activityFeed.map((item, i) => {
                const meta = activityMeta[item.type];
                const Icon = meta.icon;
                return (
                  <motion.button
                    key={`${item.type}-${item.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: 0.05 + i * 0.02 }}
                    onClick={() => onNavigate(meta.screen)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-border/60 last:border-0 hover:bg-secondary/20 transition-colors"
                  >
                    <div className={`shrink-0 ${meta.color}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[12px] text-foreground" style={{ fontWeight: 510 }}>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.author} · {meta.label}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground/60">
                      {timeAgo(item.createdAt ?? item.date)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// re-export ChevronRight for inline use
function ChevronRight({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
