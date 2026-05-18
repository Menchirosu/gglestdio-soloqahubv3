import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Tip, Proposal } from '../types';

// Lazy load existing screens to reuse them inside tabs
const TipsTricksScreen = React.lazy(() =>
  import('./TipsTricksScreen').then(m => ({ default: m.TipsTricksScreen }))
);
const KnowledgeSharingScreen = React.lazy(() =>
  import('./KnowledgeSharingScreen').then(m => ({ default: m.KnowledgeSharingScreen }))
);

type TabKey = 'tips' | 'knowledge';

interface ContributeScreenProps {
  defaultTab?: TabKey;
  tips: Tip[];
  proposals: Proposal[];
  onAddTip: () => void;
  onDeleteTip: (tipId: string) => void;
  onEditTip: (tip: Tip) => void;
  onReact: (tipId: string, emoji: string, currentUserName?: string) => void;
  onAddProposal: () => void;
  onDeleteProposal: (proposalId: string) => void;
  onEditProposal: (proposal: Proposal) => void;
  onUpdateProposal: (proposalId: string, proposal: Partial<Proposal>) => void | Promise<void>;
  isAdmin?: boolean;
  searchQuery: string;
  selectedItemId: string | null;
  onClearSelection: () => void;
}

export function ContributeScreen({
  defaultTab = 'tips',
  tips,
  proposals,
  onAddTip,
  onDeleteTip,
  onEditTip,
  onReact,
  onAddProposal,
  onDeleteProposal,
  onEditProposal,
  onUpdateProposal,
  isAdmin = false,
  searchQuery,
  selectedItemId,
  onClearSelection,
}: ContributeScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const tabs: { key: TabKey; label: string; icon: string; count: number }[] = [
    { key: 'tips', label: 'Tips & Tricks', icon: 'solar:lightbulb-bold-duotone', count: tips.length },
    { key: 'knowledge', label: 'Knowledge Posts', icon: 'solar:book-bookmark-bold-duotone', count: proposals.length },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="page-hero px-6 py-6 md:px-8">
          <p className="page-kicker">Shared craft</p>
          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h1 className="page-title-serif text-[32px] text-foreground">
                Contribute
              </h1>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                Keep the team useful to itself. Publish a practical tip or turn a lesson into a reusable knowledge post.
              </p>
            </div>
            <div className="rounded-[18px] border border-border bg-card/70 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Mode</p>
              <p className="mt-1 text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                {activeTab === 'tips' ? 'Fast operational advice' : 'Longer-form reusable knowledge'}
              </p>
            </div>
          </div>
        </div>

        <div className="shell-tab-group contribute-tab-group w-full overflow-x-auto scrollbar-hide">
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={isActive}
                className={`shell-tab contribute-tab ${isActive ? 'shell-tab-active' : ''}`}
                style={{ fontWeight: isActive ? 620 : 520 }}
              >
                <Icon icon={tab.icon} width={15} height={15} />
                <span className="text-[13px] leading-tight sm:whitespace-nowrap">{tab.label}</span>
                <span className={`shell-tab-count tabular-nums ${isActive ? 'bg-white/14 text-white' : 'bg-secondary/70 text-muted-foreground'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <React.Suspense fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="whisper text-[13px] text-muted-foreground" style={{ fontStyle: 'italic' }}>Loading contributions…</p>
        </div>
      }>
        {activeTab === 'tips' && (
          <TipsTricksScreen
            tips={tips}
            onAddTip={onAddTip}
            onDeleteTip={onDeleteTip}
            onEditTip={onEditTip}
            onReact={onReact}
            searchQuery={searchQuery}
            selectedItemId={selectedItemId}
            onClearSelection={onClearSelection}
          />
        )}
        {activeTab === 'knowledge' && (
          <KnowledgeSharingScreen
            proposals={proposals}
            onAddProposal={onAddProposal}
            onDeleteProposal={onDeleteProposal}
            onEditProposal={onEditProposal}
            onUpdateProposal={onUpdateProposal}
            searchQuery={searchQuery}
            selectedItemId={selectedItemId}
            onClearSelection={onClearSelection}
            isAdmin={isAdmin}
          />
        )}
      </React.Suspense>
    </div>
  );
}
