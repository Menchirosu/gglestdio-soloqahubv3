import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Bug,
  MessageCircle,
  Tag,
  Clock,
  ChevronRight,
  Zap,
  AlertTriangle,
  Minus,
  ArrowDown,
  Cpu,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react';
import { BugStory, Comment } from '../types';
import { useAuth } from '../AuthContext';
import { timeAgo } from '../utils/timeAgo';

function deriveSeverity(impact: string): 'CRIT' | 'HIGH' | 'MED' | 'LOW' {
  const t = impact.toLowerCase();
  if (t.includes('critical') || t.includes('blocker') || t.includes('prod') || t.includes('down') || t.includes('outage')) return 'CRIT';
  if (t.includes('high') || t.includes('major') || t.includes('severe') || t.includes('fail') || t.includes('broken')) return 'HIGH';
  if (t.includes('low') || t.includes('minor') || t.includes('cosmetic') || t.includes('typo') || t.includes('nit')) return 'LOW';
  return 'MED';
}

function SeverityPill({ severity }: { severity: 'CRIT' | 'HIGH' | 'MED' | 'LOW' }) {
  const styles = {
    CRIT: 'bg-[var(--signal-critical)]/15 text-[var(--signal-critical)] border-[var(--signal-critical)]/25',
    HIGH: 'bg-[var(--signal-warning)]/15 text-[var(--signal-warning)] border-[var(--signal-warning)]/25',
    MED: 'bg-secondary text-muted-foreground border-border',
    LOW: 'bg-secondary/50 text-muted-foreground/70 border-border/60',
  };
  const icons = {
    CRIT: <Zap size={9} />,
    HIGH: <AlertTriangle size={9} />,
    MED: <Minus size={9} />,
    LOW: <ArrowDown size={9} />,
  };
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-[4px] border px-1.5 py-0.5 text-[10px] font-mono font-[500] ${styles[severity]}`}>
      {icons[severity]}
      {severity}
    </span>
  );
}

function AiCueChip({ text }: { text: string; key?: React.Key }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[4px] bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] text-primary" style={{ fontWeight: 500 }}>
      <Cpu size={9} />
      {text}
    </span>
  );
}

interface BugTriageRowProps {
  bug: BugStory;
  isSelected: boolean;
  onClick: () => void;
  key?: React.Key;
}

function BugTriageRow({ bug, isSelected, onClick }: BugTriageRowProps) {
  const severity = deriveSeverity(bug.impact);
  const commentCount = bug.comments?.length ?? 0;
  const reactionCount = Object.values(bug.reactions ?? {}).reduce((a, b) => a + b, 0);
  const firstTag = bug.tags?.[0];
  const age = timeAgo(bug.createdAt ?? bug.date);

  const aiCues: string[] = [];
  if (severity === 'CRIT') aiCues.push('High priority');
  if (commentCount === 0) aiCues.push('No activity');
  if (bug.tags?.length > 2) aiCues.push('Multi-area');

  return (
    <motion.button
      layout
      onClick={onClick}
      className={`group w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/50 hover:bg-secondary/30 ${
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
      }`}
      style={{ minHeight: '52px' }}
    >
      {/* Severity */}
      <div className="shrink-0">
        <SeverityPill severity={severity} />
      </div>

      {/* Title + tags */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-[13px] text-foreground" style={{ fontWeight: 510 }}>
          {bug.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          {firstTag && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Tag size={9} />
              {firstTag}
            </span>
          )}
          {aiCues.map(cue => (
            <AiCueChip key={cue} text={cue} />
          ))}
        </div>
      </div>

      {/* Meta */}
      <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground">
        {commentCount > 0 && (
          <span className="flex items-center gap-0.5">
            <MessageCircle size={11} />
            {commentCount}
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <Clock size={11} />
          {age}
        </span>
      </div>

      <ChevronRight size={13} className="shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
    </motion.button>
  );
}

interface InspectorProps {
  bug: BugStory;
  onClose: () => void;
  onEdit: (bug: BugStory) => void;
  onDelete: (id: string) => void;
}

function Inspector({ bug, onClose, onEdit, onDelete }: InspectorProps) {
  const { profile } = useAuth();
  const severity = deriveSeverity(bug.impact);
  const commentCount = bug.comments?.length ?? 0;
  const isOwner = profile?.uid === bug.authorId;

  const aiSummary = `Filed by ${bug.isAnonymous ? 'anonymous' : bug.author} — ${severity === 'CRIT' || severity === 'HIGH' ? 'high-signal issue, consider prioritizing.' : 'moderate impact, review when possible.'}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="flex flex-col h-full border-l border-border bg-card overflow-y-auto custom-scrollbar"
      style={{ width: 'var(--inspector-width, 340px)', minWidth: '280px' }}
    >
      {/* Inspector header */}
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-foreground leading-snug" style={{ fontWeight: 590 }}>
            {bug.title}
          </p>
          <div className="mt-1.5">
            <SeverityPill severity={severity} />
          </div>
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
          <p className="text-[12px] text-primary/90 leading-relaxed">{aiSummary}</p>
        </div>
      </div>

      {/* Suggested actions */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-2" style={{ fontWeight: 510 }}>
          Suggested
        </p>
        <div className="flex flex-wrap gap-1.5">
          {isOwner && (
            <button
              onClick={() => onEdit(bug)}
              className="inline-flex items-center gap-1 rounded-[4px] border border-border bg-secondary/50 px-2 py-1 text-[11px] text-foreground hover:bg-secondary transition-colors"
            >
              Edit details
            </button>
          )}
          <button className="inline-flex items-center gap-1 rounded-[4px] border border-border bg-secondary/50 px-2 py-1 text-[11px] text-foreground hover:bg-secondary transition-colors">
            <CheckCircle2 size={10} />
            Mark resolved
          </button>
          <button className="inline-flex items-center gap-1 rounded-[4px] border border-border bg-secondary/50 px-2 py-1 text-[11px] text-foreground hover:bg-secondary transition-colors">
            Link regression
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-2" style={{ fontWeight: 510 }}>
          Details
        </p>
        <dl className="space-y-1.5">
          <div className="flex items-center justify-between">
            <dt className="text-[12px] text-muted-foreground">Filed by</dt>
            <dd className="text-[12px] text-foreground" style={{ fontWeight: 510 }}>
              {bug.isAnonymous ? 'Anonymous' : bug.author}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[12px] text-muted-foreground">Filed</dt>
            <dd className="text-[12px] text-foreground">{timeAgo(bug.createdAt ?? bug.date)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[12px] text-muted-foreground">Impact</dt>
            <dd className="text-[12px] text-foreground max-w-[160px] text-right truncate" title={bug.impact}>{bug.impact}</dd>
          </div>
          {commentCount > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-[12px] text-muted-foreground">Comments</dt>
              <dd className="text-[12px] text-foreground">{commentCount}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Description */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-2" style={{ fontWeight: 510 }}>
          Discovery
        </p>
        <p className="text-[13px] text-foreground/90 leading-relaxed">{bug.discovery}</p>
      </div>

      {/* Lesson */}
      {bug.lesson && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-2" style={{ fontWeight: 510 }}>
            Lesson learned
          </p>
          <p className="text-[13px] text-foreground/90 leading-relaxed">{bug.lesson}</p>
        </div>
      )}

      {/* Tags */}
      {bug.tags?.length > 0 && (
        <div className="px-4 py-3 border-b border-border shrink-0">
          <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-2" style={{ fontWeight: 510 }}>
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bug.tags.map(tag => (
              <span key={tag} className="rounded-[4px] border border-border bg-secondary/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Delete — owner only */}
      {isOwner && (
        <div className="px-4 py-3 mt-auto shrink-0">
          <button
            onClick={() => { onDelete(bug.id); onClose(); }}
            className="text-[12px] text-destructive/70 hover:text-destructive transition-colors"
          >
            Delete this entry
          </button>
        </div>
      )}
    </motion.div>
  );
}

type FilterKey = 'all' | 'hot' | 'needs-decision' | 'recent';

interface QueueScreenProps {
  bugs: BugStory[];
  onReact: (bugId: string, emoji: string, currentUserName?: string) => void;
  onComment: (bugId: string, text: string, author: string, isAnonymous: boolean, authorPhotoURL?: string, authorId?: string, imageUrl?: string, gifUrl?: string, imageUrls?: string[]) => void;
  onReactComment: (bugId: string, commentId: string, currentUserId: string) => void;
  onReplyComment: (bugId: string, commentId: string, reply: any) => void;
  onDeleteBug: (bugId: string) => void;
  onEditBug: (bug: BugStory) => void;
  onAddBug: () => void;
  onDeleteComment: (bugId: string, commentId: string) => void;
  onEditComment: (bugId: string, commentId: string, text: string) => void;
  searchQuery: string;
  selectedItemId: string | null;
  onClearSelection: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onAddBugSubmit: (bug: any) => Promise<void>;
}

export function QueueScreen({
  bugs,
  onDeleteBug,
  onEditBug,
  onAddBug,
  searchQuery,
  selectedItemId,
  onClearSelection,
}: QueueScreenProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedBug, setSelectedBug] = useState<BugStory | null>(() => {
    if (selectedItemId) return bugs.find(b => b.id === selectedItemId) ?? null;
    return null;
  });

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const filteredBugs = useMemo(() => {
    let list = bugs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.discovery.toLowerCase().includes(q) ||
        b.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [bugs, searchQuery]);

  const sections = useMemo(() => {
    const hot = filteredBugs.filter(b => {
      const ts = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.date).getTime());
      return now - ts < sevenDaysMs && deriveSeverity(b.impact) !== 'LOW';
    });
    const needsDecision = filteredBugs.filter(b => {
      const inHot = hot.some(h => h.id === b.id);
      return !inHot && (!b.comments || b.comments.length === 0);
    });
    const recent = filteredBugs.filter(b => !hot.some(h => h.id === b.id) && !needsDecision.some(n => n.id === b.id));

    if (activeFilter === 'hot') return [{ label: 'Hot', bugs: hot }];
    if (activeFilter === 'needs-decision') return [{ label: 'Needs Decision', bugs: needsDecision }];
    if (activeFilter === 'recent') return [{ label: 'All Recent', bugs: recent }];

    return [
      { label: 'Hot', bugs: hot },
      { label: 'Needs Decision', bugs: needsDecision },
      { label: 'All Recent', bugs: recent },
    ].filter(s => s.bugs.length > 0);
  }, [filteredBugs, activeFilter, now]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'hot', label: 'Hot' },
    { key: 'needs-decision', label: 'Needs Decision' },
    { key: 'recent', label: 'Recent' },
  ];

  const handleBugClick = (bug: BugStory) => {
    setSelectedBug(prev => prev?.id === bug.id ? null : bug);
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 'calc(100vh - 44px - 48px)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`rounded-[6px] px-2.5 py-1 text-[12px] transition-colors ${
                activeFilter === f.key
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
              style={{ fontWeight: activeFilter === f.key ? 510 : 400 }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={onAddBug}
          className="flex items-center gap-1.5 rounded-[6px] bg-primary px-3 py-1.5 text-[12px] text-white hover:bg-primary/90 transition-colors"
          style={{ fontWeight: 510 }}
        >
          <PlusCircle size={13} />
          New Bug
        </button>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 gap-0 min-h-0" style={{ height: 'calc(100vh - 44px - 120px)' }}>
        {/* Queue list */}
        <div className={`flex flex-col overflow-y-auto custom-scrollbar rounded-[8px] border border-border bg-card transition-all ${selectedBug ? 'flex-1' : 'w-full'}`}>
          {bugs.length === 0 ? (
            <div className="page-empty mx-4 my-4">
              <Bug size={20} className="mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">No bug stories yet.</p>
              <button
                onClick={onAddBug}
                className="mt-3 inline-flex items-center gap-1.5 rounded-[6px] bg-primary px-3 py-1.5 text-[12px] text-white hover:bg-primary/90"
                style={{ fontWeight: 510 }}
              >
                <PlusCircle size={13} />
                Post the first one
              </button>
            </div>
          ) : sections.length === 0 ? (
            <div className="page-empty mx-4 my-4">
              <p className="text-[13px] text-muted-foreground">No bugs match the current filter.</p>
            </div>
          ) : (
            sections.map(section => (
              <div key={section.label}>
                <div className="sticky top-0 z-10 flex items-center gap-2 bg-card/95 backdrop-blur-sm px-3 py-2 border-b border-border">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground" style={{ fontWeight: 510 }}>
                    {section.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60">
                    {section.bugs.length}
                  </span>
                </div>
                {section.bugs.map(bug => (
                  <BugTriageRow
                    key={bug.id}
                    bug={bug}
                    isSelected={selectedBug?.id === bug.id}
                    onClick={() => handleBugClick(bug)}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        {/* Inspector panel */}
        <AnimatePresence>
          {selectedBug && (
            <Inspector
              bug={selectedBug}
              onClose={() => { setSelectedBug(null); onClearSelection(); }}
              onEdit={onEditBug}
              onDelete={onDeleteBug}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
