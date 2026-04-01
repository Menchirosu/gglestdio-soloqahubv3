import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  ArrowRight,
  BookHeart,
  BookOpen,
  Bug,
  Flame,
  HeartHandshake,
  Lightbulb,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
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
      if (progress < 1) {
        requestAnimationFrame(raf);
      }
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
      createdAt: bug.createdAt || bug.date,
      typeLabel: 'Bug story',
      icon: Bug,
      iconClass: 'text-rose-500',
      iconBg: 'bg-rose-100 dark:bg-rose-500/15',
      chipClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
      screen: 'bug-wall' as Screen,
    })),
    ...tips.map((tip) => ({
      id: tip.id,
      title: tip.title,
      description: tip.desc,
      createdAt: tip.createdAt || tip.time,
      typeLabel: 'Quick tip',
      icon: Lightbulb,
      iconClass: 'text-amber-600',
      iconBg: 'bg-amber-100 dark:bg-amber-500/15',
      chipClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
      screen: 'tips-tricks' as Screen,
    })),
    ...proposals.map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      description: proposal.scope,
      createdAt: proposal.createdAt || proposal.date,
      typeLabel: 'Knowledge share',
      icon: BookOpen,
      iconClass: 'text-teal-700 dark:text-teal-200',
      iconBg: 'bg-teal-100 dark:bg-teal-500/15',
      chipClass: 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200',
      screen: 'knowledge-sharing' as Screen,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const contributionHighlights = [
    {
      label: 'Bug stories',
      helper: 'Shared hard-earned lessons',
      value: bugs.length,
      mine: bugs.filter((bug) => bug.authorId === profile?.uid).length,
      icon: Bug,
      iconBg: 'bg-rose-100 dark:bg-rose-500/15',
      iconClass: 'text-rose-500',
      screen: 'bug-wall' as Screen,
    },
    {
      label: 'Tips shared',
      helper: 'Practical wins for the next run',
      value: tips.length,
      mine: tips.filter((tip) => tip.authorId === profile?.uid).length,
      icon: Lightbulb,
      iconBg: 'bg-amber-100 dark:bg-amber-500/15',
      iconClass: 'text-amber-600',
      screen: 'tips-tricks' as Screen,
    },
    {
      label: 'Knowledge posts',
      helper: 'Docs, playbooks, and ideas',
      value: proposals.length,
      mine: proposals.filter((proposal) => proposal.authorId === profile?.uid).length,
      icon: BookHeart,
      iconBg: 'bg-teal-100 dark:bg-teal-500/15',
      iconClass: 'text-teal-700 dark:text-teal-200',
      screen: 'knowledge-sharing' as Screen,
    },
  ];

  const totalContributionCount = bugs.length + tips.length + proposals.length + achievements.length;
  const topContributors = ranking.slice(0, 3);
  const firstName = profile?.displayName?.split(' ')[0] || 'QA';

  return (
    <div className="space-y-8 lg:space-y-10">
      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="sunrise-card warm-ring relative overflow-hidden rounded-[2rem] px-6 py-7 sm:px-8 sm:py-8"
        >
          <div className="pointer-events-none absolute -left-16 top-0 h-44 w-44 rounded-full bg-primary/18 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-10 h-36 w-36 rounded-full bg-secondary/40 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-accent/40 blur-2xl" />

          <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm dark:bg-white/10">
                <HeartHandshake size={14} />
                {getGreeting()}, {firstName}
              </div>
              <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-on-surface sm:text-5xl">
                Your solo QA corner for sharing wins, trading lessons, and staying in motion.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-on-surface-variant sm:text-base">
                <TypewriterText
                  text="Drop a bug story, celebrate a small victory, or leave the next tester a tip that saves their day."
                  delayMs={320}
                  speedMs={13}
                />
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => onNavigate('bug-wall')}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5"
                >
                  <Sparkles size={16} />
                  Share something
                </button>
                <button
                  onClick={() => onNavigate('knowledge-sharing')}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white/80 px-5 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-white dark:bg-white/10 dark:hover:bg-white/15"
                >
                  <BookOpen size={16} />
                  Explore community notes
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:w-[22rem] xl:grid-cols-1">
              <div className="rounded-[1.5rem] bg-white/85 p-4 shadow-sm dark:bg-white/8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pulse</p>
                <div className="mt-2 flex items-end gap-2">
                  <CountUpNumber value={activeUsers.length} className="text-3xl font-extrabold text-on-surface" />
                  <p className="pb-1 text-sm text-on-surface-variant">active now</p>
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">Someone is probably debugging, documenting, or cheering on a teammate right now.</p>
              </div>

              <div className="rounded-[1.5rem] bg-white/70 p-4 shadow-sm dark:bg-white/6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Momentum</p>
                <div className="mt-2 flex items-end gap-2">
                  <CountUpNumber value={totalContributionCount} className="text-3xl font-extrabold text-on-surface" />
                  <p className="pb-1 text-sm text-on-surface-variant">shared moments</p>
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">Bug stories, tips, knowledge posts, and wins are all part of the same shared memory.</p>
              </div>

              <div className="rounded-[1.5rem] bg-secondary/60 p-4 shadow-sm dark:bg-secondary/25">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground/70">Support lane</p>
                <p className="mt-2 text-lg font-bold text-secondary-foreground">Leave the next tester a breadcrumb.</p>
                <p className="mt-1 text-sm text-secondary-foreground/80">Small notes compound faster than perfect documentation.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="space-y-4"
        >
          <div className="rounded-[1.75rem] border border-white/60 bg-white/75 p-5 shadow-lg shadow-primary/5 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active circle</p>
                <h2 className="mt-1 text-xl font-bold text-on-surface">Who is here today</h2>
              </div>
              <div className="rounded-full bg-secondary/80 p-3 text-secondary-foreground">
                <Users size={18} />
              </div>
            </div>

            <div className="mt-5 flex -space-x-3">
              {activeUsers.slice(0, 6).map((user) => (
                <div
                  key={user.uid}
                  className="h-12 w-12 overflow-hidden rounded-full border-4 border-background bg-primary/15"
                  title={user.displayName}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
                      {user.displayName?.[0] || '?'}
                    </span>
                  )}
                </div>
              ))}
              {activeUsers.length === 0 && (
                <div className="rounded-full bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">
                  Quiet right now, but the room is ready.
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-surface-container-low p-4">
                <p className="text-sm font-semibold text-on-surface">Today feels collaborative</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {activeUsers.length > 0
                    ? `${activeUsers.length} people are active. A good time to post a blocker or celebrate a quick fix.`
                    : 'Start the day with a share. One thoughtful note is enough to wake the room up.'}
                </p>
              </div>
              <div className="rounded-2xl bg-accent/60 p-4">
                <p className="text-sm font-semibold text-accent-foreground">Gentle recognition</p>
                <p className="mt-1 text-sm text-accent-foreground/80">
                  Helpful habits matter more than perfect streaks. Keep contributing in ways future-you would thank you for.
                </p>
              </div>
            </div>
          </div>

          {profile?.status === 'approved' && myRankEntry && myRank && (
            <div className="rounded-[1.75rem] border border-primary/10 bg-white/80 p-5 shadow-lg shadow-primary/5 dark:border-primary/20 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recognition</p>
                  <h3 className="mt-1 text-2xl font-extrabold text-on-surface">You&apos;re #{myRank} this cycle</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {myRankEntry.totalScore} points from stories, guidance, and wins in the last {LOOKBACK_DAYS} days.
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Trophy size={18} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-rose-100 px-3 py-1.5 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                  {myRankEntry.bugStories} bug stories
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                  {myRankEntry.tips} tips
                </span>
                <span className="rounded-full bg-teal-100 px-3 py-1.5 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200">
                  {myRankEntry.knowledgeProposals} knowledge posts
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-surface-container-low p-4">
                {pointsToNextRank && pointsToNextRank > 0 ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <TrendingUp size={16} className="text-primary" />
                    {pointsToNextRank} points to the next spot
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <Sparkles size={16} className="text-primary" />
                    You are setting the pace right now
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {contributionHighlights.map((stat, index) => (
          <motion.button
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + index * 0.06 }}
            onClick={() => onNavigate(stat.screen)}
            className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 text-left shadow-lg shadow-primary/5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-on-surface">{stat.label}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{stat.helper}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.iconBg} ${stat.iconClass}`}>
                <stat.icon size={20} />
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between gap-3">
              <div>
                <CountUpNumber value={stat.value} className="text-3xl font-extrabold text-on-surface" />
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <CountUpNumber value={stat.mine} /> from you
                </p>
              </div>
              <ArrowRight size={18} className="text-muted-foreground" />
            </div>
          </motion.button>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.8fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
          className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-lg shadow-primary/5 dark:border-white/10 dark:bg-white/5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Flame size={18} />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Community activity</p>
              </div>
              <h3 className="mt-2 text-2xl font-extrabold text-on-surface">Fresh from the hub</h3>
              <p className="mt-1 max-w-xl text-sm text-on-surface-variant">
                The latest bug stories, practical tips, and knowledge shares from the community.
              </p>
            </div>
            <button
              onClick={() => onNavigate('knowledge-sharing')}
              className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
            >
              Browse everything
              <ArrowRight size={16} />
            </button>
          </div>

          {latestActivity.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-[1.5rem] bg-surface-container-low py-16 text-center">
              <MessageSquare size={30} strokeWidth={1.5} className="text-muted-foreground" />
              <p className="text-sm font-semibold text-on-surface">Nothing new yet</p>
              <p className="max-w-sm text-sm text-on-surface-variant">
                Start the day with a bug story, a testing note, or a quick win someone else can build on.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {latestActivity.map((entry, index) => (
                <motion.button
                  key={`${entry.typeLabel}-${entry.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05, duration: 0.25 }}
                  onClick={() => onNavigate(entry.screen)}
                  className="group rounded-[1.5rem] bg-surface-container-low p-5 text-left transition-all hover:-translate-y-1 hover:bg-surface-container-high"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${entry.iconBg} ${entry.iconClass}`}>
                      <entry.icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${entry.chipClass}`}>
                          {entry.typeLabel}
                        </span>
                        <span className="text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</span>
                      </div>
                      <h4 className="mt-3 text-base font-bold text-on-surface transition-colors group-hover:text-primary">
                        {entry.title}
                      </h4>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-on-surface-variant">{entry.description}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.22 }}
          className="space-y-4"
        >
          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-lg shadow-primary/5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Helpful hearts</p>
                <h3 className="mt-1 text-xl font-bold text-on-surface">Top contributors</h3>
              </div>
              <div className="rounded-2xl bg-accent/70 p-3 text-accent-foreground">
                <HeartHandshake size={18} />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {topContributors.length === 0 ? (
                <div className="rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                  Once people start posting, the most helpful contributors will show up here.
                </div>
              ) : (
                topContributors.map((entry, index) => (
                  <div key={entry.user.uid} className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-on-surface">{entry.user.displayName || 'Solo QA'}</p>
                      <p className="text-sm text-on-surface-variant">{entry.totalScore} points of shared support</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-lg shadow-primary/5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles size={18} />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Next gentle nudge</p>
            </div>
            <h3 className="mt-2 text-xl font-bold text-on-surface">Keep the room useful</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Add one thing today that would have helped you a week ago: a bug detail, a testing shortcut, or a note from a painful edge case.
            </p>
            <button
              onClick={() => onNavigate('tips-tricks')}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
            >
              Start with a tip
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.aside>
      </section>
    </div>
  );
}
