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
import { isE2EMode } from './e2e';

// Lazy-loaded screens
const OverviewScreen = React.lazy(() =>
  import('./screens/OverviewScreen').then(m => ({ default: m.OverviewScreen }))
);
const WallScreen = React.lazy(() =>
  import('./screens/WallScreen').then(m => ({ default: m.WallScreen }))
);
const LeaderboardScreen = React.lazy(() =>
  import('./screens/LeaderboardScreen').then(m => ({ default: m.LeaderboardScreen }))
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
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('lumie-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  const [railExpanded, setRailExpanded] = useState(() => {
    try { return localStorage.getItem('lumie-rail') === 'expanded'; } catch { return false; }
  });

  const {
    bugs, tips, proposals, achievements, notifications,
    addBug, deleteBug, editBug, addTip, deleteTip, editTip,
    addProposal, deleteProposal, editProposal,
    addAchievement, deleteAchievement, editAchievement,
    requestBugTriage,
    markBugForHumanReview,
    markBugTriageReviewed,
    reactToBug, reactToTip, addCommentToBug, reactToComment,
    replyToComment, deleteComment, editComment, updateUserAvatars,
    markNotificationAsRead, markAllNotificationsAsRead,
  } = useStorage(currentScreen);

  const { toast, showToast } = useToast();

  useEffect(() => {
    if (isE2EMode()) return;
    if (profile?.uid && profile?.photoURL) {
      updateUserAvatars(profile.uid, profile.photoURL, profile.displayName);
    }
  }, [profile?.uid, profile?.photoURL, profile?.displayName]);

  useEffect(() => {
    if (isE2EMode()) return;
    if (!profile?.uid) return;
    const ping = () => updatePresence(profile.uid, profile.displayName || '', profile.photoURL || '');
    ping();
    const interval = setInterval(ping, 60_000);
    return () => clearInterval(interval);
  }, [profile?.uid]);

  useEffect(() => {
    if (isE2EMode()) {
      setActiveUsers([{ uid: profile?.uid ?? 'e2e-approved-user', displayName: profile?.displayName ?? 'E2E Reviewer', photoURL: profile?.photoURL ?? '' }]);
      return;
    }
    const unsub = subscribeToPresence(setActiveUsers);
    return unsub;
  }, [profile?.displayName, profile?.photoURL, profile?.uid]);

  useEffect(() => {
    document.documentElement.setAttribute('data-noise', noiseEnabled ? 'on' : 'off');
    try { localStorage.setItem('lumie-noise', noiseEnabled ? 'on' : 'off'); } catch { /* ignore */ }
  }, [noiseEnabled]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    try { localStorage.setItem('lumie-theme', themeMode); } catch { /* ignore */ }
  }, [themeMode]);

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

  const railItems: { id: Screen; label: string; mobileLabel: string; icon: string }[] = [
    { id: 'dashboard', label: 'Overview', mobileLabel: 'Home', icon: 'solar:widget-5-bold-duotone' },
    { id: 'bug-wall', label: 'Wall', mobileLabel: 'Wall', icon: 'solar:bug-bold-duotone' },
    { id: 'leaderboard', label: 'Leaderboard', mobileLabel: 'Board', icon: 'solar:cup-star-bold-duotone' },
    { id: 'tips-tricks', label: 'Contribute', mobileLabel: 'Share', icon: 'solar:book-bold-duotone' },
    { id: 'focus-zone', label: 'Focus', mobileLabel: 'Focus', icon: 'solar:target-bold-duotone' },
    { id: 'achievements', label: 'Recognition', mobileLabel: 'Wins', icon: 'solar:medal-ribbon-bold-duotone' },
  ];

  const workspaceLabels: Record<string, string> = {
    dashboard: 'Overview',
    'bug-wall': 'Wall',
    leaderboard: 'Leaderboard',
    'tips-tricks': 'Contribute',
    'knowledge-sharing': 'Contribute',
    'focus-zone': 'Focus',
    achievements: 'Recognition',
    'admin-dashboard': 'Admin',
  };

  const workspaceDescriptions: Record<string, string> = {
    dashboard: 'Signals, momentum, and recent activity.',
    'bug-wall': 'Conversation-first bug stories and thread follow-up.',
    leaderboard: 'Open follow-up, traction, and contributor standing.',
    'tips-tricks': 'Practical tips, reusable knowledge, and team notes.',
    'knowledge-sharing': 'Reusable lessons, sessions, and shared resources.',
    'focus-zone': 'Attention management and deep work rituals.',
    achievements: 'Wins, progress, and visible recognition.',
    'admin-dashboard': 'Membership review and system oversight.',
  };

  const navigateTo = (screen: Screen) => {
    const legacyScreen = screen as unknown as string;

    // Remap legacy workspace ids to current surfaces.
    if (legacyScreen === 'knowledge-sharing') {
      setCurrentScreen('tips-tricks');
    } else if (legacyScreen === 'signals') {
      setCurrentScreen('leaderboard');
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

  const handleBugSubmit = async (bug: any): Promise<string | void> => {
    try {
      const bugId = await addBug(bug);
      if (bugId) {
        void requestBugTriage(bugId, String(bug.discovery || bug.title || ''))
          .catch(() => showToast('AI triage is temporarily unavailable.'));
      }
      showToast('Bug story posted successfully!');
      return bugId;
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
      showToast('Knowledge post published!');
    } catch {
      showToast('Failed to publish knowledge post.', 'error');
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
        results.push({ id: p.id, title: p.title, type: 'proposal', screen: 'knowledge-sharing' });
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
  const isDarkMode = themeMode === 'dark';
  const toggleTheme = () => setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  const activeWorkspaceLabel = workspaceLabels[currentScreen] ?? 'Overview';
  const activeWorkspaceDescription = workspaceDescriptions[currentScreen] ?? 'Daily quality operations.';

  return (
    <div className="flex h-screen lumie-canvas lumie-noise relative text-foreground overflow-hidden">

      {/* Icon Rail — desktop only. Expands to show labels via toggle. */}
      <aside
        data-testid="icon-rail"
        className={`hidden md:flex relative flex-col shrink-0 h-full shell-rail z-40 transition-all duration-200 ${railExpanded ? 'w-[160px]' : 'w-[52px]'}`}
      >
        {/* Logo mark — aligns with command bar height */}
        <div className="flex h-full flex-col px-1.5 py-3">
          <div className="shell-rail-panel flex h-full flex-col overflow-hidden px-1.5 py-2.5">
            <div className={`flex h-[44px] items-center shrink-0 ${railExpanded ? 'px-2.5 gap-2.5' : 'justify-center'}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/14 text-primary shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]">
                <Icon icon="solar:bug-minimalistic-bold-duotone" width={13} height={13} />
              </div>
              {railExpanded && (
                <div className="min-w-0">
                  <span className="block truncate text-[12px] text-foreground" style={{ fontWeight: 620 }}>Lumie</span>
                  <span className="block truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">QA Hub</span>
                </div>
              )}
            </div>

            <nav className="flex flex-col gap-1 px-1 py-3 flex-1" aria-label="Primary">
          {railItems.map(item => (
            <div key={item.id} className="relative w-full">
              {activeRailId === item.id && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <motion.button
                title={railExpanded ? undefined : item.label}
                aria-label={item.label}
                data-testid={`rail-nav-${item.id}`}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.1 }}
                onClick={() => {
                  navigateTo(item.id);
                  setSearchQuery('');
                  setSelectedItemId(null);
                  setIsSearchResultsOpen(false);
                }}
                className={`flex h-[40px] w-full items-center gap-2.5 rounded-[12px] px-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
                  activeRailId === item.id
                    ? 'bg-primary/12 text-primary shadow-[0_10px_24px_rgba(200,105,72,0.10)]'
                    : 'text-muted-foreground hover:bg-secondary/45 hover:text-foreground'
                }`}
              >
                <Icon icon={item.icon} width={16} height={16} className="shrink-0" />
                {railExpanded && (
                  <span className="text-[12px] truncate" style={{ fontWeight: activeRailId === item.id ? 620 : 500 }}>
                    {item.label}
                  </span>
                )}
              </motion.button>
            </div>
          ))}
        </nav>

        <div className="shell-divider-fade mx-2 h-px" />

        <div className="flex flex-col gap-1 px-1 py-3">
          {isAdmin && (
            <div className="relative w-full">
              {currentScreen === 'admin-dashboard' && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <motion.button
                title={railExpanded ? undefined : 'Admin'}
                aria-label="Admin dashboard"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.1 }}
                onClick={() => navigateTo('admin-dashboard')}
                className={`flex h-[40px] w-full items-center gap-2.5 rounded-[12px] px-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
                  currentScreen === 'admin-dashboard'
                    ? 'bg-primary/12 text-primary shadow-[0_10px_24px_rgba(200,105,72,0.10)]'
                    : 'text-muted-foreground hover:bg-secondary/45 hover:text-foreground'
                }`}
              >
                <Icon icon="solar:shield-check-bold-duotone" width={16} height={16} className="shrink-0" />
                {railExpanded && <span className="text-[12px] truncate" style={{ fontWeight: 500 }}>Admin</span>}
              </motion.button>
            </div>
          )}
          <button
            title={railExpanded ? undefined : (profile?.displayName || 'Profile')}
            aria-label="Open profile settings"
            onClick={() => setActiveModal({ type: 'profile' })}
            className="flex h-[40px] w-full items-center gap-2.5 rounded-[12px] px-2.5 transition-colors hover:bg-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-card">
              <img
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`}
                alt="Profile"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full bg-green-500 ring-1 ring-panel" />
            </div>
            {railExpanded && (
              <div className="min-w-0">
                <span className="block truncate text-[12px] text-foreground">{profile?.displayName || 'Profile'}</span>
                <span className="block truncate text-[10px] text-muted-foreground">Profile settings</span>
              </div>
            )}
          </button>
          <button
            onClick={toggleTheme}
            title={railExpanded ? undefined : (isDarkMode ? 'Switch to light mode' : 'Switch to dark mode')}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`flex h-[30px] w-full items-center gap-2.5 rounded-[10px] px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
              isDarkMode
                ? 'text-primary hover:bg-primary/10'
                : 'text-muted-foreground/70 hover:bg-secondary/50 hover:text-foreground'
            }`}
          >
            <Icon icon={isDarkMode ? 'solar:sun-2-bold-duotone' : 'solar:moon-stars-bold-duotone'} width={13} height={13} className="shrink-0" />
            {railExpanded && <span className="text-[12px]">{isDarkMode ? 'Light mode' : 'Dark mode'}</span>}
          </button>
          <button
            onClick={() => {
              const next = !railExpanded;
              setRailExpanded(next);
              try { localStorage.setItem('lumie-rail', next ? 'expanded' : 'collapsed'); } catch { /* ignore */ }
            }}
            title={railExpanded ? 'Collapse rail' : 'Expand rail'}
            aria-label={railExpanded ? 'Collapse navigation rail' : 'Expand navigation rail'}
            className="flex h-[30px] w-full items-center gap-2.5 rounded-[10px] px-2.5 text-muted-foreground/70 transition-colors hover:bg-secondary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <Icon icon="solar:sidebar-minimalistic-bold-duotone" width={13} height={13} className="shrink-0" />
            {railExpanded && <span className="text-[12px]">Collapse</span>}
          </button>
          <button
            onClick={() => setNoiseEnabled(v => !v)}
            title={railExpanded ? undefined : (noiseEnabled ? 'Disable paper texture' : 'Enable paper texture')}
            aria-label={noiseEnabled ? 'Disable paper texture' : 'Enable paper texture'}
            className={`flex h-[30px] w-full items-center gap-2.5 rounded-[10px] px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
              noiseEnabled ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground/50 hover:bg-secondary/50 hover:text-foreground'
            }`}
          >
            <Icon icon="solar:layers-bold-duotone" width={13} height={13} className="shrink-0" />
            {railExpanded && <span className="text-[12px]">Paper texture</span>}
          </button>
          <button
            onClick={logout}
            title={railExpanded ? undefined : 'Sign out'}
            aria-label="Sign out"
            className="flex h-[30px] w-full items-center gap-2.5 rounded-[10px] px-2.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/20"
          >
            <Icon icon="solar:logout-bold-duotone" width={13} height={13} className="shrink-0" />
            {railExpanded && <span className="text-[12px]">Sign out</span>}
          </button>
        </div>
        {!railExpanded && (
          <button
            type="button"
            aria-label="Expand navigation rail"
            onClick={() => {
              setRailExpanded(true);
              try { localStorage.setItem('lumie-rail', 'expanded'); } catch { /* ignore */ }
            }}
            className="shell-floating-action absolute bottom-[126px] left-[38px] flex items-center gap-2 rounded-r-full px-3 py-1.5 text-[11px] text-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            style={{ fontWeight: 590 }}
          >
            <Icon icon="solar:double-alt-arrow-right-bold-duotone" width={12} height={12} className="shrink-0 text-primary" />
            <span>Expand</span>
          </button>
        )}
          </div>
        </div>
      </aside>

      {/* Main area — wrapped in Lumie framed cream card (24px radius on desktop, edge-to-edge on mobile) */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden md:py-3 md:pr-3">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden lumie-frame">

        {/* Command Bar */}
        <header className={`relative flex h-[52px] shrink-0 items-center gap-3 border-b border-border bg-frame px-3 md:px-4 ${isSearchResultsOpen ? 'z-[60]' : 'z-30'}`}>
          <div className="hidden md:flex shrink-0 items-center">
            <div className="shell-location-chip">
              <span className="shell-location-chip-dot" aria-hidden />
              <div className="min-w-0">
                <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Workspace</span>
                <span className="block truncate text-[12px] text-foreground" style={{ fontWeight: 600 }}>
                  {activeWorkspaceLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Search trigger (desktop) */}
          <div className="flex flex-1 items-center min-w-0">
            <button
              data-testid="command-palette-trigger"
              aria-label="Open command palette"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="shell-command-anchor hidden md:flex w-full max-w-md"
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
                aria-label="Search the app"
                className="w-full rounded-[12px] border border-border bg-input py-2 pl-8 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-ring/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => { setSearchQuery(''); setSelectedItemId(null); setIsSearchResultsOpen(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[4px] p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <Icon icon="solar:close-circle-bold" width={12} height={12} />
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
            <button
              onClick={toggleTheme}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="shell-utility-button md:hidden"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <Icon icon={isDarkMode ? 'solar:sun-2-bold-duotone' : 'solar:moon-stars-bold-duotone'} width={14} height={14} />
            </button>
            <div className="hidden lg:block min-w-0 pr-2">
              <p className="truncate text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Current view</p>
              <p className="truncate text-[12px] text-foreground" style={{ fontWeight: 520 }}>{activeWorkspaceDescription}</p>
            </div>
            {/* New entry */}
            <button
              aria-label="Create a new entry"
              onClick={() => setActiveModal({ type: 'selector' })}
              className="shell-action-secondary hidden md:flex px-3 py-2 text-[11px]"
              style={{ fontWeight: 600 }}
            >
              <Icon icon="solar:add-circle-bold-duotone" width={13} height={13} />
              New entry
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
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
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-[12px] border border-border bg-card shadow-[rgba(0,0,0,0.3)_0px_8px_24px,rgba(0,0,0,0.2)_0px_0px_0px_1px]"
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
                              className={`relative cursor-pointer border-b border-border px-4 py-3 transition-colors hover:bg-secondary/20 ${!n.isRead ? 'bg-primary/5' : ''}`}
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
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
              <div className="mx-auto max-w-[82rem] px-3 py-4 pb-24 sm:px-4 md:px-5 md:py-5 md:pb-6">
                <Suspense fallback={<ScreenLoader />}>
                  {currentScreen === 'dashboard' && (
                    <OverviewScreen
                      onNavigate={navigateTo}
                      onNavigateToItem={(screen, id) => {
                        navigateTo(screen);
                        setSelectedItemId(id);
                      }}
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
                    <WallScreen
                      bugs={bugs}
                      onReact={reactToBug}
                      onComment={addCommentToBug}
                      onReactComment={reactToComment}
                      onReplyComment={replyToComment}
                      onDeleteBug={deleteBug}
                      onEditBug={bug => setActiveModal({ type: 'edit-bug', data: bug })}
                      onAddBugSubmit={handleBugSubmit}
                      onDeleteComment={deleteComment}
                      onEditComment={editComment}
                      onMarkBugForReview={async bugId => {
                        try {
                          await markBugForHumanReview(bugId);
                          showToast('Marked for human review.');
                        } catch {
                          showToast('Failed to mark item for review.', 'error');
                        }
                      }}
                      onMarkBugReviewed={async bugId => {
                        try {
                          await markBugTriageReviewed(bugId);
                          showToast('Review marked complete.');
                        } catch {
                          showToast('Failed to update review state.', 'error');
                        }
                      }}
                      searchQuery={searchQuery}
                      selectedItemId={selectedItemId}
                      onClearSelection={() => setSelectedItemId(null)}
                      showToast={showToast}
                    />
                  )}
                  {currentScreen === 'leaderboard' && (
                    <LeaderboardScreen
                      bugs={bugs}
                      tips={tips}
                      proposals={proposals}
                      achievements={achievements}
                      isAdmin={isAdmin}
                    />
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
                      onUpdateProposal={editProposal}
                      isAdmin={isAdmin}
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

      <Modal isOpen={activeModal?.type === 'proposal'} onClose={() => setActiveModal(null)} title="Create Knowledge Post">
        <ProposalForm onSubmit={handleProposalSubmit} onClose={() => setActiveModal(null)} />
      </Modal>

      <Modal isOpen={activeModal?.type === 'edit-proposal'} onClose={() => setActiveModal(null)} title="Edit Knowledge Post">
        {activeModal?.type === 'edit-proposal' && (
          <ProposalForm
            initialData={activeModal.data}
            onSubmit={async updatedProposal => {
              await editProposal(activeModal.data.id, updatedProposal);
              showToast('Knowledge post updated successfully!', 'success');
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
      <nav data-testid="mobile-bottom-nav" className="fixed bottom-0 left-0 right-0 z-30 flex h-[68px] items-stretch border-t border-border bg-canvas/95 backdrop-blur md:hidden">
        {railItems.slice(0, 5).map(item => (
          <motion.button
            key={item.id}
            data-testid={`mobile-nav-${item.id}`}
            aria-label={item.label}
            whileTap={{ scale: 0.88 }}
            transition={{ duration: 0.1 }}
            onClick={() => {
              navigateTo(item.id);
              setSearchQuery('');
              setSelectedItemId(null);
              setIsSearchResultsOpen(false);
            }}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
              activeRailId === item.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {activeRailId === item.id && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
            )}
            <Icon icon={item.icon} width={18} height={18} />
            <span className="text-[10px] leading-none" style={{ fontWeight: 600 }}>
              {item.mobileLabel}
            </span>
          </motion.button>
        ))}
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.1 }}
          onClick={() => setIsCommandPaletteOpen(true)}
          aria-label="Open search"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground"
        >
          <Icon icon="solar:magnifer-bold-duotone" width={18} height={18} />
          <span className="text-[10px] leading-none" style={{ fontWeight: 600 }}>Search</span>
        </motion.button>
      </nav>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
