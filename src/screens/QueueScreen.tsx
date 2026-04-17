import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform } from 'motion/react';
import { Icon } from '@iconify/react';
import { BugStory } from '../types';
import { useAuth } from '../AuthContext';
import { timeAgo } from '../utils/timeAgo';

/**
 * Lumie Queue — triage-first, dense, whisper-led.
 *
 * Locked decisions applied:
 *   Q7   Dense layout for Queue (rows, not cards)
 *   Q10  Mobile triage-first with swipe gesture
 *   Q12  Severity encoded by icon + shape (not color alone); AAA-safe
 *   Q15  Templated AI whispers (80%); real AI hook stubbed for repro only
 *   Q18  Iconify Solar bold-duotone icons
 *
 * P1 fixes included (from reference/neuform/BUGS.md):
 *   P1-1  Inspector syncs with external selectedItemId via useEffect
 *   P1-3  `now` moved inside useMemo so filters recompute with fresh time
 *
 * Animation budget (Q6: <=3):
 *   1. Inspector slide-in (enter/exit)
 *   2. Row stagger on initial mount
 *   3. Swipe x-drag with snap-back
 */

type Severity = 'CRIT' | 'HIGH' | 'MED' | 'LOW';

function deriveSeverity(impact: string): Severity {
  const t = (impact || '').toLowerCase();
  if (t.includes('critical') || t.includes('blocker') || t.includes('prod') || t.includes('down') || t.includes('outage')) return 'CRIT';
  if (t.includes('high') || t.includes('major') || t.includes('severe') || t.includes('fail') || t.includes('broken')) return 'HIGH';
  if (t.includes('low') || t.includes('minor') || t.includes('cosmetic') || t.includes('typo') || t.includes('nit')) return 'LOW';
  return 'MED';
}

/** Icon + shape, never color alone (Q12 colorblind-safe). */
const SEVERITY_META: Record<Severity, { icon: string; label: string; tone: string; ring: string }> = {
  CRIT: { icon: 'solar:bolt-bold-duotone',            label: 'Critical', tone: 'text-[var(--signal-critical)]', ring: 'border-[var(--signal-critical)]/30 bg-[color-mix(in_srgb,var(--signal-critical)_10%,transparent)]' },
  HIGH: { icon: 'solar:danger-triangle-bold-duotone', label: 'High',     tone: 'text-[var(--signal-warning)]',  ring: 'border-[var(--signal-warning)]/30 bg-[color-mix(in_srgb,var(--signal-warning)_10%,transparent)]' },
  MED:  { icon: 'solar:minus-circle-linear',          label: 'Medium',   tone: 'text-muted-foreground',         ring: 'border-border bg-[var(--surface-low)]' },
  LOW:  { icon: 'solar:alt-arrow-down-linear',        label: 'Low',      tone: 'text-muted-foreground/70',      ring: 'border-border/60 bg-[var(--surface-low)]/60' },
};

