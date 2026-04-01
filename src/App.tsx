import React, { useState, useEffect } from 'react';
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
  Moon
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

import { DashboardScreen } from './screens/DashboardScreen';
import { BugWallScreen } from './screens/BugWallScreen';
import { TipsTricksScreen } from './screens/TipsTricksScreen';
import { KnowledgeSharingScreen } from './screens/KnowledgeSharingScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { FocusZoneScreen } from './screens/FocusZoneScreen';
import { AdminDashboard } from './screens/AdminDashboard';
import { SearchProvider, useSearch } from './SearchContext';
import { AuthProvider, useAuth } from './AuthContext';
import { LoginScreen, PendingApprovalScreen } from './screens/AuthScreens';
import { logout, updatePresence, subscribeToPresence } from './firebase';
import { SearchResultsPopup } from './components/SearchResultsPopup';

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
      // Default to false (light mode) if no preference is saved, instead of auto-detecting system preference
      return saved ? JSON.parse(saved) : false;
    }
    return false;
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
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!isApproved) {
    return <PendingApprovalScreen />;
  }

  return (
    <SearchProvider>
      <MainApp isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
    </SearchProvider>
  );
}

function MainApp({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean; setIsDarkMode: (val: boolean) => void }) {
  const { profile, isAdmin } = useAuth();
  const { searchQuery, setSearchQuery, selectedItemId, setSelectedItemId } = useSearch();
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [navDirection, setNavDirection] = useState<1 | -1>(1);
  const [activeModal, setActiveModal] = useState<{ type: string; data?: any } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchResultsOpen, setIsSearchResultsOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState<{ uid: string; displayName: string; photoURL: string }[]>([]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const {
    bugs, tips, proposals, achievements, notifications,
    addBug, deleteBug, editBug, addTip, deleteTip, editTip, addProposal, deleteProposal, editProposal, addAchievement, deleteAchievement, editAchievement,
    reactToBug, reactToTip, addCommentToBug, reactToComment, replyToComment, deleteComment, editComment, updateUserAvatars,
    markNotificationAsRead, markAllNotificationsAsRead
  } = useStorage();

  const { toast, showToast } = useToast();

  // Sync avatars on load or when profile changes
  useEffect(() => {
    if (profile?.uid && profile?.photoURL) {
      updateUserAvatars(profile.uid, profile.photoURL, profile.displayName);
    }
  }, [profile?.uid, profile?.photoURL, profile?.displayName]);

  // Presence tracking — update on mount and every 60s
  useEffect(() => {
    if (!profile?.uid) return;
    const ping = () => updatePresence(profile.uid, profile.displayName || '', profile.photoURL || '');
    ping();
    const interval = setInterval(ping, 60_000);
    return () => clearInterval(interval);
  }, [profile?.uid]);

  // Subscribe to active users for dashboard
  useEffect(() => {
    const unsub = subscribeToPresence(setActiveUsers);
    return unsub;
  }, []);

  // Handle search results visibility
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      setIsSearchResultsOpen(true);
    } else {
      setIsSearchResultsOpen(false);
    }
  }, [searchQuery]);

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
    } catch (error) {
      console.error("Failed to post bug story", error);
      showToast('Failed to post bug story. Please try again.', 'error');
    }
  };

  const handleTipSubmit = async (tip: any) => {
    try {
      await addTip(tip);
      showToast('Tip shared with the community!');
    } catch (error) {
      showToast('Failed to share tip.', 'error');
    }
  };

  const handleProposalSubmit = async (proposal: any) => {
    try {
      await addProposal(proposal);
      showToast('Proposal submitted!');
    } catch (error) {
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
          showToast(`Achievement save blocked on ${parsed.path}. Check console for Firebase debug info.`, 'error');
          return;
        }
      } catch {
        // Ignore non-JSON error payloads and fall back to legacy handling.
      }
      if (message.includes('permission') || message.includes('Missing or insufficient permissions')) {
        showToast('Permission denied. Please ensure you are logged in and approved.', 'error');
        return;
      }
      showToast('Failed to save achievement.', 'error');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      showToast(`Searching for: ${searchQuery}...`);
    }
  };

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: any[] = [];

    bugs.forEach(b => {
      if (b.title.toLowerCase().includes(query) || b.discovery.toLowerCase().includes(query)) {
        results.push({ id: b.id, title: b.title, type: 'bug', screen: 'bug-wall' });
      }
    });

    tips.forEach(t => {
      if (t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query)) {
        results.push({ id: t.id, title: t.title, type: 'tip', screen: 'tips-tricks' });
      }
    });

    proposals.forEach(p => {
      if (p.title.toLowerCase().includes(query) || p.scope.toLowerCase().includes(query)) {
        results.push({ id: p.id, title: p.title, type: 'proposal', screen: 'knowledge-sharing' });
      }
    });

    achievements.forEach(a => {
      if (
        a.title.toLowerCase().includes(query) ||
        a.story.toLowerCase().includes(query) ||
        a.impact.toLowerCase().includes(query)
      ) {
        results.push({ id: a.id, title: a.title, type: 'achievement', screen: 'achievements' });
      }
    });

    return results.slice(0, 10);
  }, [searchQuery, bugs, tips, proposals, achievements]);

  const handleResultClick = (result: any) => {
    navigateTo(result.screen as Screen);
    setIsSearchResultsOpen(false);
    setSelectedItemId(result.id);
    setSearchQuery('');
    // Keep the search query to maintain filtering on the target screen
    showToast(`Redirecting to ${result.type}: ${result.title}`);
  };

  return (
    <div className="app-wash min-h-screen text-on-surface">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-md md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`dot-grid fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-white/30 bg-white/65 px-5 py-6 shadow-2xl shadow-primary/10 backdrop-blur-2xl transition-transform duration-300 md:translate-x-0 dark:border-white/10 dark:bg-black/15 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 flex items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-primary text-white shadow-lg shadow-primary/25">
              <LayoutDashboard size={18} />
            </div>
            <div>
              <h1 className="font-headline text-lg font-black leading-none text-primary">QA Solo Hub</h1>
              <p className="mt-1 text-[11px] font-medium text-on-surface-variant">Warm support for solo testers</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="rounded-full p-2 hover:bg-surface-container-low md:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 rounded-[1.75rem] bg-white/70 p-4 shadow-sm dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Today&apos;s mood</p>
          <p className="mt-2 text-lg font-bold text-on-surface">Supportive and in motion</p>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">Keep the room useful with one good note, one good catch, or one kind reply.</p>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => {
                navigateTo(item.id as Screen);
                setIsSidebarOpen(false);
                setSearchQuery('');
                setSelectedItemId(null);
                setIsSearchResultsOpen(false);
              }}
              className={`group/nav flex w-full items-center gap-4 rounded-[1.25rem] px-4 py-3.5 text-left transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                currentScreen === item.id
                  ? 'warm-ring bg-white text-on-surface dark:bg-white/10'
                  : 'text-on-surface-variant hover:bg-white/65 hover:text-on-surface dark:hover:bg-white/6'
              }`}
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                currentScreen === item.id ? 'bg-primary/12 text-primary' : 'bg-surface-container-low text-on-surface-variant group-hover/nav:bg-surface-container-high'
              }`}>
                <item.icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-headline text-sm font-semibold">{item.label}</span>
                <span className="block text-xs text-muted-foreground">{idx === 0 ? 'Welcome and pulse' : idx === 1 ? 'Stories from the trenches' : idx === 2 ? 'Practical shortcuts' : idx === 3 ? 'Guides and ideas' : idx === 4 ? 'Celebrate wins' : idx === 5 ? 'Reset and breathe' : 'Admin tools'}</span>
              </div>
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-4">
          <button
            onClick={() => setActiveModal({ type: 'selector' })}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <PlusCircle size={20} />
            Share something
          </button>

          {/* User identity footer */}
          <div className="flex cursor-pointer items-center gap-3 rounded-[1.5rem] bg-white/65 px-3 py-3 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/8" onClick={() => setActiveModal({ type: 'profile' })}>
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white/70">
              <img
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`}
                alt="Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-on-surface">{profile?.displayName || 'You'}</p>
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                profile?.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {profile?.role === 'admin' ? 'Admin' : 'QA'}
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); logout(); }}
              className="p-1.5 text-outline hover:text-error hover:bg-error/10 rounded-full transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Search Backdrop */}
      <AnimatePresence>
        {isSearchResultsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setIsSearchResultsOpen(false);
              setSearchQuery('');
            }}
          />
        )}
      </AnimatePresence>

      {/* TopBar */}
      <header className={`glass fixed left-0 right-0 top-0 z-30 flex h-20 items-center justify-between border-b border-white/25 px-4 sm:px-6 md:left-72 md:px-8 ${isSearchResultsOpen ? 'z-[60]' : 'z-30'}`}>
        <div className="flex max-w-xl flex-1 items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="rounded-full p-2 hover:bg-surface-container-low md:hidden" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSelectedItemId(null);
                if (e.target.value.trim().length > 1) {
                  setIsSearchResultsOpen(true);
                } else {
                  setIsSearchResultsOpen(false);
                }
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 1) {
                  setIsSearchResultsOpen(true);
                }
              }}
              placeholder="Search stories, tips, wins, or people..." 
              className="w-full rounded-full border-none bg-white/80 py-3 pl-11 pr-10 text-sm text-on-surface shadow-sm transition-all focus:ring-2 focus:ring-primary/20 dark:bg-white/10"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedItemId(null);
                  setIsSearchResultsOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-outline transition-all hover:bg-surface-container-high hover:text-on-surface"
              >
                <X size={14} />
              </button>
            )}
            <SearchResultsPopup 
              isOpen={isSearchResultsOpen} 
              onClose={() => {
                setIsSearchResultsOpen(false);
                setSearchQuery('');
              }} 
              results={searchResults}
              onResultClick={handleResultClick}
              searchQuery={searchQuery}
            />
          </form>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={toggleDarkMode}
            className="rounded-full bg-white/70 p-2.5 text-outline transition-all hover:bg-white dark:bg-white/8 dark:hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative rounded-full bg-white/70 p-2.5 text-outline transition-colors hover:bg-white dark:bg-white/8 dark:hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary animate-pulse"></span>
              )}
            </button>
            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsNotificationsOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/90 shadow-2xl shadow-primary/10 backdrop-blur-xl dark:border-white/10 dark:bg-[#2a211f]/90"
                  >
                    <div className="flex items-center justify-between border-b border-outline-variant/10 p-4">
                      <h4 className="text-sm font-bold">Notifications</h4>
                        <button 
                          onClick={markAllNotificationsAsRead}
                          className="rounded-full text-[10px] font-bold uppercase tracking-widest text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                          Mark all as read
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-xs text-outline italic">No notifications yet.</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              if (n.targetScreen) {
                                setCurrentScreen(n.targetScreen);
                                setIsNotificationsOpen(false);
                              } else if (n.targetId) {
                                setCurrentScreen('bug-wall');
                                setIsNotificationsOpen(false);
                              }
                            }}
                            className={`relative cursor-pointer border-b border-outline-variant/5 p-4 transition-colors hover:bg-surface-container-low ${!n.isRead ? 'bg-primary/5' : ''}`}
                          >
                            {!n.isRead && (
                              <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full"></div>
                            )}
                            <p className="text-sm font-bold mb-1">{n.title}</p>
                            <p className="text-xs text-tertiary mb-2">{n.desc}</p>
                            <p className="text-[10px] text-outline font-medium">{n.time}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="bg-surface-container-low p-3 text-center">
                      <p className="text-xs text-outline italic">Showing latest {notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <div className="hidden items-center gap-3 rounded-full bg-white/65 px-2 py-1.5 shadow-sm dark:bg-white/7 sm:flex">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold leading-none text-on-surface">{profile?.displayName}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{profile?.role === 'admin' ? 'Administrator' : 'Solo QA'}</p>
            </div>
            <div className="h-10 w-10 cursor-pointer overflow-hidden rounded-full border-2 border-white bg-surface-container-high shadow-sm transition-opacity hover:opacity-80" onClick={() => setActiveModal({ type: 'profile' })}>
              <img 
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
                alt="Profile" 
                className={`w-full h-full object-cover ${profile?.photoURL?.includes('pixel') ? '[image-rendering:pixelated]' : ''}`}
                referrerPolicy="no-referrer"
              />
            </div>
            <button 
              onClick={() => setActiveModal({ type: 'profile' })}
              className="rounded-full p-2 text-outline transition-all hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              title="Profile Settings"
            >
              <User size={20} />
            </button>
            <button 
              onClick={logout}
              className="rounded-full p-2 text-outline transition-all hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`relative min-h-screen px-4 pb-12 pt-24 sm:px-6 md:pl-80 md:pr-8 md:pt-28 ${
        currentScreen === 'bug-wall' ? 'page-glow-bug' :
        currentScreen === 'tips-tricks' ? 'page-glow-tips' :
        currentScreen === 'knowledge-sharing' ? 'page-glow-knowledge' :
        currentScreen === 'achievements' ? 'page-glow-achievements' :
        currentScreen === 'focus-zone' ? 'page-glow-focus' : ''
      }`}>
        <AnimatePresence mode="wait" custom={navDirection}>
          <motion.div
            key={currentScreen}
            custom={navDirection}
            initial={{ opacity: 0, x: navDirection * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: navDirection * -32 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mx-auto max-w-7xl"
          >
            {currentScreen === 'dashboard' && <DashboardScreen onNavigate={navigateTo} bugs={bugs} tips={tips} proposals={proposals} achievements={achievements} searchQuery={searchQuery} activeUsers={activeUsers} />}
            {currentScreen === 'bug-wall' && (
              <BugWallScreen 
                bugs={bugs} 
                onReact={reactToBug} 
                onComment={addCommentToBug}
                onReactComment={reactToComment}
                onReplyComment={replyToComment}
                onDeleteBug={deleteBug}
                onEditBug={(bug) => setActiveModal({ type: 'edit-bug', data: bug })}
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
                onEditTip={(tip) => setActiveModal({ type: 'edit-tip', data: tip })}
                onReact={reactToTip}
                searchQuery={searchQuery}
                selectedItemId={selectedItemId}
                onClearSelection={() => setSelectedItemId(null)}
              />
            )}
            {currentScreen === 'knowledge-sharing' && (
              <KnowledgeSharingScreen 
                onNavigate={setCurrentScreen} 
                proposals={proposals}
                onAddProposal={() => setActiveModal({ type: 'proposal' })}
                onDeleteProposal={deleteProposal}
                onEditProposal={(proposal) => setActiveModal({ type: 'edit-proposal', data: proposal })}
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
                onEditAchievement={(achievement) => setActiveModal({ type: 'edit-achievement', data: achievement })}
                searchQuery={searchQuery}
                selectedItemId={selectedItemId}
                onClearSelection={() => setSelectedItemId(null)}
              />
            )}
{currentScreen === 'focus-zone' && <FocusZoneScreen />}
            {currentScreen === 'admin-dashboard' && <AdminDashboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modals */}
      <Modal 
        isOpen={activeModal?.type === 'bug'} 
        onClose={() => setActiveModal(null)} 
        hideHeader
      >
        <BugForm 
          onSubmit={handleBugSubmit} 
          onClose={() => setActiveModal(null)} 
          showToast={showToast}
        />
      </Modal>

      <Modal 
        isOpen={activeModal?.type === 'edit-bug'} 
        onClose={() => setActiveModal(null)} 
        hideHeader
      >
        {activeModal?.type === 'edit-bug' && (
          <BugForm 
            initialData={activeModal.data}
            onSubmit={(updatedBug) => {
              editBug(activeModal.data.id, updatedBug);
              showToast('Story updated successfully!', 'success');
              setActiveModal(null);
            }} 
            onClose={() => setActiveModal(null)} 
            showToast={showToast}
          />
        )}
      </Modal>

      <Modal 
        isOpen={activeModal?.type === 'tip'} 
        onClose={() => setActiveModal(null)} 
        title="Contribute a Tip"
      >
        <TipForm onSubmit={handleTipSubmit} onClose={() => setActiveModal(null)} />
      </Modal>

      <Modal 
        isOpen={activeModal?.type === 'edit-tip'} 
        onClose={() => setActiveModal(null)} 
        title="Edit Tip"
      >
        {activeModal?.type === 'edit-tip' && (
          <TipForm 
            initialData={activeModal.data}
            onSubmit={(updatedTip) => {
              editTip(activeModal.data.id, updatedTip);
              showToast('Tip updated successfully!', 'success');
              setActiveModal(null);
            }} 
            onClose={() => setActiveModal(null)} 
          />
        )}
      </Modal>

<Modal 
        isOpen={activeModal?.type === 'proposal'} 
        onClose={() => setActiveModal(null)} 
        title="Knowledge Sharing Proposal"
      >
        <ProposalForm onSubmit={handleProposalSubmit} onClose={() => setActiveModal(null)} />
      </Modal>

      <Modal 
        isOpen={activeModal?.type === 'edit-proposal'} 
        onClose={() => setActiveModal(null)} 
        title="Edit Proposal"
      >
        {activeModal?.type === 'edit-proposal' && (
          <ProposalForm 
            initialData={activeModal.data}
            onSubmit={(updatedProposal) => {
              editProposal(activeModal.data.id, updatedProposal);
              showToast('Proposal updated successfully!', 'success');
              setActiveModal(null);
            }} 
            onClose={() => setActiveModal(null)} 
          />
        )}
      </Modal>

      <Modal 
        isOpen={activeModal?.type === 'achievement'} 
        onClose={() => setActiveModal(null)} 
        title="Add Achievement"
      >
        <AchievementForm onSubmit={handleAchievementSubmit} onClose={() => setActiveModal(null)} />
      </Modal>

      <Modal 
        isOpen={activeModal?.type === 'edit-achievement'} 
        onClose={() => setActiveModal(null)} 
        title="Edit Achievement"
      >
        {activeModal?.type === 'edit-achievement' && (
          <AchievementForm 
            initialData={activeModal.data}
            onSubmit={async (updatedAchievement) => {
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

      <Modal 
        isOpen={activeModal?.type === 'selector'} 
        onClose={() => setActiveModal(null)} 
        title="What would you like to share?"
      >
        <EntrySelectorModal onSelect={handleEntrySelect} />
      </Modal>

      <Modal 
        isOpen={activeModal?.type === 'profile'} 
        onClose={() => setActiveModal(null)} 
        title="Profile Settings"
      >
        <ProfileForm onClose={() => setActiveModal(null)} onUpdateAvatars={updateUserAvatars} />
      </Modal>

      {/* Toast Feedback */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
