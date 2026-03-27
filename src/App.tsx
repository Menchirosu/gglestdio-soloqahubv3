import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Bug, 
  Lightbulb, 
  BookOpen,
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
import { EntrySelectorModal } from './components/EntrySelectorModal';
import { ProfileForm } from './components/ProfileForm';

import { DashboardScreen } from './screens/DashboardScreen';
import { BugWallScreen } from './screens/BugWallScreen';
import { TipsTricksScreen } from './screens/TipsTricksScreen';
import { KnowledgeSharingScreen } from './screens/KnowledgeSharingScreen';
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
    bugs, tips, proposals, notifications,
    addBug, deleteBug, editBug, addTip, deleteTip, editTip, addProposal, deleteProposal, editProposal,
    reactToBug, addCommentToBug, reactToComment, replyToComment, deleteComment, editComment, updateUserAvatars,
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

  const handleEntrySelect = (type: 'bug' | 'tip' | 'knowledge') => {
    if (type === 'bug') setActiveModal({ type: 'bug' });
    if (type === 'tip') setActiveModal({ type: 'tip' });
    if (type === 'knowledge') setActiveModal({ type: 'proposal' });
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

    return results.slice(0, 10);
  }, [searchQuery, bugs, tips, proposals]);

  const handleResultClick = (result: any) => {
    navigateTo(result.screen as Screen);
    setIsSearchResultsOpen(false);
    setSelectedItemId(result.id);
    setSearchQuery('');
    // Keep the search query to maintain filtering on the target screen
    showToast(`Redirecting to ${result.type}: ${result.title}`);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-surface border-r border-outline-variant/10 flex flex-col py-6 z-50 transition-transform duration-300 md:translate-x-0 dot-grid ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-8 mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
              <LayoutDashboard size={18} />
            </div>
            <div>
              <h1 className="text-lg font-black text-primary leading-none font-headline">QA Solo Hub</h1>
              <p className="text-[10px] uppercase tracking-widest text-tertiary mt-1 font-bold">QA Community Hub</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-surface-container-low rounded-full" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
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
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-full transition-all active:scale-95 group/nav ${
                currentScreen === item.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-tertiary hover:text-primary hover:bg-surface-container-high'
              }`}
            >
              <item.icon size={20} />
              <span className="font-headline font-medium text-sm flex-1 text-left">{item.label}</span>
              <span className={`text-[9px] font-mono transition-opacity ${
                currentScreen === item.id ? 'opacity-50 text-white' : 'opacity-0 group-hover/nav:opacity-40 text-outline'
              }`}>{idx + 1}</span>
            </button>
          ))}
        </nav>

        <div className="px-4 mt-auto space-y-3">
          <button
            onClick={() => setActiveModal({ type: 'selector' })}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
          >
            <PlusCircle size={20} />
            New Entry
          </button>

          {/* User identity footer */}
          <div className="flex items-center gap-3 px-2 py-3 rounded-2xl hover:bg-surface-container-high transition-colors cursor-pointer" onClick={() => setActiveModal({ type: 'profile' })}>
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-outline-variant/20 shrink-0">
              <img
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`}
                alt="Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface truncate leading-tight">{profile?.displayName || 'You'}</p>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                profile?.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-tertiary'
              }`}>
                {profile?.role === 'admin' ? 'Admin' : 'QA'}
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); logout(); }}
              className="p-1.5 text-outline hover:text-error hover:bg-error/10 rounded-full transition-all shrink-0"
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55]"
            onClick={() => {
              setIsSearchResultsOpen(false);
              setSearchQuery('');
            }}
          />
        )}
      </AnimatePresence>

      {/* TopBar */}
      <header className={`fixed top-0 right-0 left-0 md:left-64 h-16 bg-background/70 backdrop-blur-xl border-b border-outline-variant/10 flex items-center justify-between px-8 transition-all duration-300 ${isSearchResultsOpen ? 'z-[60]' : 'z-30'}`}>
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-surface-container-low rounded-full" aria-label="Open menu">
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
              placeholder="Search wisdom, bugs, or tips..." 
              className="w-full bg-surface-container-low border-none rounded-full py-2 pl-11 pr-10 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedItemId(null);
                  setIsSearchResultsOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-container-high rounded-full text-outline hover:text-on-surface transition-all"
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

        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-outline hover:bg-surface-container-low rounded-full transition-all"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 text-outline hover:bg-surface-container-low rounded-full transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-background animate-pulse"></span>
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
                    className="absolute right-0 mt-2 w-80 bg-surface rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden z-20"
                  >
                    <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between">
                      <h4 className="font-bold text-sm">Notifications</h4>
                      <button 
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
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
                            className={`p-4 hover:bg-surface-container-low transition-colors cursor-pointer border-b border-outline-variant/5 relative ${!n.isRead ? 'bg-primary/5' : ''}`}
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
                    <div className="p-3 text-center bg-surface-container-low">
                      <p className="text-xs text-outline italic">Showing latest {notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/30">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-on-surface leading-none">{profile?.displayName}</p>
              <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider">{profile?.role === 'admin' ? 'Administrator' : 'Solo QA Architect'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border-2 border-white shadow-sm cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveModal({ type: 'profile' })}>
              <img 
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
                alt="Profile" 
                className={`w-full h-full object-cover ${profile?.photoURL?.includes('pixel') ? '[image-rendering:pixelated]' : ''}`}
                referrerPolicy="no-referrer"
              />
            </div>
            <button 
              onClick={() => setActiveModal({ type: 'profile' })}
              className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-full transition-all"
              title="Profile Settings"
            >
              <User size={20} />
            </button>
            <button 
              onClick={logout}
              className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-full transition-all"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`pt-24 pb-12 px-6 md:pl-72 min-h-screen relative ${
        currentScreen === 'bug-wall' ? 'page-glow-bug' :
        currentScreen === 'tips-tricks' ? 'page-glow-tips' :
        currentScreen === 'knowledge-sharing' ? 'page-glow-knowledge' :
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
            className="max-w-7xl mx-auto"
          >
            {currentScreen === 'dashboard' && <DashboardScreen onNavigate={navigateTo} bugs={bugs} tips={tips} proposals={proposals} searchQuery={searchQuery} activeUsers={activeUsers} />}
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
