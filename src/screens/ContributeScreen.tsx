import React, { useState, useEffect } from 'react';
import { Lightbulb, BookOpen } from 'lucide-react';
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
  searchQuery,
  selectedItemId,
  onClearSelection,
}: ContributeScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const tabs: { key: TabKey; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'tips', label: 'Tips & Tricks', icon: Lightbulb, count: tips.length },
    { key: 'knowledge', label: 'Knowledge Posts', icon: BookOpen, count: proposals.length },
  ];

  return (
    <div className="space-y-4">
      {/* Header + tab switcher */}
      <div className="space-y-3">
        <div>
          <h1 className="text-[20px] text-foreground" style={{ fontWeight: 590, letterSpacing: '-0.03em' }}>
            Contribute
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Share tips and knowledge with the team.</p>
        </div>

        <div className="flex items-center gap-1 border-b border-border">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[13px] border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                style={{ fontWeight: isActive ? 510 : 400 }}
              >
                <Icon size={13} />
                {tab.label}
                <span className={`text-[11px] ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <React.Suspense fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
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
            searchQuery={searchQuery}
            selectedItemId={selectedItemId}
            onClearSelection={onClearSelection}
          />
        )}
      </React.Suspense>
    </div>
  );
}
