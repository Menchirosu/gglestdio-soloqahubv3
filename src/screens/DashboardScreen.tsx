import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  ArrowRight,
  BookOpen,
  Bug,
  Flame,
  Lightbulb,
  MessageSquare,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { Screen, BugStory, Tip, Proposal, Achievement } from '../types';
import { useAuth } from '../AuthContext';
import { db, UserProfile } from '../firebase';
import { LOOKBACK_DAYS, computeQaLeaderboard } from '../utils/qaRanking';
import { timeAgo } from '../utils/timeAgo';

function CountUpNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }

    const duration = 700;
    const start = performance.now();
    const raf = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round((1 - Math.pow(1 - progress, 3)) * value));
      if (progress < 1) requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);
  }, [value]);

  return <span className={className}>{display}</span>;
}

function TypewriterText({ text, delayMs = 0, speedMs = 18 }: { text: string; delayMs?: number; speedMs?: number }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let index = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          clearInterval(interval);
        }
      }, speedMs);
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [text, delayMs, speedMs]);

  return <>{displayed}</>;
}

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  bugs: BugStory[];
  tips: Tip[];
  proposals: Proposal[];
  achievements: Achievement[];
  searchQuery: string;
  activeUsers?: { uid: string; displayName: string; photoURL: string }[];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardScreen({ onNavigate, bugs, tips, proposals, achievements, activeUsers = [] }: DashboardProps) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map((doc) => doc.data() as UserProfile));
    });

    return () => unsubscribeUsers();
  }, []);

  const ranking = computeQaLeaderboard({
    users,
    bugs,
    tips,
    proposals,
    achievements,
  });

  const myRankEntry = profile?.uid ? ranking.find((entry) => entry.user.uid === profile.uid) ?? null : null;
  const myRank = myRankEntry ? ranking.findIndex((entry) => entry.user.uid === myRankEntry.user.uid) + 1 : null;
  const nextRankEntry = myRank && myRank > 1 ? ranking[myRank - 2] ?? null : null;
  const pointsToNextRank =
    myRankEntry && nextRankEntry ? Math.max(nextRankEntry.totalScore - myRankEntry.totalScore + 1, 0) : null;

  const latestActivity = [
    ...bugs.map((bug) => ({
      id: bug.id,
      title: bug.title,
      description: bug.discovery,
      date: bug.date,
      createdAt: bug.createdAt,
      type: 'bug',
      icon: Bug,
      color: 'text-error',
      bg: 'bg-error/10',
      screen: 'bug-wall' as Screen,
    })),
    ...tips.map((tip) => ({
      id: tip.id,
      title: tip.title,
      description: tip.desc,
      date: tip.time,
      createdAt: tip.createdAt,
      type: 'tip',
      icon: Lightbulb,
      color: 'text-primary',
      bg: 'bg-primary/10',
      screen: 'tips-tricks' as Screen,
    })),
    ...proposals.map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      description: proposal.scope,
      date: proposal.date,
      createdAt: proposal.createdAt,
      type: 'proposal',
      icon: BookOpen,
      color: 'text-violet-600',
      bg: 'bg-violet-500/10',
      screen: 'knowledge-sharing' as Screen,
    })),
  ]
    .sort((a, b) => {
      const toMs = (value: string) => (value === 'Just now' ? Date.now() : new Date(value).getTime() || 0);
      return toMs(b.date) - toMs(a.date);
    })
    .slice(0, 6);

  const stats = [
    {
      label: 'Bugs Reported',
      value: bugs.length,
      mine: bugs.filter((bug) => bug.authorId === profile?.uid).length,
      icon: Bug,
      color: 'text-error',
      bg: 'bg-error/10',
      border: 'border-error/20',
      screen: 'bug-wall' as Screen,
    },
    {
      label: 'Tips Shared',
      value: tips.length,
      mine: tips.filter((tip) => tip.authorId === profile?.uid).length,
      icon: Lightbulb,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20',
      screen: 'tips-tricks' as Screen,
    },
    {
      label: 'Knowledge Hub',
      value: proposals.length,
      mine: proposals.filter((proposal) => proposal.authorId === profile?.uid).length,
      icon: BookOpen,
      color: 'text-violet-600',
      bg: 'bg-violet-500/10',
      border: 'border-violet-200 dark:border-violet-800',
      screen: 'knowledge-sharing' as Screen,
    },
  ];

  return (
    <div className="space-y-12">
      <section>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-2xl"
          >
            <p className="mb-3 flex items-center gap-1.5 text-xs font-mono text-primary/70">
              <span className="opacity-50">$</span>
              <span className="font-semibold">{getGreeting()}, {profile?.displayName?.split(' ')[0] || 'QA'}</span>
              <span className="ml-0.5 inline-block h-3.5 w-1.5 rounded-sm bg-primary/70 status-pulse" />
            </p>
            <h1 className="mb-3 text-5xl font-extrabold leading-tight tracking-tighter text-on-surface font-headline">
              A home for solo QAs to <span className="text-primary italic">learn</span>, <span className="text-primary italic">share</span>, and{' '}
              <span className="text-tertiary italic">breathe</span>.
            </h1>
            <p className="max-w-xl text-sm font-mono leading-relaxed text-on-surface-variant">
              <TypewriterText
                text="// Post bug stories, exchange testing wisdom, and recharge before the next test cycle."
                delayMs={400}
                speedMs={14}
              />
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex shrink-0 items-center gap-3 rounded-full border border-outline-variant/10 bg-surface-container-low px-4 py-2.5"
          >
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 5).map((user) => (
                <div
                  key={user.uid}
                  className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border-2 border-surface bg-primary/20"
                  title={user.displayName}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-primary">
                      {user.displayName?.[0] || '?'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-tertiary">{activeUsers.length} Active Now</span>
            </div>
          </motion.div>
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 lg:grid-cols-4"
      >
        {stats.map((stat, index) => (
          <motion.button
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.06 }}
            onClick={() => onNavigate(stat.screen)}
            className={`rounded-2xl border ${stat.border} bg-surface-container-lowest p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <CountUpNumber value={stat.value} className={`font-mono text-2xl font-extrabold ${stat.color}`} />
                <p className="text-xs font-medium text-on-surface-variant">{stat.label}</p>
                <p className="mt-0.5 text-[10px] font-mono text-outline">
                  <CountUpNumber value={stat.mine} /> yours
                </p>
              </div>
            </div>
          </motion.button>
        ))}

        {profile?.status === 'approved' && myRankEntry && myRank && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/12 via-surface-container-lowest to-surface p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Your QA Rank</p>
                <div className="mt-2 flex items-end gap-3">
                  <p className="text-4xl font-black text-on-surface">#{myRank}</p>
                  <p className="pb-1 text-sm font-bold text-on-surface-variant">{myRankEntry.totalScore} pts</p>
                </div>
              </div>
              <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-700 dark:text-amber-300">
                <Trophy size={20} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="rounded-full bg-error/10 px-3 py-1.5 text-error">{myRankEntry.bugStories} bugs</span>
              <span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">{myRankEntry.tips} tips</span>
              <span className="rounded-full bg-violet-500/10 px-3 py-1.5 text-violet-600 dark:text-violet-300">{myRankEntry.knowledgeProposals} knowledge</span>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-emerald-700 dark:text-emerald-300">{myRankEntry.workAchievements} work wins</span>
              <span className="rounded-full bg-sky-500/10 px-3 py-1.5 text-sky-700 dark:text-sky-300">{myRankEntry.personalAchievements} personal</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="max-w-xs text-on-surface-variant">Earn points by contributing bugs, tips, knowledge, and achievements.</p>
              {pointsToNextRank && pointsToNextRank > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-xs font-bold text-on-surface">
                  <TrendingUp size={14} className="text-primary" />
                  {pointsToNextRank} points behind #{myRank - 1}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Trophy size={14} />
                  You are leading
                </div>
              )}
            </div>

            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-outline">Rolling {LOOKBACK_DAYS}-day rank</p>
          </motion.div>
        )}
      </motion.div>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-primary" />
          <h3 className="text-xl font-bold tracking-tight font-headline">Latest Activity</h3>
        </div>

        {latestActivity.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-lowest py-16 text-center">
            <MessageSquare size={28} strokeWidth={1.5} className="text-outline" />
            <p className="text-sm font-bold text-on-surface">No activity yet</p>
            <p className="text-xs text-on-surface-variant">Be the first to post something!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {latestActivity.map((entry, index) => (
              <motion.div
                key={`${entry.type}-${entry.id}`}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.07, duration: 0.25 }}
                onClick={() => onNavigate(entry.screen)}
                className="group flex cursor-pointer gap-4 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 transition-all hover:border-primary/20 hover:bg-surface-container-low hover:shadow-md"
              >
                <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${entry.bg} ${entry.color}`}>
                  <entry.icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest ${
                          entry.type === 'bug'
                            ? 'border-red-300/40 bg-red-500/10 text-red-500 dark:border-red-700/40'
                            : entry.type === 'tip'
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'border-violet-300/40 bg-violet-500/10 text-violet-600 dark:border-violet-700/40'
                        }`}
                      >
                        {entry.type === 'bug' ? 'BUG' : entry.type === 'tip' ? 'TIP' : 'DOC'}
                      </span>
                      <h4 className="truncate font-headline text-sm font-bold transition-colors group-hover:text-primary">{entry.title}</h4>
                    </div>
                    <span className="shrink-0 text-[10px] font-mono text-outline">{timeAgo(entry.createdAt || entry.date)}</span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-on-surface-variant">{entry.description}</p>
                </div>
                <ArrowRight size={14} className="mt-1 shrink-0 text-outline-variant opacity-0 transition-colors group-hover:text-primary group-hover:opacity-100" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
