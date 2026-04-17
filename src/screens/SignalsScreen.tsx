import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, AlertTriangle, Zap, X, ChevronRight, Activity, Users, TrendingDown } from 'lucide-react';
import { BugStory, Tip } from '../types';
import { timeAgo } from '../utils/timeAgo';

type SignalType = 'regression' | 'flakiness' | 'unowned' | 'ai-anomaly';

interface Signal {
  id: string;
  type: SignalType;
  title: string;
  summary: string;
  severity: 'critical' | 'warning' | 'info';
  count: number;
  detail: {
    affectedItems: string[];
    aiSummary: string;
    suggestedActions: string[];
    area: string;
  };
}

function SignalTypePill({ type }: { type: SignalType }) {
  const styles: Record<SignalType, string> = {
    regression: 'bg-[var(--signal-critical)]/10 text-[var(--signal-critical)] border-[var(--signal-critical)]/20',
    flakiness: 'bg-[var(--signal-warning)]/10 text-[var(--signal-warning)] border-[var(--signal-warning)]/20',
    unowned: 'bg-secondary text-muted-foreground border-border',
    'ai-anomaly': 'bg-primary/10 text-primary border-primary/20',
  };
  const labels: Record<SignalType, string> = {
    regression: 'Regression Cluster',
    flakiness: 'Flakiness Spike',
    unowned: 'Unowned Bugs',
    'ai-anomaly': 'AI Anomaly',
  };
  return (
    <span className={`inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[10px] ${styles[type]}`} style={{ fontWeight: 500 }}>
      {labels[type]}
    </span>
  );
}

interface SignalCardProps {
  signal: Signal;
  isSelected: boolean;
  onClick: () => void;
  key?: React.Key;
}

