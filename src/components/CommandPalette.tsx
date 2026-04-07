import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bug,
  Lightbulb,
  BookOpen,
  Sparkles,
  Focus,
  LayoutDashboard,
  PlusCircle,
  Search,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Screen, BugStory, Tip, Proposal, Achievement } from '../types';

interface CommandItem {
  id: string;
  icon: React.ElementType;
  label: string;
  description?: string;
  group: 'navigate' | 'create' | 'search';
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  onCreateEntry: (type: 'bug' | 'tip' | 'knowledge' | 'achievement') => void;
  bugs: BugStory[];
  tips: Tip[];
  proposals: Proposal[];
  achievements: Achievement[];
  isAdmin?: boolean;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onCreateEntry,
  bugs,
  tips,
  proposals,
  achievements,
  isAdmin,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setFocusedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const navCommands: CommandItem[] = [
    { id: 'nav-dashboard', icon: LayoutDashboard, label: 'Dashboard', description: 'Welcome and pulse', group: 'navigate', onSelect: () => { onNavigate('dashboard'); onClose(); } },
    { id: 'nav-bugs', icon: Bug, label: 'Bug Wall', description: 'Stories from the trenches', group: 'navigate', onSelect: () => { onNavigate('bug-wall'); onClose(); } },
    { id: 'nav-tips', icon: Lightbulb, label: 'Tips & Tricks', description: 'Practical shortcuts', group: 'navigate', onSelect: () => { onNavigate('tips-tricks'); onClose(); } },
    { id: 'nav-knowledge', icon: BookOpen, label: 'Knowledge Sharing', description: 'Guides and ideas', group: 'navigate', onSelect: () => { onNavigate('knowledge-sharing'); onClose(); } },
    { id: 'nav-achievements', icon: Sparkles, label: 'Achievements', description: 'Celebrate wins', group: 'navigate', onSelect: () => { onNavigate('achievements'); onClose(); } },
    { id: 'nav-focus', icon: Focus, label: 'Focus Zone', description: 'Reset and breathe', group: 'navigate', onSelect: () => { onNavigate('focus-zone'); onClose(); } },
    ...(isAdmin ? [{ id: 'nav-admin', icon: ShieldCheck, label: 'Admin Panel', description: 'Admin tools', group: 'navigate' as const, onSelect: () => { onNavigate('admin-dashboard'); onClose(); } }] : []),
  ];

  const createCommands: CommandItem[] = [
    { id: 'create-bug', icon: Bug, label: 'Post a Bug Story', description: 'Share a hard-earned lesson', group: 'create', onSelect: () => { onCreateEntry('bug'); onClose(); } },
    { id: 'create-tip', icon: Lightbulb, label: 'Contribute a Tip', description: 'Leave a practical shortcut', group: 'create', onSelect: () => { onCreateEntry('tip'); onClose(); } },
    { id: 'create-knowledge', icon: BookOpen, label: 'Submit Knowledge Post', description: 'Share a guide or idea', group: 'create', onSelect: () => { onCreateEntry('knowledge'); onClose(); } },
    { id: 'create-achievement', icon: Sparkles, label: 'Log Achievement', description: 'Capture a win', group: 'create', onSelect: () => { onCreateEntry('achievement'); onClose(); } },
  ];

  const searchResults: CommandItem[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const results: CommandItem[] = [];

    bugs.forEach(b => {
      if (b.title.toLowerCase().includes(q) || b.discovery.toLowerCase().includes(q))
        results.push({ id: `s-bug-${b.id}`, icon: Bug, label: b.title, description: 'Bug story', group: 'search', onSelect: () => { onNavigate('bug-wall'); onClose(); } });
    });
    tips.forEach(t => {
      if (t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q))
        results.push({ id: `s-tip-${t.id}`, icon: Lightbulb, label: t.title, description: 'Tip', group: 'search', onSelect: () => { onNavigate('tips-tricks'); onClose(); } });
    });
    proposals.forEach(p => {
      if (p.title.toLowerCase().includes(q) || p.scope.toLowerCase().includes(q))
        results.push({ id: `s-prop-${p.id}`, icon: BookOpen, label: p.title, description: 'Knowledge post', group: 'search', onSelect: () => { onNavigate('knowledge-sharing'); onClose(); } });
    });
    achievements.forEach(a => {
      if (a.title.toLowerCase().includes(q) || a.story.toLowerCase().includes(q))
        results.push({ id: `s-ach-${a.id}`, icon: Sparkles, label: a.title, description: 'Achievement', group: 'search', onSelect: () => { onNavigate('achievements'); onClose(); } });
    });

