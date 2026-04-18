import React, { useState, useEffect, Suspense } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'motion/react';

import { Screen, BugStory, Tip, Proposal } from './types';
import { useStorage } from './hooks/useStorage';
import { useToast, Toast } from './components/Toast';
import { Modal } from './components/Modal';
import { BugForm } from './components/BugForm';
import { TipForm } from './components/TipForm';
import { ProposalForm } from './components/ProposalForm';
import { AchievementForm } from './components/AchievementForm';
import { EntrySelectorModal } from './components/EntrySelectorModal';
import { ProfileForm } from './components/ProfileForm';
import { SearchProvider, useSearch } from './SearchContext';
import { AuthProvider, useAuth } from './AuthContext';
import { LoginScreen, PendingApprovalScreen } from './screens/AuthScreens';
import { logout, updatePresence, subscribeToPresence } from './firebase';
import { SearchResultsPopup } from './components/SearchResultsPopup';
import { CommandPalette } from './components/CommandPalette';

// Lazy-loaded screens
const OverviewScreen = React.lazy(() =>
  import('./screens/OverviewScreen').then(m => ({ default: m.OverviewScreen }))
);
const QueueScreen = React.lazy(() =>
  import('./screens/QueueScreen').then(m => ({ default: m.QueueScreen }))
);
const SignalsScreen = React.lazy(() =>
  import('./screens/SignalsScreen').then(m => ({ default: m.SignalsScreen }))
);
const ContributeScreen = React.lazy(() =>
  import('./screens/ContributeScreen').then(m => ({ default: m.ContributeScreen }))
);
const AchievementsScreen = React.lazy(() =>
  import('./screens/AchievementsScreen').then(m => ({ default: m.AchievementsScreen }))
);
const FocusZoneScreen = React.lazy(() =>
  import('./screens/FocusZoneScreen').then(m => ({ default: m.FocusZoneScreen }))
);
const AdminDashboard = React.lazy(() =>
  import('./screens/AdminDashboard').then(m => ({ default: m.AdminDashboard }))
);

function ScreenLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-5 w-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading, isApproved } = useAuth();

  // Lumie is light-only (Q4). Strip any legacy dark-mode preference once.
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('darkMode');
    } catch {
      // ignore storage access errors (e.g. privacy mode)
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  if (!isApproved) return <PendingApprovalScreen />;

  return (
    <SearchProvider>
      <MainApp />
    </SearchProvider>
  );
}

