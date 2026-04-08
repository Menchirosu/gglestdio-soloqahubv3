import React, { useState, useEffect, Suspense } from 'react';
import {
  LayoutDashboard,
  Bug,
  Lightbulb,
  BookOpen,
  Sparkles,
  Focus,
  Search,
  Bell,
  PlusCircle,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  User,
  Sun,
  Moon,
} from 'lucide-react';
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

// Lazy-loaded screens — only bundled when first visited
const DashboardScreen = React.lazy(() =>
  import('./screens/DashboardScreen').then(m => ({ default: m.DashboardScreen }))
);
const BugWallScreen = React.lazy(() =>
  import('./screens/BugWallScreen').then(m => ({ default: m.BugWallScreen }))
);
const TipsTricksScreen = React.lazy(() =>
  import('./screens/TipsTricksScreen').then(m => ({ default: m.TipsTricksScreen }))
);
const KnowledgeSharingScreen = React.lazy(() =>
  import('./screens/KnowledgeSharingScreen').then(m => ({ default: m.KnowledgeSharingScreen }))
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      // Default to dark mode (Linear-native)
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

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
      <MainApp isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
    </SearchProvider>
  );
}

function MainApp({
  isDarkMode,
  setIsDarkMode,
}: {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}) {
  const { profile, isAdmin } = useAuth();
  const { searchQuery, setSearchQuery, selectedItemId, setSelectedItemId } = useSearch();
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [navDirection, setNavDirection] = useState<1 | -1>(1);
  const [activeModal, setActiveModal] = useState<{ type: string; data?: any } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchResultsOpen, setIsSearchResultsOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState<{ uid: string; displayName: string; photoURL: string }[]>([]);

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
    setIsSearchResultsOpen(searchQuery.trim().length > 1);
  }, [searchQuery]);

  // Global Cmd+K / Ctrl+K shortcut
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bug-wall', label: 'Bug Wall', icon: Bug },
    { id: 'tips-tricks', label: 'Tips & Tricks', icon: Lightbulb },
    { id: 'knowledge-sharing', label: 'Knowledge Sharing', icon: BookOpen },
    { id: 'achievements', label: 'Achievements', icon: Sparkles },
    { id: 'focus-zone', label: 'Focus Zone', icon: Focus },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin-dashboard', label: 'Admin Panel', icon: ShieldCheck });
  }

  const primaryNavItems = navItems.filter(item => !['focus-zone', 'admin-dashboard'].includes(item.id));
  const secondaryNavItems = navItems.filter(item => item.id === 'focus-zone');
  const adminNavItems = navItems.filter(item => item.id === 'admin-dashboard');

  const navigateTo = (screen: Screen) => {
    const currentIdx = navItems.findIndex(n => n.id === currentScreen);
    const nextIdx = navItems.findIndex(n => n.id === screen);
    setNavDirection(nextIdx >= currentIdx ? 1 : -1);
    setCurrentScreen(screen);
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
        // non-JSON error payload — fall through
      }
      if (message.includes('permission') || message.includes('Missing or insufficient permissions')) {
        showToast('Permission denied. Please ensure you are logged in and approved.', 'error');
        return;
      }
      showToast('Failed to save achievement.', 'error');
    }
  };

  // Sanitize search query before display to prevent XSS in toast
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
      if (
        a.title.toLowerCase().includes(query) ||
        a.story.toLowerCase().includes(query) ||
        a.impact.toLowerCase().includes(query)
      )
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

  return (
    <div className="app-wash min-h-screen text-foreground">

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`shell-sidebar fixed left-0 top-0 z-50 flex h-full w-64 flex-col px-4 py-5 transition-transform duration-200 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="mb-8 flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary/14 text-primary">
              <LayoutDashboard size={14} />
            </div>
            <div className="space-y-0.5">
              <span className="block text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Workspace</span>
              <span
                className="block text-[15px] text-foreground"
                style={{ fontWeight: 590, letterSpacing: '-0.02em' }}
              >
                QA Solo Hub
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="shell-utility-button md:hidden"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6">
          <div className="space-y-1">
            <p className="px-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Core</p>
            {primaryNavItems.map(item => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.1 }}
                onClick={() => {
                  navigateTo(item.id as Screen);
                  setIsSidebarOpen(false);
                  setSearchQuery('');
                  setSelectedItemId(null);
                  setIsSearchResultsOpen(false);
                }}
                className={`group/nav shell-nav-item ${currentScreen === item.id ? 'shell-nav-item-active' : ''}`}
              >
                {currentScreen === item.id && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors ${
                    currentScreen === item.id
                      ? 'bg-primary/16 text-primary'
                      : 'text-muted-foreground group-hover/nav:text-foreground'
                  }`}
                >
                  <item.icon size={15} />
                </div>
                <span className="text-[13px]" style={{ fontWeight: 510 }}>
                  {item.label}
                </span>
              </motion.button>
            ))}
          </div>

          {secondaryNavItems.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Secondary</p>
              {secondaryNavItems.map(item => (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => {
                    navigateTo(item.id as Screen);
                    setIsSidebarOpen(false);
                    setSearchQuery('');
                    setSelectedItemId(null);
                    setIsSearchResultsOpen(false);
                  }}
                  className={`group/nav shell-nav-item ${currentScreen === item.id ? 'shell-nav-item-active' : ''}`}
                >
                  {currentScreen === item.id && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors ${
                      currentScreen === item.id
                        ? 'bg-primary/16 text-primary'
                        : 'text-muted-foreground group-hover/nav:text-foreground'
                    }`}
                  >
                    <item.icon size={15} />
                  </div>
                  <span className="text-[13px]" style={{ fontWeight: 510 }}>
                    {item.label}
                  </span>
                </motion.button>
              ))}
            </div>
          )}

          {adminNavItems.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Admin</p>
              {adminNavItems.map(item => (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => {
                    navigateTo(item.id as Screen);
                    setIsSidebarOpen(false);
                    setSearchQuery('');
                    setSelectedItemId(null);
                    setIsSearchResultsOpen(false);
                  }}
                  className={`group/nav shell-nav-item ${currentScreen === item.id ? 'shell-nav-item-active' : ''}`}
                >
                  {currentScreen === item.id && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors ${
                      currentScreen === item.id
                        ? 'bg-primary/16 text-primary'
                        : 'text-muted-foreground group-hover/nav:text-foreground'
                    }`}
                  >
                    <item.icon size={15} />
                  </div>
                  <span className="text-[13px]" style={{ fontWeight: 510 }}>
                    {item.label}
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom actions */}
        <div className="mt-auto space-y-3 pt-5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.1 }}
            onClick={() => setActiveModal({ type: 'selector' })}
            className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-primary py-2.5 text-[13px] text-white transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            style={{ fontWeight: 510 }}
          >
            <PlusCircle size={15} />
            Share something
          </motion.button>

          {/* User footer */}
          <div
            className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-border/80 bg-input/80 px-3 py-2.5 transition-colors hover:bg-surface-container-low"
            onClick={() => setActiveModal({ type: 'profile' })}
          >
            <div className="relative h-7 w-7 shrink-0">
              <div className="h-7 w-7 overflow-hidden rounded-full border border-border">
                <img
                  src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`}
                  alt="Profile"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Online presence dot */}
              <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-1 ring-panel" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-foreground" style={{ fontWeight: 510 }}>
                {profile?.displayName || 'You'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {profile?.role === 'admin' ? 'Admin' : 'QA'}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); logout(); }}
              className="shrink-0 rounded-[6px] p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

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

      {/* Topbar */}
      <header
        className={`glass fixed left-0 right-0 top-0 flex h-16 items-center justify-between px-4 sm:px-5 md:left-64 md:px-7 ${
          isSearchResultsOpen ? 'z-[60]' : 'z-30'
        }`}
      >
        <div className="flex max-w-xl flex-1 items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="shell-utility-button md:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          {/* Cmd+K palette trigger — desktop */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="shell-command-anchor hidden md:flex"
          >
            <Search size={13} />
            <span>Search or jump to...</span>`r`n            <kbd className="ml-auto rounded-[6px] border border-border/80 bg-background/70 px-1.5 py-0.5 text-[11px] text-muted-foreground">Ctrl K</kbd>
          </button>

          <form onSubmit={handleSearch} className="relative w-full md:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSelectedItemId(null);
                setIsSearchResultsOpen(e.target.value.trim().length > 1);
              }}
              onFocus={() => { if (searchQuery.trim().length > 1) setIsSearchResultsOpen(true); }}
              placeholder="Search bugs, tips, wins..."
              className="w-full rounded-[6px] border border-border bg-input py-1.5 pl-8 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-ring/50 focus:outline-none focus:ring-1 focus:ring-ring/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedItemId(null); setIsSearchResultsOpen(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[4px] p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
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

        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <div className="group relative">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="shell-utility-button"
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[4px] border border-border bg-panel px-2 py-1 text-[11px] text-on-surface opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100" style={{ fontWeight: 510 }}>
              {isDarkMode ? 'Light mode' : 'Dark mode'}
            </div>
          </div>

          {/* Notifications */}
          <div className="group relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="shell-utility-button relative"
              aria-label="Notifications"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[4px] border border-border bg-panel px-2 py-1 text-[11px] text-on-surface opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100" style={{ fontWeight: 510 }}>
              Notifications{unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
            </div>

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
                            className={`relative cursor-pointer border-b border-border px-4 py-3 transition-colors hover:bg-surface-container-low ${
                              !n.isRead ? 'bg-primary/5' : ''
                            }`}
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

          {/* User chip — desktop only */}
          <div className="hidden items-center gap-2 rounded-[10px] border border-border/80 bg-input/80 px-2.5 py-1.5 sm:flex">
            <div className="text-right">
              <p className="text-[12px] text-foreground" style={{ fontWeight: 510 }}>
                {profile?.displayName}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {profile?.role === 'admin' ? 'Admin' : 'Solo QA'}
              </p>
            </div>
            <div
              className="h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-border transition-opacity hover:opacity-80"
              onClick={() => setActiveModal({ type: 'profile' })}
            >
              <img
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`}
                alt="Profile"
                className={`h-full w-full object-cover ${profile?.photoURL?.includes('pixel') ? '[image-rendering:pixelated]' : ''}`}
                referrerPolicy="no-referrer"
              />
            </div>
            <button
              onClick={() => setActiveModal({ type: 'profile' })}
              className="rounded-[6px] p-1 text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Profile Settings"
            >
              <User size={14} />
            </button>
            <button
              onClick={logout}
              className="rounded-[6px] p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className={`shell-canvas relative min-h-screen px-4 pb-24 pt-22 sm:px-6 md:pb-12 md:pl-[17.5rem] md:pr-8 md:pt-[6.25rem] ${
          currentScreen === 'bug-wall' ? 'page-glow-bug' :
          currentScreen === 'tips-tricks' ? 'page-glow-tips' :
          currentScreen === 'knowledge-sharing' ? 'page-glow-knowledge' :
          currentScreen === 'achievements' ? 'page-glow-achievements' :
          currentScreen === 'focus-zone' ? 'page-glow-focus' : ''
        }`}
      >
        <AnimatePresence mode="wait" custom={navDirection}>
          <motion.div
            key={currentScreen}
            custom={navDirection}
            initial={{ opacity: 0, x: navDirection * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: navDirection * -24 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mx-auto max-w-[76rem]"
          >
            <Suspense fallback={<ScreenLoader />}>
              {currentScreen === 'dashboard' && (
                <DashboardScreen
                  onNavigate={navigateTo}
                  onShare={() => setActiveModal({ type: 'selector' })}
                  bugs={bugs}
                  tips={tips}
                  proposals={proposals}
                  achievements={achievements}
                  searchQuery={searchQuery}
                  activeUsers={activeUsers}
                />
              )}
              {currentScreen === 'bug-wall' && (
                <BugWallScreen
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
                  onSearchChange={setSearchQuery}
                  showToast={showToast}
                  onAddBugSubmit={handleBugSubmit}
                />
              )}
              {currentScreen === 'tips-tricks' && (
                <TipsTricksScreen
                  tips={tips}
                  onAddTip={() => setActiveModal({ type: 'tip' })}
                  onDeleteTip={deleteTip}
                  onEditTip={tip => setActiveModal({ type: 'edit-tip', data: tip })}
                  onReact={reactToTip}
                  searchQuery={searchQuery}
                  selectedItemId={selectedItemId}
                  onClearSelection={() => setSelectedItemId(null)}
                />
              )}
              {currentScreen === 'knowledge-sharing' && (
                <KnowledgeSharingScreen
                  proposals={proposals}
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
          </motion.div>
        </AnimatePresence>
      </main>

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

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch border-t border-border bg-panel md:hidden">
        {navItems.slice(0, 5).map(item => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.88 }}
            transition={{ duration: 0.1 }}
            onClick={() => {
              navigateTo(item.id as Screen);
              setSearchQuery('');
              setSelectedItemId(null);
              setIsSearchResultsOpen(false);
            }}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
              currentScreen === item.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {currentScreen === item.id && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
            )}
            <item.icon size={18} strokeWidth={currentScreen === item.id ? 2 : 1.5} />
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
          <Search size={18} strokeWidth={1.5} />
          <span className="text-[9px] tracking-wide" style={{ fontWeight: 510 }}>Search</span>
        </motion.button>
      </nav>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