    return results.slice(0, 8);
  }, [query, bugs, tips, proposals, achievements]);

  const filteredNavCommands = query
    ? navCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : navCommands;

  const filteredCreateCommands = query
    ? createCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : createCommands;

  // Build visible items list for keyboard nav
  const allItems: CommandItem[] = query
    ? [...searchResults, ...filteredNavCommands, ...filteredCreateCommands]
    : [...navCommands, ...createCommands];

  useEffect(() => {
    setFocusedIndex(0);
  }, [query]);

  // Scroll focused item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.querySelector(`[data-focused="true"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + 1, allItems.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && allItems[focusedIndex]) {
      allItems[focusedIndex].onSelect();
    }
  };

  const renderGroup = (items: CommandItem[], label: string, startOffset: number) => {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground" style={{ fontWeight: 510 }}>
          {label}
        </p>
        {items.map((item, localIdx) => {
          const globalIdx = startOffset + localIdx;
          const isFocused = focusedIndex === globalIdx;
          return (
            <button
              key={item.id}
              data-focused={isFocused}
              onClick={item.onSelect}
              onMouseEnter={() => setFocusedIndex(globalIdx)}
              className={`flex w-full items-center gap-3 rounded-[6px] px-3 py-2.5 text-left transition-colors ${
                isFocused ? 'bg-primary/12 text-primary' : 'text-foreground hover:bg-input'
              }`}
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] ${
                isFocused ? 'bg-primary/15 text-primary' : 'bg-input text-muted-foreground'
              }`}>
                <item.icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px]" style={{ fontWeight: isFocused ? 510 : 400 }}>{item.label}</p>
                {item.description && (
                  <p className="truncate text-[11px] text-muted-foreground">{item.description}</p>
                )}
              </div>
              {isFocused && <ArrowRight size={13} className="shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>
    );
  };

  // Compute group start offsets for keyboard nav
  const searchOffset = 0;
  const navOffset = query ? searchResults.length : 0;
  const createOffset = query ? searchResults.length + filteredNavCommands.length : navCommands.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[80] bg-black/60"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed left-1/2 top-[15%] z-[90] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-[12px] border border-border bg-card shadow-[rgba(0,0,0,0.5)_0px_16px_48px,rgba(0,0,0,0.3)_0px_0px_0px_1px]"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search size={15} className="shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search or jump to…"
                className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <kbd className="hidden rounded-[4px] border border-border bg-input px-1.5 py-0.5 text-[11px] text-muted-foreground sm:block">
                esc
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2">
              {query ? (
                <>
                  {searchResults.length === 0 && filteredNavCommands.length === 0 && filteredCreateCommands.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-[13px] text-muted-foreground">No results for <span className="text-foreground">"{query}"</span></p>
                    </div>
                  ) : (
                    <>
                      {renderGroup(searchResults, 'Results', searchOffset)}
                      {renderGroup(filteredNavCommands, 'Navigate', navOffset)}
                      {renderGroup(filteredCreateCommands, 'Create', createOffset)}
                    </>
                  )}
                </>
              ) : (
                <>
                  {renderGroup(navCommands, 'Navigate', navOffset)}
                  {renderGroup(createCommands, 'Create', createOffset)}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 border-t border-border px-4 py-2">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <kbd className="rounded-[3px] border border-border bg-input px-1 text-[10px]">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <kbd className="rounded-[3px] border border-border bg-input px-1 text-[10px]">↵</kbd> select
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <kbd className="rounded-[3px] border border-border bg-input px-1 text-[10px]">esc</kbd> close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