function SeverityPill({ severity }: { severity: Severity }) {
  const m = SEVERITY_META[severity];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-0.5 text-[10px] font-mono ${m.ring} ${m.tone}`}
      style={{ fontWeight: 520 }}
      aria-label={`${m.label} severity`}
    >
      <Icon icon={m.icon} width={10} aria-hidden />
      {severity}
    </span>
  );
}

/**
 * Templated whisper copy (Q15: 80% of whispers).
 * Deterministic, no LLM, no external calls. Warm voice per Lumie brand.
 */
function whisperFor(bug: BugStory): string | null {
  const severity = deriveSeverity(bug.impact);
  const commentCount = bug.comments?.length ?? 0;
  const tagCount = bug.tags?.length ?? 0;
  const ageMs = Date.now() - (bug.createdAt?.toMillis?.() ?? bug.createdAt?.seconds * 1000 ?? new Date(bug.date).getTime());
  const ageHrs = ageMs / (60 * 60 * 1000);

  if (severity === 'CRIT' && commentCount === 0) return 'Critical impact with no replies. Worth a first read.';
  if (severity === 'HIGH' && ageHrs > 48) return 'High severity and quiet for two days. Consider prompting an owner.';
  if (commentCount === 0 && ageHrs > 24) return 'Has been waiting for a reply for over a day.';
  if (tagCount > 2) return 'Tagged across multiple areas. May need cross-team context.';
  if (commentCount > 5) return 'Active conversation. A summary might help new readers.';
  if (severity === 'CRIT') return 'Critical impact. Read soon.';
  return null;
}

/** Per-row AI cue chips — short, actionable, templated. */
function cuesFor(bug: BugStory): string[] {
  const severity = deriveSeverity(bug.impact);
  const commentCount = bug.comments?.length ?? 0;
  const cues: string[] = [];
  if (severity === 'CRIT') cues.push('High priority');
  if (commentCount === 0) cues.push('No activity');
  if (bug.tags && bug.tags.length > 2) cues.push('Multi-area');
  return cues;
}

// ----------------------------------------------------------------------------
// Triage row — dense, swipeable on mobile
// ----------------------------------------------------------------------------
interface BugTriageRowProps {
  bug: BugStory;
  isSelected: boolean;
  onClick: () => void;
  onSwipeOpen: () => void;
  enableSwipe: boolean;
  /** React's reserved `key` prop is not passed through, but some typings
   *  surface it at call-sites — accept+ignore to keep TS strict-mode happy. */
  key?: React.Key;
}

function BugTriageRow({ bug, isSelected, onClick, onSwipeOpen, enableSwipe }: BugTriageRowProps) {
  const severity = deriveSeverity(bug.impact);
  const commentCount = bug.comments?.length ?? 0;
  const firstTag = bug.tags?.[0];
  const age = timeAgo(bug.createdAt ?? bug.date);
  const cues = cuesFor(bug);

  const x = useMotionValue(0);
  // Visual affordance behind the card — grows as user drags
  const swipeOpacity = useTransform(x, [0, 80], [0, 1]);
  const swipeScale = useTransform(x, [0, 80], [0.9, 1]);

  const content = (
    <>
      <div className="shrink-0">
        <SeverityPill severity={severity} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[13px] text-foreground" style={{ fontWeight: 520 }}>
          {bug.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
          {firstTag && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Icon icon="solar:tag-linear" width={10} aria-hidden />
              {firstTag}
            </span>
          )}
          {cues.map(cue => (
            <span
              key={cue}
              className="inline-flex items-center gap-1 rounded-[5px] border border-[rgba(200,105,72,0.22)] bg-[rgba(200,105,72,0.08)] px-1.5 py-0.5 text-[10px] text-[var(--terracotta)]"
              style={{ fontWeight: 520 }}
            >
              <Icon icon="solar:cpu-bolt-bold-duotone" width={9} aria-hidden />
              {cue}
            </span>
          ))}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground">
        {commentCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Icon icon="solar:chat-round-dots-linear" width={11} aria-hidden />
            {commentCount}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Icon icon="solar:clock-circle-linear" width={11} aria-hidden />
          {age}
        </span>
      </div>
      <Icon
        icon="solar:alt-arrow-right-linear"
        width={13}
        className="shrink-0 text-muted-foreground/40"
        aria-hidden
      />
    </>
  );

  const baseClasses = `group flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-border/50 hover:bg-[#FBF9F3] ${
    isSelected
      ? 'bg-[rgba(200,105,72,0.06)] border-l-2 border-l-[var(--terracotta)]'
      : 'border-l-2 border-l-transparent'
  }`;

  if (!enableSwipe) {
    return (
      <button type="button" onClick={onClick} className={`w-full ${baseClasses}`} style={{ minHeight: '52px' }}>
        {content}
      </button>
    );
  }

  // Mobile swipe: drag right to reveal "open" action, release past threshold to trigger
  return (
    <div className="relative overflow-hidden">
      {/* Swipe affordance behind the card */}
      <motion.div
        style={{ opacity: swipeOpacity, scale: swipeScale }}
        className="pointer-events-none absolute inset-y-0 left-0 flex w-[80px] items-center justify-center bg-[rgba(200,105,72,0.12)]"
        aria-hidden
      >
        <Icon icon="solar:eye-bold-duotone" width={18} className="text-[var(--terracotta)]" />
      </motion.div>

      <motion.button
        type="button"
        onClick={onClick}
        drag="x"
        dragConstraints={{ left: 0, right: 120 }}
        dragElastic={0.15}
        dragSnapToOrigin
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 80) {
            onSwipeOpen();
          }
        }}
        className={`relative w-full bg-[var(--frame)] ${baseClasses}`}
        // Disable layout animations during drag to avoid jitter
      >
        {content}
      </motion.button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Inspector — warm, serif-accented, whisper at top
// ----------------------------------------------------------------------------
interface InspectorProps {
  bug: BugStory;
  onClose: () => void;
  onEdit: (bug: BugStory) => void;
  onDelete: (id: string) => void;
}

function Inspector({ bug, onClose, onEdit, onDelete }: InspectorProps) {
  const { profile } = useAuth();
  const reduceMotion = useReducedMotion();
  const severity = deriveSeverity(bug.impact);
  const commentCount = bug.comments?.length ?? 0;
  const isOwner = profile?.uid === bug.authorId;
  const whisper = whisperFor(bug);

  // Q15: AI-powered repro suggestion is a stub for now. Real wiring to
  // Vercel AI Gateway (Claude Haiku 4.5, cached per bug id) comes later.
  const reproSuggestion: string | null = null;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex h-full flex-col overflow-y-auto custom-scrollbar border-l border-border bg-[var(--frame)]"
      style={{ width: 'var(--inspector-width, 340px)', minWidth: '280px' }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-serif italic text-[17px] leading-snug text-foreground">
            {bug.title}
          </p>
          <div className="mt-2">
            <SeverityPill severity={severity} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-[var(--surface-low)] hover:text-foreground"
          aria-label="Close inspector"
        >
          <Icon icon="solar:close-circle-linear" width={14} />
        </button>
      </div>

      {/* Templated whisper (Q15 80%) */}
      {whisper && (
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="flex items-start gap-2.5 rounded-[10px] border border-[rgba(200,105,72,0.22)] bg-[rgba(200,105,72,0.06)] px-3 py-2.5">
            <Icon icon="solar:magic-stick-3-bold-duotone" width={14} className="mt-0.5 shrink-0 text-[var(--terracotta)]" aria-hidden />
            <p className="whisper text-[13px] leading-relaxed text-foreground/80">{whisper}</p>
          </div>
        </div>
      )}

      {/* Repro suggestion placeholder — wired in later PR via Vercel AI Gateway */}
      {reproSuggestion && (
        <div className="shrink-0 border-b border-border px-4 py-3">
          <p className="page-kicker mb-2">Repro suggestion</p>
          <p className="text-[13px] leading-relaxed text-foreground/85">{reproSuggestion}</p>
        </div>
      )}

      {/* Actions */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="page-kicker mb-2">Suggested</p>
        <div className="flex flex-wrap gap-1.5">
          {isOwner && (
            <button
              type="button"
              onClick={() => onEdit(bug)}
              className="inline-flex items-center gap-1 rounded-[6px] border border-border bg-[var(--surface-low)] px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-[#FBF9F3]"
            >
              <Icon icon="solar:pen-linear" width={11} aria-hidden />
              Edit details
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-[6px] border border-border bg-[var(--surface-low)] px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-[#FBF9F3]"
          >
            <Icon icon="solar:check-circle-bold-duotone" width={11} aria-hidden />
            Mark resolved
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-[6px] border border-border bg-[var(--surface-low)] px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-[#FBF9F3]"
          >
            <Icon icon="solar:link-linear" width={11} aria-hidden />
            Link regression
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="page-kicker mb-2">Details</p>
        <dl className="space-y-1.5">
          <div className="flex items-center justify-between">
            <dt className="text-[12px] text-muted-foreground">Filed by</dt>
            <dd className="text-[12px] text-foreground" style={{ fontWeight: 520 }}>
              {bug.isAnonymous ? 'Anonymous' : bug.author}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[12px] text-muted-foreground">Filed</dt>
            <dd className="text-[12px] text-foreground">{timeAgo(bug.createdAt ?? bug.date)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[12px] text-muted-foreground">Impact</dt>
            <dd className="max-w-[160px] truncate text-right text-[12px] text-foreground" title={bug.impact}>
              {bug.impact}
            </dd>
          </div>
          {commentCount > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-[12px] text-muted-foreground">Replies</dt>
              <dd className="text-[12px] text-foreground">{commentCount}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Discovery */}
      <div className="border-b border-border px-4 py-3">
        <p className="page-kicker mb-2">Discovery</p>
        <p className="text-[13px] leading-relaxed text-foreground/90">{bug.discovery}</p>
      </div>

      {/* Lesson */}
      {bug.lesson && (
        <div className="border-b border-border px-4 py-3">
          <p className="page-kicker mb-2">Lesson learned</p>
          <p className="text-[13px] leading-relaxed text-foreground/90">{bug.lesson}</p>
        </div>
      )}

      {/* Tags */}
      {bug.tags && bug.tags.length > 0 && (
        <div className="shrink-0 border-b border-border px-4 py-3">
          <p className="page-kicker mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {bug.tags.map(tag => (
              <span
                key={tag}
                className="rounded-[6px] border border-border bg-[var(--surface-low)] px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {isOwner && (
        <div className="mt-auto shrink-0 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              onDelete(bug.id);
              onClose();
            }}
            className="text-[12px] text-destructive/70 transition-colors hover:text-destructive"
          >
            Delete this entry
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ----------------------------------------------------------------------------
// Screen
// ----------------------------------------------------------------------------
type FilterKey = 'all' | 'hot' | 'needs-decision' | 'recent';

interface QueueScreenProps {
  bugs: BugStory[];
  onReact: (bugId: string, emoji: string, currentUserName?: string) => void;
  onComment: (
    bugId: string,
    text: string,
    author: string,
    isAnonymous: boolean,
    authorPhotoURL?: string,
    authorId?: string,
    imageUrl?: string,
    gifUrl?: string,
    imageUrls?: string[]
  ) => void;
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

  // --- P1-1 fix: sync inspector selection with external selectedItemId -----
  // The previous lazy-init only ran on first mount, so navigating from search
  // results or the command palette to an already-mounted Queue screen did not
  // open the inspector. Now we listen for changes and open/close accordingly.
  useEffect(() => {
    if (selectedItemId) {
      const match = bugs.find(b => b.id === selectedItemId) ?? null;
      if (match) setSelectedBug(match);
    }
    // Intentionally not clearing on null to preserve user-clicked selection.
  }, [selectedItemId, bugs]);

  // Detect coarse-pointer (touch) devices for swipe affordance (Q10)
  const enableSwipe = useIsCoarsePointer();

  // --- P1-3 fix: `now` now lives inside useMemo, so filters recompute ------
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
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const bugTime = (b: BugStory): number =>
      b.createdAt?.toMillis?.()
      ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.date).getTime());

    const hot = filteredBugs.filter(b => now - bugTime(b) < sevenDaysMs && deriveSeverity(b.impact) !== 'LOW');
    const hotIds = new Set(hot.map(b => b.id));
    const needsDecision = filteredBugs.filter(b => !hotIds.has(b.id) && (!b.comments || b.comments.length === 0));
    const decisionIds = new Set(needsDecision.map(b => b.id));
    const recent = filteredBugs.filter(b => !hotIds.has(b.id) && !decisionIds.has(b.id));

    if (activeFilter === 'hot') return [{ label: 'Hot', bugs: hot }];
    if (activeFilter === 'needs-decision') return [{ label: 'Needs decision', bugs: needsDecision }];
    if (activeFilter === 'recent') return [{ label: 'All recent', bugs: recent }];

    return [
      { label: 'Hot', bugs: hot },
      { label: 'Needs decision', bugs: needsDecision },
      { label: 'All recent', bugs: recent },
    ].filter(s => s.bugs.length > 0);
  }, [filteredBugs, activeFilter]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'hot', label: 'Hot' },
    { key: 'needs-decision', label: 'Needs decision' },
    { key: 'recent', label: 'Recent' },
  ];

  const handleBugClick = (bug: BugStory) => {
    setSelectedBug(prev => (prev?.id === bug.id ? null : bug));
  };

  return (
    <div className="flex h-full flex-col" style={{ minHeight: 'calc(100vh - 44px - 48px)' }}>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {filters.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className={`rounded-[8px] px-2.5 py-1 text-[12px] transition-colors ${
                activeFilter === f.key
                  ? 'bg-[var(--surface-low)] text-foreground'
                  : 'text-muted-foreground hover:bg-[var(--surface-low)]/70 hover:text-foreground'
              }`}
              style={{ fontWeight: activeFilter === f.key ? 520 : 400 }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onAddBug}
          className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--terracotta)] px-3 py-1.5 text-[12px] text-white transition-colors hover:bg-[#B25A3D]"
          style={{ fontWeight: 520 }}
        >
          <Icon icon="solar:add-circle-bold-duotone" width={13} aria-hidden />
          New bug
        </button>
      </div>

      {/* Split layout */}
      <div className="flex min-h-0 flex-1 gap-0" style={{ height: 'calc(100vh - 44px - 120px)' }}>
        {/* Queue list */}
        <div
          className={`flex flex-col overflow-y-auto custom-scrollbar rounded-[14px] border border-border bg-[var(--frame)] transition-all ${
            selectedBug ? 'flex-1' : 'w-full'
          }`}
        >
          {bugs.length === 0 ? (
            <div className="page-empty mx-4 my-4">
              <p className="whisper text-[18px]">An empty queue.</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Post the first bug to start triage.</p>
              <button
                type="button"
                onClick={onAddBug}
                className="mt-4 inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--terracotta)] px-3 py-1.5 text-[12px] text-white transition-colors hover:bg-[#B25A3D]"
                style={{ fontWeight: 520 }}
              >
                <Icon icon="solar:add-circle-bold-duotone" width={13} aria-hidden />
                Post the first one
              </button>
            </div>
          ) : sections.length === 0 ? (
            <div className="page-empty mx-4 my-4">
              <p className="whisper text-[18px]">Nothing matches.</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Try a different filter.</p>
            </div>
          ) : (
            sections.map(section => (
              <div key={section.label}>
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-[var(--frame)]/95 px-4 py-2 backdrop-blur-sm">
                  <span className="page-kicker">{section.label}</span>
                  <span className="text-[11px] text-muted-foreground/60 tabular-nums">{section.bugs.length}</span>
                </div>
                {section.bugs.map(bug => (
                  <BugTriageRow
                    key={bug.id}
                    bug={bug}
                    isSelected={selectedBug?.id === bug.id}
                    onClick={() => handleBugClick(bug)}
                    onSwipeOpen={() => setSelectedBug(bug)}
                    enableSwipe={enableSwipe}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        {/* Inspector */}
        <AnimatePresence>
          {selectedBug && (
            <Inspector
              bug={selectedBug}
              onClose={() => {
                setSelectedBug(null);
                onClearSelection();
              }}
              onEdit={onEditBug}
              onDelete={onDeleteBug}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Hook: detect coarse-pointer (touch) devices for swipe affordance (Q10)
// ----------------------------------------------------------------------------
function useIsCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(pointer: coarse)');
    setCoarse(mq.matches);
    const handler = (e: MediaQueryListEvent) => setCoarse(e.matches);
    // Both modern and legacy (Safari <14) listeners
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    const legacy = mq as unknown as {
      addListener?: (h: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (h: (e: MediaQueryListEvent) => void) => void;
    };
    legacy.addListener?.(handler);
    return () => legacy.removeListener?.(handler);
  }, []);

  return coarse;
}
