import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

/** Animates a number from 0 → target over ~700ms (ease-out cubic). */
function CountUpNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 700;
    const start = performance.now();
    const raf = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{display}</span>;
}

/** Types out text character by character. */
function TypewriterText({ text, delayMs = 0, speedMs = 18 }: { text: string; delayMs?: number; speedMs?: number }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    const timeout = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(iv);
      }, speedMs);
      return () => clearInterval(iv);
    }, delayMs);
    return () => clearTimeout(timeout);
  }, [text, delayMs, speedMs]);
  return <>{displayed}</>;
}
import {
  Bug,
  Lightbulb,
  BookOpen,
  MessageSquare,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { Screen, BugStory, Tip, Proposal } from '../types';
import { useAuth } from '../AuthContext';
import { timeAgo } from '../utils/timeAgo';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  bugs: BugStory[];
  tips: Tip[];
  proposals: Proposal[];
  searchQuery: string;
  activeUsers?: { uid: string; displayName: string; photoURL: string }[];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardScreen({ onNavigate, bugs, tips, proposals, activeUsers = [] }: DashboardProps) {
  const { profile } = useAuth();

  const latestActivity = [
    ...bugs.map(b => ({ id: b.id, title: b.title, description: b.discovery, date: b.date, createdAt: b.createdAt, type: 'bug', icon: Bug, color: 'text-error', bg: 'bg-error/10', screen: 'bug-wall' as Screen })),
    ...tips.map(t => ({ id: t.id, title: t.title, description: t.desc, date: t.time, createdAt: t.createdAt, type: 'tip', icon: Lightbulb, color: 'text-primary', bg: 'bg-primary/10', screen: 'tips-tricks' as Screen })),
    ...proposals.map(p => ({ id: p.id, title: p.title, description: p.scope, date: p.date, createdAt: p.createdAt, type: 'proposal', icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-500/10', screen: 'knowledge-sharing' as Screen })),
  ].sort((a, b) => {
    const toMs = (d: string) => d === 'Just now' ? Date.now() : new Date(d).getTime() || 0;
    return toMs(b.date) - toMs(a.date);
  }).slice(0, 6);

  const stats = [
    { label: 'Bugs Reported', value: bugs.length, mine: bugs.filter(b => b.authorId === profile?.uid).length, icon: Bug, color: 'text-error', bg: 'bg-error/10', border: 'border-error/20', screen: 'bug-wall' as Screen },
    { label: 'Tips Shared', value: tips.length, mine: tips.filter(t => t.authorId === profile?.uid).length, icon: Lightbulb, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', screen: 'tips-tricks' as Screen },
    { label: 'Knowledge Hub', value: proposals.length, mine: proposals.filter(p => p.authorId === profile?.uid).length, icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-500/10', border: 'border-violet-200 dark:border-violet-800', screen: 'knowledge-sharing' as Screen },
  ];

  return (
    <div className="space-y-12">

      {/* ── Hero greeting ── */}
      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-2xl"
          >
            <p className="text-xs font-mono text-primary/70 mb-3 flex items-center gap-1.5">
              <span className="opacity-50">$</span>
              <span className="font-semibold">{getGreeting()}, {profile?.displayName?.split(' ')[0] || 'QA'}</span>
              <span className="w-1.5 h-3.5 bg-primary/70 rounded-sm status-pulse inline-block ml-0.5" />
            </p>
            <h1 className="text-5xl font-extrabold text-on-surface tracking-tighter mb-3 leading-tight font-headline">
              A home for solo QAs to{' '}
              <span className="text-primary italic">learn</span>,{' '}
              <span className="text-primary italic">share</span>, and{' '}
              <span className="text-tertiary italic">breathe</span>.
            </h1>
            <p className="text-base text-on-surface-variant leading-relaxed max-w-xl font-mono text-sm">
              <TypewriterText
                text="// Post bug stories, exchange testing wisdom, and recharge before the next test cycle."
                delayMs={400}
                speedMs={14}
              />
            </p>
          </motion.div>

          {/* Active users pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex items-center bg-surface-container-low border border-outline-variant/10 px-4 py-2.5 rounded-full gap-3 shrink-0"
          >
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 5).map((u) => (
                <div
                  key={u.uid}
                  className="w-8 h-8 rounded-full border-2 border-surface overflow-hidden bg-primary/20 flex-shrink-0"
                  title={u.displayName}
                >
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary">
                      {u.displayName?.[0] || '?'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-tertiary tracking-wide uppercase">
                {activeUsers.length} Active Now
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats row ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-3 gap-4"
      >
        {stats.map((s, i) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            onClick={() => onNavigate(s.screen)}
            className={`bg-surface-container-lowest border ${s.border} hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 rounded-2xl p-5 flex items-center gap-4 transition-all text-left`}
          >
            <div className={`w-11 h-11 rounded-xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
              <s.icon size={20} />
            </div>
            <div>
              <CountUpNumber value={s.value} className={`text-2xl font-extrabold font-mono ${s.color}`} />
              <p className="text-xs font-medium text-on-surface-variant">{s.label}</p>
              <p className="text-[10px] text-outline mt-0.5 font-mono"><CountUpNumber value={s.mine} /> yours</p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* ── Activity feed ── */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-primary" />
          <h3 className="text-xl font-bold tracking-tight font-headline">Latest Activity</h3>
        </div>

        {latestActivity.length === 0 ? (
          <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/20 flex flex-col items-center gap-3">
            <MessageSquare size={28} strokeWidth={1.5} className="text-outline" />
            <p className="text-sm font-bold text-on-surface">No activity yet</p>
            <p className="text-xs text-on-surface-variant">Be the first to post something!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {latestActivity.map((entry, idx) => (
              <motion.div
                key={`${entry.type}-${entry.id}`}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.07, duration: 0.25 }}
                onClick={() => onNavigate(entry.screen)}
                className="group bg-surface-container-lowest hover:bg-surface-container-low transition-all p-5 rounded-2xl flex gap-4 border border-outline-variant/10 hover:border-primary/20 hover:shadow-md cursor-pointer"
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${entry.bg} ${entry.color} flex items-center justify-center mt-0.5`}>
                  <entry.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest ${
                        entry.type === 'bug' ? 'bg-red-500/10 text-red-500 border-red-300/40 dark:border-red-700/40' :
                        entry.type === 'tip' ? 'bg-primary/10 text-primary border-primary/30' :
                        'bg-violet-500/10 text-violet-600 border-violet-300/40 dark:border-violet-700/40'
                      }`}>
                        {entry.type === 'bug' ? 'BUG' : entry.type === 'tip' ? 'TIP' : 'DOC'}
                      </span>
                      <h4 className="font-bold text-sm group-hover:text-primary transition-colors font-headline truncate">
                        {entry.title}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-outline shrink-0">
                      {timeAgo(entry.createdAt || entry.date)}
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-xs leading-relaxed line-clamp-2">
                    {entry.description}
                  </p>
                </div>
                <ArrowRight size={14} className="text-outline-variant group-hover:text-primary transition-colors shrink-0 mt-1 opacity-0 group-hover:opacity-100" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