function MainApp() {
  const { profile, isAdmin } = useAuth();
  const { searchQuery, setSearchQuery, selectedItemId, setSelectedItemId } = useSearch();
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [activeModal, setActiveModal] = useState<{ type: string; data?: any } | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchResultsOpen, setIsSearchResultsOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState<{ uid: string; displayName: string; photoURL: string }[]>([]);
  const [noiseEnabled, setNoiseEnabled] = useState(() => {
    try { return localStorage.getItem('lumie-noise') !== 'off'; } catch { return true; }
  });

  const {
    bugs, tips, proposals, achievements, notifications,
    addBug, deleteBug, editBug, addTip, deleteTip, editTip,
    addProposal, deleteProposal, editProposal,
    addAchievement, deleteAchievement, editAchievement,
    reactToBug, reactToTip, addCommentToBug, reactToComment,
    replyToComment, deleteComment, editComment, updateUserAvatars,
    markNotificationAsRead, markAllNotificationsAsRead,
  } = useStorage(currentScreen);

  const { toast, showToast } = useToast();

  useEffect(() => {
    if (profile?.uid && profile?.photoURL) {
      updateUserAvatars(profile.uid, profile.photoURL, profile.displayName);
    }
  }, [profile?.uid, profile?.photoURL, profile?.displayName]);

  useEffect(() => {
    if (!profile?.uid) return;
    const ping = () => updatePresence(profile.uid, profile.displayName || '', profile.photoURL || '');
    ping();
    const interval = setInterval(ping, 60_000);
    return () => clearInterval(interval);
  }, [profile?.uid]);

  useEffect(() => {
    const unsub = subscribeToPresence(setActiveUsers);
    return unsub;
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-noise', noiseEnabled ? 'on' : 'off');
    try { localStorage.setItem('lumie-noise', noiseEnabled ? 'on' : 'off'); } catch { /* ignore */ }
  }, [noiseEnabled]);

  useEffect(() => {
    setIsSearchResultsOpen(searchQuery.trim().length > 1);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const railItems: { id: Screen; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Overview', icon: 'solar:widget-5-bold-duotone' },
    { id: 'bug-wall', label: 'Queue', icon: 'solar:bug-bold-duotone' },
    { id: 'signals', label: 'Signals', icon: 'solar:chart-2-bold-duotone' },
    { id: 'tips-tricks', label: 'Contribute', icon: 'solar:book-bold-duotone' },
    { id: 'focus-zone', label: 'Focus', icon: 'solar:target-bold-duotone' },
    { id: 'achievements', label: 'Recognition', icon: 'solar:medal-ribbons-bold-duotone' },
  ];

  const workspaceLabels: Record<string, string> = {
    dashboard: 'Overview',
    'bug-wall': 'Queue',
    signals: 'Signals',
    'tips-tricks': 'Contribute',
    'knowledge-sharing': 'Contribute',
    'focus-zone': 'Focus',
    achievements: 'Recognition',
    'admin-dashboard': 'Admin',
  };

  const navigateTo = (screen: Screen) => {
    // Remap old knowledge-sharing to contribute workspace
    if (screen === 'knowledge-sharing') {
      setCurrentScreen('tips-tricks');
    } else {
      setCurrentScreen(screen);
    }
  };

  const handleEntrySelect = (type: 'bug' | 'tip' | 'knowledge' | 'achievement') => {
    if (type === 'bug') setActiveModal({ type: 'bug' });
    if (type === 'tip') setActiveModal({ type: 'tip' });
    if (type === 'knowledge') setActiveModal({ type: 'proposal' });
    if (type === 'achievement') setActiveModal({ type: 'achievement' });
  };

  const handleBugSubmit = async (bug: any) => {
    try {
      await addBug(bug);
      showToast('Bug story posted successfully!');
    } catch {
      showToast('Failed to post bug story. Please try again.', 'error');
    }
  };

  const handleTipSubmit = async (tip: any) => {
    try {
      await addTip(tip);
      showToast('Tip shared with the community!');
    } catch {
      showToast('Failed to share tip.', 'error');
    }
  };

  const handleProposalSubmit = async (proposal: any) => {
    try {
      await addProposal(proposal);
      showToast('Proposal submitted!');
    } catch {
      showToast('Failed to submit proposal.', 'error');
    }
  };

  const handleAchievementSubmit = async (achievement: any) => {
    try {
      await addAchievement(achievement);
      showToast('Achievement captured successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        const parsed = JSON.parse(message);
        if (parsed?.path === 'achievements') {
          showToast('Achievement save blocked. Check console for debug info.', 'error');
          return;
        }
      } catch {
        // non-JSON error payload
      }
      if (message.includes('permission') || message.includes('Missing or insufficient permissions')) {
        showToast('Permission denied. Please ensure you are logged in and approved.', 'error');
        return;
      }
      showToast('Failed to save achievement.', 'error');
    }
  };

  const sanitizeText = (text: string) =>
    text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] ?? c));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      showToast(`Searching for: ${sanitizeText(searchQuery.trim().slice(0, 60))}…`);
    }
  };

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    const results: any[] = [];
    bugs.forEach(b => {
      if (b.title.toLowerCase().includes(query) || b.discovery.toLowerCase().includes(query))
        results.push({ id: b.id, title: b.title, type: 'bug', screen: 'bug-wall' });
    });
    tips.forEach(t => {
      if (t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query))
        results.push({ id: t.id, title: t.title, type: 'tip', screen: 'tips-tricks' });
    });
    proposals.forEach(p => {
      if (p.title.toLowerCase().includes(query) || p.scope.toLowerCase().includes(query))
        results.push({ id: p.id, title: p.title, type: 'proposal', screen: 'tips-tricks' });
    });
    achievements.forEach(a => {
      if (a.title.toLowerCase().includes(query) || a.story.toLowerCase().includes(query) || a.impact.toLowerCase().includes(query))
        results.push({ id: a.id, title: a.title, type: 'achievement', screen: 'achievements' });
    });
    return results.slice(0, 10);
  }, [searchQuery, bugs, tips, proposals, achievements]);

  const handleResultClick = (result: any) => {
    navigateTo(result.screen as Screen);
    setIsSearchResultsOpen(false);
    setSelectedItemId(result.id);
    setSearchQuery('');
    showToast(`Navigating to ${result.type}: ${sanitizeText(result.title)}`);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const activeRailId = currentScreen === 'knowledge-sharing' ? 'tips-tricks' : currentScreen;

  return (
    <div className="flex h-screen lumie-canvas lumie-noise relative text-foreground overflow-hidden">

      {/* Compact Icon Rail — desktop only. Sits on warm canvas, outside the cream card (Q3). */}
      <aside data-testid="icon-rail" className="hidden md:flex flex-col w-[52px] shrink-0 h-full shell-rail z-40">
        {/* Logo mark — aligns with command bar height */}
        <div className="flex h-[44px] items-center justify-center shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary/14 text-primary">
            <Icon icon="solar:bug-minimalistic-bold-duotone" width={12} height={12} />
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col items-center gap-0.5 px-2 py-3 flex-1">
          {railItems.map(item => (
            <div key={item.id} className="relative w-full flex justify-center">
              {activeRailId === item.id && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <button
                title={item.label}
                data-testid={`rail-nav-${item.id}`}
                onClick={() => {
                  navigateTo(item.id);
                  setSearchQuery('');
                  setSelectedItemId(null);
                  setIsSearchResultsOpen(false);
                }}
                className={`flex h-[36px] w-[36px] items-center justify-center rounded-[6px] transition-colors ${
                  activeRailId === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <Icon icon={item.icon} width={15} height={15} />
              </button>
            </div>
          ))}
        </nav>

        {/* Bottom: admin + user avatar */}
        <div className="flex flex-col items-center gap-1 px-2 py-3">
          {isAdmin && (
            <div className="relative w-full flex justify-center">
              {currentScreen === 'admin-dashboard' && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <button
                title="Admin"
                onClick={() => navigateTo('admin-dashboard')}
                className={`flex h-[36px] w-[36px] items-center justify-center rounded-[6px] transition-colors ${
                  currentScreen === 'admin-dashboard'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <Icon icon="solar:shield-check-bold-duotone" width={15} height={15} />
              </button>
            </div>
          )}
          <button
            title={profile?.displayName || 'Profile'}
            onClick={() => setActiveModal({ type: 'profile' })}
            className="relative mt-1 h-7 w-7 overflow-hidden rounded-full border border-border hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <img
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`}
              alt="Profile"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full bg-green-500 ring-1 ring-panel" />
          </button>
          <button
            onClick={() => setNoiseEnabled(v => !v)}
            title={noiseEnabled ? 'Disable paper texture' : 'Enable paper texture'}
            className={`flex h-[28px] w-[28px] items-center justify-center rounded-[6px] transition-colors ${
              noiseEnabled ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground/40 hover:bg-secondary/50 hover:text-muted-foreground'
            }`}
          >
            <Icon icon="solar:layers-bold-duotone" width={13} height={13} />
          </button>
          <button
            onClick={logout}
            title="Sign out"
            className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Icon icon="solar:logout-bold-duotone" width={13} height={13} />
          </button>
        </div>
      </aside>

      {/* Main area — wrapped in Lumie framed cream card (24px radius on desktop, edge-to-edge on mobile) */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden md:py-3 md:pr-3">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden lumie-frame">

        {/* Command Bar */}
        <header className={`flex h-[44px] shrink-0 items-center gap-2 border-b border-border bg-frame px-3 ${isSearchResultsOpen ? 'z-[60]' : 'z-30'} relative`}>
          {/* Workspace label */}
          <span className="hidden md:block text-[12px] text-muted-foreground shrink-0 select-none min-w-[72px]" style={{ fontWeight: 500 }}>
            {workspaceLabels[currentScreen] ?? 'Overview'}
          </span>
          <span className="hidden md:block h-4 w-px bg-border shrink-0" />

          {/* Search trigger (desktop) */}
          <div className="flex flex-1 items-center min-w-0">
            <button
              data-testid="command-palette-trigger"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="shell-command-anchor hidden md:flex w-full max-w-sm"
            >
              <Icon icon="solar:magnifer-bold-duotone" width={12} height={12} />
              <span className="text-[12px]">Search issues, actions, commands...</span>
              <kbd className="ml-auto rounded-[4px] border border-border/80 bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Ctrl K
              </kbd>
            </button>

            {/* Mobile search */}
            <form onSubmit={handleSearch} className="relative w-full md:hidden">
              <Icon icon="solar:magnifer-bold-duotone" width={13} height={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setSelectedItemId(null);
                  setIsSearchResultsOpen(e.target.value.trim().length > 1);
                }}
                onFocus={() => { if (searchQuery.trim().length > 1) setIsSearchResultsOpen(true); }}
                placeholder="Search..."
                className="w-full rounded-[6px] border border-border bg-input py-1 pl-8 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-ring/50 focus:outline-none focus:ring-1 focus:ring-ring/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSelectedItemId(null); setIsSearchResultsOpen(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[4px] p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <Icon icon="solar:close-bold" width={12} height={12} />
                </button>
              )}
              <SearchResultsPopup
                isOpen={isSearchResultsOpen}
                onClose={() => { setIsSearchResultsOpen(false); setSearchQuery(''); }}
                results={searchResults}
                onResultClick={handleResultClick}
                searchQuery={searchQuery}
              />
            </form>
          </div>

          {/* Right utilities */}
          <div className="flex items-center gap-1 shrink-0">
            {/* New entry */}
            <button
              onClick={() => setActiveModal({ type: 'selector' })}
              className="hidden md:flex items-center gap-1 rounded-[6px] border border-border/70 bg-input/60 px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
              style={{ fontWeight: 510 }}
            >
              <Icon icon="solar:add-circle-bold-duotone" width={11} height={11} />
              New
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="shell-utility-button relative"
                title={`Notifications${unreadCount > 0 ? ` · ${unreadCount} unread` : ''}`}
              >
                <Icon icon="solar:bell-bold-duotone" width={14} height={14} />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-[8px] border border-border bg-card shadow-[rgba(0,0,0,0.3)_0px_8px_24px,rgba(0,0,0,0.2)_0px_0px_0px_1px]"
                    >
                      <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <h4 className="text-[13px] text-foreground" style={{ fontWeight: 590 }}>
                          Notifications
                        </h4>
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="text-[11px] text-primary hover:underline focus-visible:outline-none"
                          style={{ fontWeight: 510 }}
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-[12px] text-muted-foreground">No notifications yet.</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              onClick={() => {
                                markNotificationAsRead(n.id);
                                if (n.targetScreen) {
                                  navigateTo(n.targetScreen);
                                  setIsNotificationsOpen(false);
                                }
                              }}
                              className={`relative cursor-pointer border-b border-border px-4 py-3 transition-colors hover:bg-surface-container-low ${!n.isRead ? 'bg-primary/5' : ''}`}
                            >
                              {!n.isRead && (
                                <span className="absolute left-1.5 top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                              )}
                              <p className="text-[13px] text-foreground" style={{ fontWeight: 510 }}>
                                {n.title}
                              </p>
                              <p className="mt-0.5 text-[12px] text-muted-foreground">{n.desc}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground/60">{n.time}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="border-t border-border px-4 py-2 text-center">
                        <p className="text-[11px] text-muted-foreground">
                          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Search backdrop */}
        <AnimatePresence>
          {isSearchResultsOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="fixed inset-0 z-[55] bg-black/40"
              onClick={() => { setIsSearchResultsOpen(false); setSearchQuery(''); }}
            />
          )}
        </AnimatePresence>

        {/* Workspace content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="min-h-full"
            >
              <div className="mx-auto max-w-[82rem] px-5 py-5 pb-24 md:pb-6">
                <Suspense fallback={<ScreenLoader />}>
                  {currentScreen === 'dashboard' && (
                    <OverviewScreen
                      onNavigate={navigateTo}
                      onShare={() => setActiveModal({ type: 'selector' })}
                      bugs={bugs}
                      tips={tips}
                      proposals={proposals}
                      achievements={achievements}
                      searchQuery={searchQuery}
                      activeUsers={activeUsers}
                      userName={profile?.displayName ?? ''}
                    />
                  )}
                  {currentScreen === 'bug-wall' && (
                    <QueueScreen
                      bugs={bugs}
                      onReact={reactToBug}
                      onComment={addCommentToBug}
                      onReactComment={reactToComment}
                      onReplyComment={replyToComment}
                      onDeleteBug={deleteBug}
                      onEditBug={bug => setActiveModal({ type: 'edit-bug', data: bug })}
                      onAddBug={() => setActiveModal({ type: 'bug' })}
                      onDeleteComment={deleteComment}
                      onEditComment={editComment}
                      searchQuery={searchQuery}
                      selectedItemId={selectedItemId}
                      onClearSelection={() => setSelectedItemId(null)}
                      showToast={showToast}
                      onAddBugSubmit={handleBugSubmit}
                    />
                  )}
                  {currentScreen === 'signals' && (
                    <SignalsScreen bugs={bugs} tips={tips} />
                  )}
                  {(currentScreen === 'tips-tricks' || currentScreen === 'knowledge-sharing') && (
                    <ContributeScreen
                      defaultTab={currentScreen === 'knowledge-sharing' ? 'knowledge' : 'tips'}
                      tips={tips}
                      proposals={proposals}
                      onAddTip={() => setActiveModal({ type: 'tip' })}
                      onDeleteTip={deleteTip}
                      onEditTip={tip => setActiveModal({ type: 'edit-tip', data: tip })}
                      onReact={reactToTip}
                      onAddProposal={() => setActiveModal({ type: 'proposal' })}
                      onDeleteProposal={deleteProposal}
                      onEditProposal={proposal => setActiveModal({ type: 'edit-proposal', data: proposal })}
                      searchQuery={searchQuery}
                      selectedItemId={selectedItemId}
                      onClearSelection={() => setSelectedItemId(null)}
                    />
                  )}
                  {currentScreen === 'achievements' && (
                    <AchievementsScreen
                      achievements={achievements}
                      onAddAchievement={() => setActiveModal({ type: 'achievement' })}
                      onDeleteAchievement={deleteAchievement}
                      onEditAchievement={achievement => setActiveModal({ type: 'edit-achievement', data: achievement })}
                      searchQuery={searchQuery}
                      selectedItemId={selectedItemId}
                      onClearSelection={() => setSelectedItemId(null)}
                    />
                  )}
                  {currentScreen === 'focus-zone' && <FocusZoneScreen />}
                  {currentScreen === 'admin-dashboard' && <AdminDashboard />}
                </Suspense>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={activeModal?.type === 'bug'} onClose={() => setActiveModal(null)} hideHeader>
        <BugForm onSubmit={handleBugSubmit} onClose={() => setActiveModal(null)} showToast={showToast} />
      </Modal>

      <Modal isOpen={activeModal?.type === 'edit-bug'} onClose={() => setActiveModal(null)} hideHeader>
        {activeModal?.type === 'edit-bug' && (
          <BugForm
            initialData={activeModal.data}
            onSubmit={updatedBug => {
              editBug(activeModal.data.id, updatedBug);
              showToast('Story updated successfully!', 'success');
              setActiveModal(null);
            }}
            onClose={() => setActiveModal(null)}
            showToast={showToast}
          />
        )}
      </Modal>

      <Modal isOpen={activeModal?.type === 'tip'} onClose={() => setActiveModal(null)} title="Contribute a Tip">
        <TipForm onSubmit={handleTipSubmit} onClose={() => setActiveModal(null)} />
      </Modal>

      <Modal isOpen={activeModal?.type === 'edit-tip'} onClose={() => setActiveModal(null)} title="Edit Tip">
        {activeModal?.type === 'edit-tip' && (
          <TipForm
            initialData={activeModal.data}
            onSubmit={updatedTip => {
              editTip(activeModal.data.id, updatedTip);
              showToast('Tip updated successfully!', 'success');
              setActiveModal(null);
            }}
            onClose={() => setActiveModal(null)}
          />
        )}
      </Modal>

      <Modal isOpen={activeModal?.type === 'proposal'} onClose={() => setActiveModal(null)} title="Knowledge Sharing Proposal">
        <ProposalForm onSubmit={handleProposalSubmit} onClose={() => setActiveModal(null)} />
      </Modal>

      <Modal isOpen={activeModal?.type === 'edit-proposal'} onClose={() => setActiveModal(null)} title="Edit Proposal">
        {activeModal?.type === 'edit-proposal' && (
          <ProposalForm
            initialData={activeModal.data}
            onSubmit={updatedProposal => {
              editProposal(activeModal.data.id, updatedProposal);
              showToast('Proposal updated successfully!', 'success');
              setActiveModal(null);
            }}
            onClose={() => setActiveModal(null)}
          />
        )}
      </Modal>

      <Modal isOpen={activeModal?.type === 'achievement'} onClose={() => setActiveModal(null)} title="Add Achievement">
        <AchievementForm onSubmit={handleAchievementSubmit} onClose={() => setActiveModal(null)} />
      </Modal>

      <Modal isOpen={activeModal?.type === 'edit-achievement'} onClose={() => setActiveModal(null)} title="Edit Achievement">
        {activeModal?.type === 'edit-achievement' && (
          <AchievementForm
            initialData={activeModal.data}
            onSubmit={async updatedAchievement => {
              try {
                await editAchievement(activeModal.data.id, updatedAchievement);
                showToast('Achievement updated successfully!', 'success');
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (message.includes('permission') || message.includes('Missing or insufficient permissions')) {
                  showToast('Permission denied. You can only edit your own achievements.', 'error');
                  return;
                }
                showToast('Failed to update achievement.', 'error');
              }
            }}
            onClose={() => setActiveModal(null)}
          />
        )}
      </Modal>

      <Modal isOpen={activeModal?.type === 'selector'} onClose={() => setActiveModal(null)} title="What would you like to share?">
        <EntrySelectorModal onSelect={handleEntrySelect} />
      </Modal>

      <Modal isOpen={activeModal?.type === 'profile'} onClose={() => setActiveModal(null)} title="Profile Settings">
        <ProfileForm onClose={() => setActiveModal(null)} onUpdateAvatars={updateUserAvatars} />
      </Modal>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={screen => { navigateTo(screen); setIsCommandPaletteOpen(false); }}
        onCreateEntry={type => { handleEntrySelect(type); setIsCommandPaletteOpen(false); }}
        bugs={bugs}
        tips={tips}
        proposals={proposals}
        achievements={achievements}
        isAdmin={isAdmin}
      />

      {/* Mobile bottom nav — sits on canvas, no card wrap (Q10 triage-first mobile) */}
      <nav data-testid="mobile-bottom-nav" className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch border-t border-border bg-canvas md:hidden">
        {railItems.slice(0, 5).map(item => (
          <motion.button
            key={item.id}
            data-testid={`mobile-nav-${item.id}`}
            whileTap={{ scale: 0.88 }}
            transition={{ duration: 0.1 }}
            onClick={() => {
              navigateTo(item.id);
              setSearchQuery('');
              setSelectedItemId(null);
              setIsSearchResultsOpen(false);
            }}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
              activeRailId === item.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {activeRailId === item.id && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
            )}
            <Icon icon={item.icon} width={18} height={18} />
            <span className="text-[9px] tracking-wide" style={{ fontWeight: 510 }}>
              {item.label.split(' ')[0]}
            </span>
          </motion.button>
        ))}
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.1 }}
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground"
        >
          <Icon icon="solar:magnifer-bold-duotone" width={18} height={18} />
          <span className="text-[9px] tracking-wide" style={{ fontWeight: 510 }}>Search</span>
        </motion.button>
      </nav>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