function SignalCard({ signal, isSelected, onClick }: SignalCardProps) {
  const severityIcon = {
    critical: <Zap size={13} className="text-[var(--signal-critical)]" />,
    warning: <AlertTriangle size={13} className="text-[var(--signal-warning)]" />,
    info: <Cpu size={13} className="text-primary" />,
  }[signal.severity];

  return (
    <motion.button
      layout
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/50 hover:bg-secondary/20 transition-colors ${
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
      }`}
    >
      <div className="shrink-0 mt-0.5">{severityIcon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <SignalTypePill type={signal.type} />
          <span className="text-[11px] text-muted-foreground/60">·</span>
          <span className="text-[11px] text-muted-foreground">{signal.count} items</span>
        </div>
        <p className="text-[13px] text-foreground" style={{ fontWeight: 510 }}>{signal.title}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed line-clamp-2">{signal.summary}</p>
      </div>
      <ChevronRight size={13} className="shrink-0 mt-1 text-muted-foreground/40" />
    </motion.button>
  );
}

interface SignalInspectorProps {
  signal: Signal;
  onClose: () => void;
}

function SignalInspector({ signal, onClose }: SignalInspectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="flex flex-col h-full border-l border-border bg-card overflow-y-auto custom-scrollbar"
      style={{ width: 'var(--inspector-width, 340px)', minWidth: '280px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          <SignalTypePill type={signal.type} />
          <p className="mt-1.5 text-[13px] text-foreground leading-snug" style={{ fontWeight: 590 }}>
            {signal.title}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 flex h-6 w-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* AI summary */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-start gap-2 rounded-[6px] bg-primary/8 border border-primary/15 px-3 py-2">
          <Cpu size={12} className="text-primary mt-0.5 shrink-0" />
          <p className="text-[12px] text-primary/90 leading-relaxed">{signal.detail.aiSummary}</p>
        </div>
      </div>

      {/* Suggested actions */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-2" style={{ fontWeight: 510 }}>
          Suggested Actions
        </p>
        <div className="flex flex-col gap-1.5">
          {signal.detail.suggestedActions.map((action, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px] text-foreground/80">
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
              {action}
            </div>
          ))}
        </div>
      </div>

      {/* Area */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-2" style={{ fontWeight: 510 }}>
          Affected Area
        </p>
        <p className="text-[13px] text-foreground">{signal.detail.area}</p>
      </div>

      {/* Affected items */}
      <div className="px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-2" style={{ fontWeight: 510 }}>
          Related Items
        </p>
        <div className="space-y-1.5">
          {signal.detail.affectedItems.map((item, i) => (
            <div key={i} className="rounded-[6px] border border-border bg-secondary/30 px-3 py-2 text-[12px] text-foreground/80">
              {item}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

interface SignalsScreenProps {
  bugs: BugStory[];
  tips: Tip[];
}

export function SignalsScreen({ bugs }: SignalsScreenProps) {
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  // Derive real signals from actual bug data where possible, fill rest with placeholders
  const signals = useMemo((): Signal[] => {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const toMs = (b: BugStory) => {
      const v = b.createdAt;
      if (!v) return new Date(b.date ?? 0).getTime();
      if (typeof v.toMillis === 'function') return v.toMillis();
      if (v.seconds) return v.seconds * 1000;
      return new Date(v).getTime();
    };

    const recentBugs = bugs.filter(b => now - toMs(b) < sevenDays);
    const unownedBugs = bugs.filter(b => !b.comments || b.comments.length === 0);

    // Group bugs by first tag to find clusters
    const tagGroups: Record<string, BugStory[]> = {};
    bugs.forEach(b => {
      const tag = b.tags?.[0];
      if (tag) {
        tagGroups[tag] = tagGroups[tag] ?? [];
        tagGroups[tag].push(b);
      }
    });
    const clusterTag = Object.entries(tagGroups).sort((a, b) => b[1].length - a[1].length)[0];

    const derived: Signal[] = [];

    if (clusterTag && clusterTag[1].length >= 2) {
      derived.push({
        id: 'regression-cluster',
        type: 'regression',
        title: `${clusterTag[1].length} bugs in "${clusterTag[0]}" area`,
        summary: `Multiple bug stories filed under the same tag — possible regression cluster worth investigating.`,
        severity: clusterTag[1].length >= 4 ? 'critical' : 'warning',
        count: clusterTag[1].length,
        detail: {
          area: clusterTag[0],
          aiSummary: `${clusterTag[1].length} bug stories share the tag "${clusterTag[0]}". This may indicate a shared root cause or regression in that area.`,
          suggestedActions: ['Review all tagged items together', 'Check for common root cause', 'Assign ownership to one person'],
          affectedItems: clusterTag[1].slice(0, 4).map(b => b.title),
        },
      });
    }

    if (unownedBugs.length > 0) {
      derived.push({
        id: 'unowned-bugs',
        type: 'unowned',
        title: `${unownedBugs.length} bug${unownedBugs.length > 1 ? 's' : ''} with no activity`,
        summary: `These bug stories have no comments or reactions. They may be getting missed.`,
        severity: 'warning',
        count: unownedBugs.length,
        detail: {
          area: 'Various',
          aiSummary: `${unownedBugs.length} bug stories have had no engagement. Consider triaging them or requesting context from the author.`,
          suggestedActions: ['Review each bug and add initial comment', 'Assign to relevant team member', 'Close stale entries if resolved'],
          affectedItems: unownedBugs.slice(0, 4).map(b => b.title),
        },
      });
    }

    if (recentBugs.length >= 3) {
      derived.push({
        id: 'recent-volume',
        type: 'ai-anomaly',
        title: `${recentBugs.length} bugs filed in the last 7 days`,
        summary: `Elevated bug volume this week. May indicate a regression or deployment issue.`,
        severity: recentBugs.length >= 5 ? 'critical' : 'info',
        count: recentBugs.length,
        detail: {
          area: 'All areas',
          aiSummary: `${recentBugs.length} bugs were filed in the past week. Review whether this correlates with a recent deployment or code change.`,
          suggestedActions: ['Compare with previous week volume', 'Check deployment history', 'Look for common affected areas'],
          affectedItems: recentBugs.slice(0, 4).map(b => b.title),
        },
      });
    }

    // Always include placeholder flakiness signal
    derived.push({
      id: 'flakiness-placeholder',
      type: 'flakiness',
      title: 'Test flakiness detection — connect CI to enable',
      summary: 'Wire up your CI pipeline to surface flaky test signals here automatically.',
      severity: 'info',
      count: 0,
      detail: {
        area: 'CI/CD pipeline',
        aiSummary: 'Flakiness detection requires CI integration. Once connected, this view will surface tests with inconsistent pass rates.',
        suggestedActions: ['Connect CI webhook', 'Configure test result reporting', 'Set flakiness threshold'],
        affectedItems: ['CI integration pending'],
      },
    });

    return derived;
  }, [bugs]);

  // Stat counters
  const criticalCount = signals.filter(s => s.severity === 'critical').length;
  const warningCount = signals.filter(s => s.severity === 'warning').length;

  const stats = [
    { label: 'Active signals', value: signals.length, icon: Activity },
    { label: 'Critical', value: criticalCount, icon: Zap },
    { label: 'Warnings', value: warningCount, icon: AlertTriangle },
    { label: 'Bugs tracked', value: bugs.length, icon: TrendingDown },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[20px] text-foreground" style={{ fontWeight: 590, letterSpacing: '-0.03em' }}>
          Signals
        </h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Live system health and pattern detection.
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-[8px] border border-border bg-card px-4 py-3"
            >
              <Icon size={14} className="text-muted-foreground shrink-0" />
              <div>
                <p className="text-[20px] text-foreground tabular-nums" style={{ fontWeight: 620, letterSpacing: '-0.03em' }}>
                  {stat.value}
                </p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Signal feed + inspector */}
      <div className="flex gap-0 min-h-[400px]">
        {/* Signal feed */}
        <div className={`flex flex-col rounded-[8px] border border-border bg-card overflow-hidden ${selectedSignal ? 'flex-1' : 'w-full'}`}>
          <div className="px-4 py-2.5 border-b border-border shrink-0">
            <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground" style={{ fontWeight: 510 }}>
              Signal Feed — {signals.length} active
            </p>
          </div>
          {signals.map(signal => (
            <SignalCard
              key={signal.id}
              signal={signal}
              isSelected={selectedSignal?.id === signal.id}
              onClick={() => setSelectedSignal(prev => prev?.id === signal.id ? null : signal)}
            />
          ))}
        </div>

        {/* Inspector */}
        <AnimatePresence>
          {selectedSignal && (
            <SignalInspector
              signal={selectedSignal}
              onClose={() => setSelectedSignal(null)}
            />
          )}
        </AnimatePresence>
      </div>

      <p className="text-[11px] text-muted-foreground/50 text-center">
        Signals are derived from your bug queue. CI/CD and test runner integration will enable richer detection.
      </p>
    </div>
  );
}
