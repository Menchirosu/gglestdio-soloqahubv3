import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bug, MoreHorizontal, PlusCircle, MessageCircle, Heart, Shield, Trash2, Clock, Edit3, Image as ImageIcon, Smile, Share2, CornerDownRight, AlertCircle, Zap, Send, Search, X, Repeat } from 'lucide-react';
import { ReactionButton } from '../components/ReactionButton';
import { BugStory } from '../types';
import { useAuth } from '../AuthContext';
import { timeAgo } from '../utils/timeAgo';
import Linkify from 'linkify-react';
import { GiphyFetch } from '@giphy/js-fetch-api';

const isSafeUrl = (href: string) =>
  /^https?:\/\//i.test(href) &&
  !/^(javascript|data|vbscript):/i.test(href);

const safeLinkifyOptions = {
  className: 'text-primary hover:underline break-all',
  target: '_blank',
  rel: 'noopener noreferrer nofollow',
  attributes: (href: string) =>
    isSafeUrl(href)
      ? {}
      : { href: '#', onClick: (e: Event) => e.preventDefault() },
};
import { Grid, Gif } from '@giphy/react-components';
import { uploadImage } from '../firebase';
import { BugForm } from '../components/BugForm';

const giphyApiKey = import.meta.env.VITE_GIPHY_API_KEY;
const gf = giphyApiKey ? new GiphyFetch(giphyApiKey) : null;

interface BugWallProps {
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
  selectedItemId?: string | null;
  onClearSelection?: () => void;
  onSearchChange?: (query: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onAddBugSubmit?: (bug: any) => void;
}

export function BugWallScreen({ 
  bugs, 
  onReact, 
  onComment, 
  onReactComment,
  onReplyComment,
  onDeleteBug, 
  onEditBug, 
  onAddBug, 
  onDeleteComment, 
  onEditComment, 
  searchQuery,
  selectedItemId,
  onClearSelection,
  onSearchChange,
  showToast,
  onAddBugSubmit
}: BugWallProps) {
  const { profile } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All Stories');
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isCommentAnonymous, setIsCommentAnonymous] = useState(false);
  const [isComposingInline, setIsComposingInline] = useState(false);
  
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [commentMenuOpenId, setCommentMenuOpenId] = useState<string | null>(null);
  const [commentImages, setCommentImages] = useState<File[]>([]);
  const [commentGif, setCommentGif] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  
  const [replyImages, setReplyImages] = useState<File[]>([]);
  const [replyGif, setReplyGif] = useState<string | null>(null);
  const [showReplyGifPicker, setShowReplyGifPicker] = useState(false);
  const [replyGifSearchTerm, setReplyGifSearchTerm] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [animatingComments, setAnimatingComments] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const gifButtonRef = useRef<HTMLButtonElement>(null);
  
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const replyGifPickerRef = useRef<HTMLDivElement>(null);
  const replyGifButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      
      // Check if click was on a GIF picker or its trigger button
      if (target.closest('.gif-picker-container') || target.closest('.gif-button-trigger')) {
        return;
      }

      if (showGifPicker) setShowGifPicker(false);
      if (showReplyGifPicker) setShowReplyGifPicker(false);
      
      // Collapse expanded card if clicking outside
      if (commentingOn && !target.closest('.bug-card')) {
        setCommentingOn(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [commentingOn, showGifPicker, showReplyGifPicker]);

  const handleCommentSubmit = async (bugId: string) => {
    if ((commentText.trim() || commentImages.length > 0 || commentGif) && profile) {
      setIsUploading(true);
      try {
        const imageUrls: string[] = [];
        for (const file of commentImages) {
          try {
            const url = await uploadImage(file, 'comments');
            if (url) imageUrls.push(url);
          } catch (e) {
            console.error("Failed to upload image", e);
            if (showToast) showToast('Failed to upload image.', 'error');
          }
        }
        await onComment(bugId, commentText, profile?.displayName || 'Anonymous', isCommentAnonymous, profile?.photoURL || null, profile?.uid || null, imageUrls[0] || null, commentGif || null, imageUrls);
        
        // Clear state only on success
        setCommentText('');
        setCommentImages([]);
        setCommentGif(null);
        setShowGifPicker(false);
        setIsCommentAnonymous(false);
        if (showToast) showToast('Comment posted successfully!', 'success');
      } catch (error: any) {
        console.error("Failed to post comment", error);
        let errorMessage = 'Failed to post comment. Please try again.';
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError.error === 'Missing or insufficient permissions.') {
            errorMessage = 'Permission denied. Please ensure you are logged in and approved.';
          }
        } catch (e) {
          // Not a JSON error
        }
        if (showToast) showToast(errorMessage, 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleReplySubmit = async (bugId: string, commentId: string) => {
    if ((replyText.trim() || replyImages.length > 0 || replyGif) && profile) {
      setIsUploading(true);
      try {
        const imageUrls: string[] = [];
        for (const file of replyImages) {
          try {
            const url = await uploadImage(file, 'replies');
            if (url) imageUrls.push(url);
          } catch (e) {
            console.error("Failed to upload image", e);
            if (showToast) showToast('Failed to upload image.', 'error');
          }
        }

        await onReplyComment(bugId, commentId, {
          text: replyText,
          author: profile?.displayName || 'Anonymous',
          authorId: profile?.uid || null,
          authorPhotoURL: profile?.photoURL || null,
          date: 'Just now',
          isAnonymous: isCommentAnonymous,
          imageUrl: imageUrls[0] || null,
          imageUrls: imageUrls,
          gifUrl: replyGif || null
        });
        setReplyText('');
        setReplyImages([]);
        setReplyGif(null);
        setShowReplyGifPicker(false);
        setReplyingToCommentId(null);
        setIsCommentAnonymous(false);
        if (showToast) showToast('Reply posted successfully!', 'success');
      } catch (error: any) {
        console.error("Failed to post reply", error);
        let errorMessage = 'Failed to post reply. Please try again.';
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError.error === 'Missing or insufficient permissions.') {
            errorMessage = 'Permission denied. Please ensure you are logged in and approved.';
          }
        } catch (e) {
          // Not a JSON error
        }
        if (showToast) showToast(errorMessage, 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file && commentImages.length < 3) {
          setCommentImages(prev => [...prev, file]);
        }
      }
    }
  };

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleLocalSearchChange = (val: string) => {
    setLocalSearch(val);
    if (onSearchChange) onSearchChange(val);
  };

  const filteredBugs = bugs.filter(b => {
    if (selectedItemId) return b.id === selectedItemId;
    const matchesFilter = activeFilter === 'All Stories' || (b.tags?.includes(activeFilter)) || (b.mood?.includes(activeFilter));
    const matchesSearch = b.title.toLowerCase().includes(localSearch.toLowerCase()) || b.discovery.toLowerCase().includes(localSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getMoodColor = (mood: string) => {
    if (!mood) return 'bg-surface-container-high text-on-surface-variant border-outline-variant/20';
    if (mood.includes('Terrified')) return 'bg-error/10 text-error border-error/20';
    if (mood.includes('Amused')) return 'bg-blue-500/10 text-blue-500 border-blue-300/40';
    if (mood.includes('Frustrated')) return 'bg-amber-500/10 text-amber-600 border-amber-300/40';
    if (mood.includes('Proud')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-300/40';
    if (mood.includes('Confused')) return 'bg-outline/10 text-outline border-outline/20';
    return 'bg-surface-container-high text-on-surface-variant border-outline-variant/20';
  };

  const getMoodBorderColor = (mood: string) => {
    if (!mood) return 'border-l-outline-variant/30';
    if (mood.includes('Terrified')) return 'border-l-red-500';
    if (mood.includes('Frustrated')) return 'border-l-amber-500';
    if (mood.includes('Proud')) return 'border-l-emerald-500';
    if (mood.includes('Amused')) return 'border-l-blue-400';
    return 'border-l-primary/40';
  };

  const getAvatarUrl = (item: { authorId?: string, authorPhotoURL?: string, author: string, isAnonymous?: boolean, id: string }) => {
    if (item.isAnonymous) return `https://api.dicebear.com/7.x/bottts/svg?seed=${item.id}`;
    
    // If it's the current user, always use their latest profile photo
    // Match by UID or fallback to name if UID is missing (for older posts)
    const isCurrentUser = profile && (item.authorId === profile.uid || (!item.authorId && item.author === profile.displayName));

    if (isCurrentUser) {
      return profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`;
    }
    
    // Otherwise use the stored photo or fallback to seed
    return item.authorPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.author}`;
  };

  const isPixelated = (url?: string, author?: string) => {
    return url?.includes('pixel') || author?.includes('pixel');
  };

  const isDeletable = (bug: BugStory) => {
    if (!profile) return false;
    
    // Check ownership
    const isOwner = bug.authorId === profile.uid || (!bug.authorId && bug.author === profile.displayName);
    if (!isOwner) return false;

    // Check time restriction (15 minutes)
    if (bug.createdAt) {
      const bugTime = bug.createdAt?.toMillis ? bug.createdAt.toMillis() : new Date(bug.createdAt).getTime();
      const now = Date.now();
      const diffMinutes = (now - bugTime) / (1000 * 60);
      if (diffMinutes > 15) return false;
    }

    return true;
  };

  const isCommentDeletable = (comment: any) => {
    if (!profile) return false;
    
    // Check ownership
    const isOwner = comment.authorId === profile.uid || (!comment.authorId && comment.author === profile.displayName);
    if (!isOwner) return false;

    // Check time restriction (15 minutes)
    if (comment.createdAt) {
      const commentTime = new Date(comment.createdAt).getTime();
      const now = Date.now();
      const diffMinutes = (now - commentTime) / (1000 * 60);
      if (diffMinutes > 15) return false;
    }

    return true;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-4">
      <header className="page-hero relative overflow-hidden px-6 py-10 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-primary/10 rounded-[8px]">
                <Bug className="text-primary" size={28} />
              </div>
              <span className="page-kicker text-primary/70">Bug Archive</span>
            </div>
            <h2 className="text-6xl md:text-7xl font-black text-on-surface tracking-tighter leading-[0.9]">
              Freedom <span className="text-primary">Wall</span>
            </h2>
            <p className="text-on-surface-variant text-lg mt-6 leading-relaxed font-medium opacity-80">
              A living archive of the bugs that tested our patience, the ones that made us laugh, and the lessons they left behind.
            </p>
          </motion.div>
        </div>
        
        {/* Abstract background elements */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute -left-10 bottom-0 w-64 h-64 bg-secondary/5 rounded-full blur-[80px]" />
      </header>

      {/* Inline Post Composer */}
      <motion.div 
        layout
        className="page-panel p-4 mb-8"
      >
        {!isComposingInline ? (
          <div 
            onClick={() => setIsComposingInline(true)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden flex-shrink-0 border border-outline-variant/10">
              <img 
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
                alt="Me" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 text-outline/40 text-sm font-medium">
              What's the bug story today, {profile?.displayName?.split(' ')[0]}?
            </div>
            <button className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-bold rounded-full transition-opacity">
              Post
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <BugForm 
              onSubmit={(bug) => {
                if (onAddBugSubmit) onAddBugSubmit(bug);
                setIsComposingInline(false);
              }}
              onClose={() => setIsComposingInline(false)}
              showToast={showToast}
            />
          </div>
        )}
      </motion.div>

      <div className="page-toolbar flex gap-2 overflow-x-auto pb-3 no-scrollbar sticky top-20 z-20 py-3 -mx-4 px-4 mb-4">
        {selectedItemId && (
          <button 
            onClick={() => {
              if (onClearSelection) onClearSelection();
              if (onSearchChange) onSearchChange('');
            }}
            className="whitespace-nowrap flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border bg-on-surface text-surface"
          >
            <X size={14} />
            Clear Search
          </button>
        )}
        {['All Stories', 'Terrified', 'Amused', 'Frustrated', 'Proud', 'UI', 'Automation'].map((tag, idx) => (
          <button 
            key={idx} 
            onClick={() => setActiveFilter(tag)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              activeFilter === tag
                ? 'bg-primary/10 text-primary border-primary shadow-sm shadow-primary/10'
                : 'bg-surface-container-low border-outline-variant/10 text-outline hover:border-outline/30 hover:text-on-surface'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        {filteredBugs.length === 0 && (
          <div className="page-empty flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-border bg-input text-muted-foreground">
              <Bug size={22} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[15px] text-foreground" style={{ fontWeight: 590 }}>No stories here yet</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">Be the first to share one, or try a different filter.</p>
            </div>
            <button
              onClick={onAddBug}
              className="inline-flex items-center gap-2 rounded-[6px] bg-primary px-4 py-2 text-[13px] text-white transition-colors hover:bg-primary/90"
              style={{ fontWeight: 510 }}
            >
              <PlusCircle size={14} />
              Post a bug story
            </button>
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {filteredBugs.map((bug) => (
            <motion.article
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={bug.id}
              onClick={() => setCommentingOn(prev => prev === bug.id ? null : bug.id)}
              className={`bug-card group relative bg-surface py-6 transition-all border-b border-outline-variant/10 last:border-0 cursor-pointer border-l-[3px] pl-4 ${getMoodBorderColor(bug.mood)} ${commentingOn === bug.id ? 'bg-surface-container-low/50' : 'hover:bg-surface-container-low/30'}`}
            >
              <div className="flex gap-3">
                {/* Avatar Column */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden flex-shrink-0 border border-outline-variant/10">
                    <img 
                      src={getAvatarUrl(bug)} 
                      alt={bug.isAnonymous ? 'Anonymous' : bug.author} 
                      className={`w-full h-full object-cover ${(!bug.isAnonymous && isPixelated(getAvatarUrl(bug), bug.author)) ? '[image-rendering:pixelated]' : ''}`} 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Top Row */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-on-surface hover:underline cursor-pointer">
                        {bug.isAnonymous ? 'Anonymous Architect' : bug.author}
                      </h4>
                      <span className="text-xs text-outline/60">{timeAgo(bug.createdAt || bug.date)}</span>
                      <span className="text-[9px] font-mono text-outline/35 hidden sm:inline">#{bug.id.slice(0, 7).toUpperCase()}</span>
                    </div>
                    
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === bug.id ? null : bug.id);
                        }}
                        className="text-outline/40 hover:text-on-surface transition-colors p-1 rounded-full hover:bg-surface-container-high"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      
                      <AnimatePresence>
                        {menuOpenId === bug.id && (
                          <>
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-30" 
                              onClick={() => setMenuOpenId(null)}
                            />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 mt-2 w-48 bg-surface rounded-[8px] shadow-2xl border border-outline-variant/20 z-40 py-2 overflow-hidden"
                            >
                              <button 
                                onClick={() => {
                                  onEditBug(bug);
                                  setMenuOpenId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-3"
                              >
                                <Edit3 size={16} />
                                Edit
                              </button>
                              {isDeletable(bug) && (
                                <button 
                                  onClick={() => {
                                    setDeletingId(bug.id);
                                    setMenuOpenId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-medium text-error hover:bg-error/5 transition-colors flex items-center gap-3"
                                >
                                  <Trash2 size={16} />
                                  Delete
                                </button>
                              )}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {deletingId === bug.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-error/5 border border-error/20 rounded-[8px] p-4 flex items-center justify-between"
                    >
                      <span className="text-xs font-black uppercase tracking-widest text-error">Delete permanently?</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            onDeleteBug(bug.id);
                            setDeletingId(null);
                          }}
                          className="px-4 py-2 bg-error text-white text-[10px] font-black uppercase tracking-widest rounded-[8px] hover:bg-error-dark transition-all shadow-lg shadow-error/20"
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => setDeletingId(null)}
                          className="px-4 py-2 bg-surface-container-high text-on-surface-variant text-[10px] font-black uppercase tracking-widest rounded-[8px] hover:bg-surface-container-highest transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Title + severity badges */}
                  <div className="space-y-1.5 mt-1">
                    {bug.title && (
                      <h3 className="text-base font-bold text-on-surface leading-snug">{bug.title}</h3>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {bug.impact && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-error/10 text-error border border-error/20">
                          {bug.impact}
                        </span>
                      )}
                      {bug.mood && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${getMoodColor(bug.mood)}`}>
                          {bug.mood}
                        </span>
                      )}
                      {bug.tags?.map(tag => (
                        <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-surface-container-high text-outline/70 border border-outline-variant/20">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 mt-2">
                    <p className={`text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap ${commentingOn !== bug.id ? 'line-clamp-3' : ''}`}>
                      <Linkify options={safeLinkifyOptions}>
                        {bug.discovery}
                      </Linkify>
                    </p>
                    
                    {(bug.imageUrls && bug.imageUrls.length > 0) || bug.imageUrl || bug.gifUrl ? (
                      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                        {bug.imageUrls && bug.imageUrls.length > 0 ? (
                          bug.imageUrls.map((url, i) => (
                            <motion.img 
                              whileHover={{ opacity: 0.9 }}
                              key={i} 
                              src={url} 
                              alt="" 
                              className="w-full aspect-square object-cover rounded-[8px] border border-outline-variant/10 shadow-sm cursor-pointer" 
                            />
                          ))
                        ) : bug.imageUrl && (
                          <motion.img 
                            whileHover={{ opacity: 0.9 }}
                            src={bug.imageUrl} 
                            alt="" 
                            className="w-full h-auto max-h-[400px] object-contain rounded-[8px] border border-outline-variant/10 shadow-sm cursor-pointer" 
                          />
                        )}
                        {bug.gifUrl && (
                          <motion.img 
                            whileHover={{ opacity: 0.9 }}
                            src={bug.gifUrl} 
                            alt="" 
                            className="w-full h-auto max-h-[400px] object-contain rounded-[8px] border border-outline-variant/10 shadow-sm cursor-pointer" 
                          />
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Interaction Bar */}
                  <div className="pt-2 flex items-center gap-4">
                    <ReactionButton
                      count={bug.reactions?.['❤️'] || 0}
                      isReacted={!!bug.reactions?.['❤️']}
                      onReact={(e) => {
                        e.stopPropagation();
                        onReact(bug.id, '❤️', profile?.displayName);
                      }}
                    />
                    
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentingOn(commentingOn === bug.id ? null : bug.id);
                      }}
                      className={`flex items-center gap-1.5 transition-all ${
                        commentingOn === bug.id ? 'text-primary' : 'text-outline/60 hover:text-primary'
                      }`}
                    >
                      <MessageCircle size={20} />
                      <span className="text-xs font-medium">
                        {bug.comments?.length || '0'}
                      </span>
                    </motion.button>
                  </div>

                  {/* Comments Section */}
                  <AnimatePresence>
                    {commentingOn === bug.id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onAnimationStart={() => setAnimatingComments(bug.id)}
                        onAnimationComplete={() => setAnimatingComments(prev => prev === bug.id ? null : prev)}
                        onClick={(e) => e.stopPropagation()}
                        className={`mt-6 space-y-6 pl-4 border-l-2 border-outline-variant/10 ${animatingComments === bug.id ? 'overflow-hidden' : ''}`}
                      >
                        {bug.comments?.map((comment) => (
                          <div key={comment.id} className="flex gap-3 group/comment relative">
                            <div className="w-8 h-8 rounded-[8px] bg-surface-container-high overflow-hidden flex-shrink-0 border border-outline-variant/10">
                              <img 
                                src={getAvatarUrl(comment)} 
                                alt={comment.isAnonymous ? 'Anonymous' : comment.author} 
                                className={`w-full h-full object-cover ${comment.isAnonymous ? 'p-1' : ''} ${(!comment.isAnonymous && isPixelated(getAvatarUrl(comment), comment.author)) ? '[image-rendering:pixelated]' : ''}`} 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-on-surface">
                                    {comment.isAnonymous ? 'Anonymous Architect' : comment.author}
                                  </span>
                                  <span className="text-xs text-outline/60">{timeAgo(comment.createdAt || comment.date)}</span>
                                </div>
                                
                                {isCommentDeletable(comment) && (
                                  <div className="relative">
                                    <button 
                                      onClick={() => setCommentMenuOpenId(commentMenuOpenId === comment.id ? null : comment.id)}
                                      className="text-outline/40 hover:text-on-surface transition-colors p-1 rounded-lg hover:bg-surface-container-high opacity-0 group-hover/comment:opacity-100"
                                    >
                                      <MoreHorizontal size={14} />
                                    </button>
                                    
                                    <AnimatePresence>
                                      {commentMenuOpenId === comment.id && (
                                        <>
                                          <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="fixed inset-0 z-30" 
                                            onClick={() => setCommentMenuOpenId(null)}
                                          />
                                          <motion.div 
                                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                            className="absolute right-0 mt-1 w-32 bg-surface rounded-[8px] shadow-xl border border-outline-variant/20 z-40 py-1 overflow-hidden"
                                          >
                                            <button 
                                              onClick={() => {
                                                setEditingCommentId(comment.id);
                                                setEditCommentText(comment.text);
                                                setCommentMenuOpenId(null);
                                              }}
                                              className="w-full px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-on-surface hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                                            >
                                              <Edit3 size={12} />
                                              Edit
                                            </button>
                                            <button 
                                              onClick={() => {
                                                onDeleteComment(bug.id, comment.id);
                                                setCommentMenuOpenId(null);
                                              }}
                                              className="w-full px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-error hover:bg-error/10 transition-colors flex items-center gap-2"
                                            >
                                              <Trash2 size={12} />
                                              Delete
                                            </button>
                                          </motion.div>
                                        </>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )}
                              </div>
                              
                              {editingCommentId === comment.id ? (
                                <div className="mt-2 flex flex-col gap-2">
                                  <textarea
                                    autoFocus
                                    value={editCommentText}
                                    onChange={(e) => setEditCommentText(e.target.value)}
                                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-[8px] p-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none font-medium"
                                    rows={2}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => setEditingCommentId(null)}
                                      className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-outline hover:text-on-surface"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (editCommentText.trim()) {
                                          onEditComment(bug.id, comment.id, editCommentText);
                                          setEditingCommentId(null);
                                        }
                                      }}
                                      disabled={!editCommentText.trim()}
                                      className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg disabled:opacity-50 shadow-lg shadow-primary/20"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-1 space-y-3">
                                  {comment.text && (
                                    <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap break-words">
                                      <Linkify options={safeLinkifyOptions}>
                                        {comment.text}
                                      </Linkify>
                                    </p>
                                  )}
                                  {comment.imageUrls && comment.imageUrls.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {comment.imageUrls.map((url, idx) => (
                                        <img key={idx} src={url} alt="" className="max-w-full h-auto rounded-[8px] max-h-64 object-contain border border-outline-variant/10 shadow-sm" />
                                      ))}
                                    </div>
                                  ) : comment.imageUrl && (
                                    <img src={comment.imageUrl} alt="" className="max-w-full h-auto rounded-[8px] max-h-64 object-contain border border-outline-variant/10 shadow-sm" />
                                  )}
                                  {comment.gifUrl && (
                                    <img src={comment.gifUrl} alt="" className="max-w-full h-auto rounded-[8px] max-h-64 object-contain border border-outline-variant/10 shadow-sm" />
                                  )}
                                  
                                  <div className="flex items-center gap-4 mt-2">
                                    <button 
                                      onClick={() => profile && onReactComment(bug.id, comment.id, profile.uid)}
                                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                                        profile && comment.likes?.includes(profile.uid) ? 'text-error' : 'text-outline/60 hover:text-error'
                                      }`}
                                    >
                                      <Heart size={14} fill={profile && comment.likes?.includes(profile.uid) ? 'currentColor' : 'none'} />
                                      {comment.likes?.length || 0}
                                    </button>
                                    <button 
                                      onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)}
                                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                                        replyingToCommentId === comment.id ? 'text-primary' : 'text-outline/60 hover:text-primary'
                                      }`}
                                    >
                                      <MessageCircle size={14} />
                                      Reply
                                    </button>
                                  </div>

                                  {/* Replies */}
                                  {comment.replies && comment.replies.length > 0 && (
                                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-outline-variant/10">
                                      {comment.replies.map(reply => (
                                        <div key={reply.id} className="flex gap-3">
                                          <div className="w-6 h-6 rounded-lg bg-surface-container-high overflow-hidden flex-shrink-0 border border-outline-variant/10">
                                            <img 
                                              src={getAvatarUrl(reply)} 
                                              alt={reply.isAnonymous ? 'Anonymous' : reply.author} 
                                              className={`w-full h-full object-cover ${reply.isAnonymous ? 'p-1' : ''} ${(!reply.isAnonymous && isPixelated(getAvatarUrl(reply), reply.author)) ? '[image-rendering:pixelated]' : ''}`} 
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-[10px] font-black uppercase tracking-tight text-on-surface">
                                                {reply.isAnonymous ? 'Anonymous Architect' : reply.author}
                                              </span>
                                              <span className="text-[8px] font-black text-outline/40 uppercase tracking-widest">{timeAgo(reply.createdAt || reply.date)}</span>
                                            </div>
                                            <p className="text-xs text-on-surface-variant font-medium leading-relaxed whitespace-pre-wrap break-words">
                                              <Linkify options={{ ...safeLinkifyOptions, className: 'text-primary hover:underline font-bold' }}>
                                                {reply.text}
                                              </Linkify>
                                            </p>
                                            {reply.imageUrls && reply.imageUrls.length > 0 ? (
                                              <div className="flex flex-wrap gap-2 mt-2">
                                                {reply.imageUrls.map((url, idx) => (
                                                  <img key={idx} src={url} alt="" className="max-w-full h-auto rounded-lg max-h-48 object-contain border border-outline-variant/10 shadow-sm" />
                                                ))}
                                              </div>
                                            ) : reply.imageUrl && (
                                              <img src={reply.imageUrl} alt="" className="max-w-full h-auto rounded-lg mt-2 max-h-48 object-contain border border-outline-variant/10 shadow-sm" />
                                            )}
                                            {reply.gifUrl && (
                                              <img src={reply.gifUrl} alt="" className="max-w-full h-auto rounded-lg mt-2 max-h-48 object-contain border border-outline-variant/10 shadow-sm" />
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Reply Input */}
                                  {replyingToCommentId === comment.id && (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="mt-3 flex gap-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="w-6 h-6 rounded-lg bg-surface-container-high overflow-hidden flex-shrink-0 border border-outline-variant/10">
                                        <img 
                                          src={isCommentAnonymous ? `https://api.dicebear.com/7.x/bottts/svg?seed=new` : (profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`)} 
                                          alt="Me" 
                                          className={`w-full h-full object-cover ${isCommentAnonymous ? 'p-1' : ''} ${(!isCommentAnonymous && profile?.photoURL?.includes('pixel')) ? '[image-rendering:pixelated]' : ''}`} 
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                      <div className="flex-1 flex flex-col gap-2 relative">
                                        <div className="relative">
                                          <textarea
                                            autoFocus
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Write a reply..."
                                            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-[8px] p-2 text-xs focus:ring-2 focus:ring-primary/20 transition-all resize-none font-medium pr-10"
                                            rows={1}
                                          />
                                          <button 
                                            onClick={() => handleReplySubmit(bug.id, comment.id)}
                                            disabled={(!replyText.trim() && replyImages.length === 0 && !replyGif) || isUploading}
                                            className="absolute right-2 bottom-2 p-1.5 bg-primary text-white rounded-lg disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-sm shadow-primary/20"
                                          >
                                            <Send size={12} />
                                          </button>
                                        </div>

                                        <AnimatePresence>
                                          {(replyImages.length > 0 || replyGif) && (
                                            <motion.div 
                                              initial={{ opacity: 0, height: 0 }}
                                              animate={{ opacity: 1, height: 'auto' }}
                                              exit={{ opacity: 0, height: 0 }}
                                              className="flex flex-wrap gap-2 overflow-hidden"
                                            >
                                              {replyImages.map((file, idx) => (
                                                <div key={idx} className="relative group/img">
                                                  <img src={URL.createObjectURL(file)} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-outline-variant/20 shadow-sm" />
                                                  <button 
                                                    onClick={() => setReplyImages(prev => prev.filter((_, i) => i !== idx))} 
                                                    className="absolute -top-1 -right-1 bg-error text-white rounded-full p-0.5 shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                                  >
                                                    <Trash2 size={10} />
                                                  </button>
                                                </div>
                                              ))}
                                              
                                              {replyGif && (
                                                <div className="relative group/gif">
                                                  <img src={replyGif} alt="GIF Preview" className="h-16 w-16 object-cover rounded-lg border border-outline-variant/20 shadow-sm" />
                                                  <button 
                                                    onClick={() => setReplyGif(null)} 
                                                    className="absolute -top-1 -right-1 bg-error text-white rounded-full p-0.5 shadow-lg opacity-0 group-hover/gif:opacity-100 transition-opacity"
                                                  >
                                                    <Trash2 size={10} />
                                                  </button>
                                                </div>
                                              )}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>

                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1">
                                            <button 
                                              onClick={() => setIsCommentAnonymous(!isCommentAnonymous)}
                                              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all border ${
                                                isCommentAnonymous ? 'bg-primary/10 border-primary/20 text-primary' : 'text-outline/60 hover:text-on-surface border-transparent hover:bg-surface-container-high'
                                              }`}
                                            >
                                              <Bug size={12} />
                                              <span className="text-[8px] font-black uppercase tracking-widest">Anonymous</span>
                                            </button>
                                            
                                            <div className="h-3 w-[1px] bg-outline-variant/20 mx-1" />

                                            <div className="relative">
                                              <input 
                                                type="file" 
                                                multiple 
                                                accept="image/*" 
                                                onChange={(e) => {
                                                  if (e.target.files) {
                                                    setReplyImages(Array.from(e.target.files));
                                                  }
                                                }}
                                                className="hidden" 
                                                id={`reply-image-upload-${comment.id}`} 
                                              />
                                              <label 
                                                htmlFor={`reply-image-upload-${comment.id}`} 
                                                className="p-1.5 rounded-lg text-outline/60 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer flex items-center"
                                                title="Add Images"
                                              >
                                                <ImageIcon size={14} />
                                              </label>
                                            </div>

                                            <button 
                                              ref={replyGifButtonRef}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setShowReplyGifPicker(!showReplyGifPicker);
                                              }}
                                              className={`gif-button-trigger p-1.5 rounded-lg transition-all ${showReplyGifPicker ? 'text-primary bg-primary/5' : 'text-outline/60 hover:text-primary hover:bg-primary/5'}`}
                                              title="Add GIF"
                                            >
                                              <Smile size={14} />
                                            </button>
                                          </div>
                                          
                                          <button 
                                            onClick={() => {
                                              setReplyingToCommentId(null);
                                              setIsCommentAnonymous(false);
                                              setReplyImages([]);
                                              setReplyGif(null);
                                              setShowReplyGifPicker(false);
                                            }}
                                            className="text-[8px] font-black uppercase tracking-widest text-outline/60 hover:text-on-surface transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>

                                        <AnimatePresence>
                                          {showReplyGifPicker && (
                                            <motion.div 
                                              ref={replyGifPickerRef} 
                                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                              animate={{ opacity: 1, y: 0, scale: 1 }}
                                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                              className="gif-picker-container absolute z-50 bottom-full mb-2 left-0 bg-surface rounded-[8px] shadow-2xl border border-outline-variant/20 w-64 h-80 flex flex-col overflow-hidden"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <div className="p-3 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-on-surface">Giphy Search</span>
                                                <button onClick={() => setShowReplyGifPicker(false)} className="text-outline hover:text-on-surface">
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                              <div className="p-2">
                                                <input
                                                  type="text"
                                                  placeholder="Search GIFs..."
                                                  value={replyGifSearchTerm}
                                                  onChange={(e) => setReplyGifSearchTerm(e.target.value)}
                                                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg p-2 text-xs focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                                />
                                              </div>
                                              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                                {gf ? (
                                                  <Grid 
                                                    key={replyGifSearchTerm}
                                                    width={240} 
                                                    columns={2} 
                                                    fetchGifs={async (offset) => {
                                                      try {
                                                        if (replyGifSearchTerm) {
                                                          return await gf.search(replyGifSearchTerm, { offset, limit: 10 });
                                                        } else {
                                                          return await gf.trending({ offset, limit: 10 });
                                                        }
                                                      } catch (e) {
                                                        console.error("Giphy error:", e);
                                                        return { data: [] } as any;
                                                      }
                                                    }} 
                                                    onGifClick={(gif, e) => {
                                                      e.preventDefault();
                                                      setReplyGif(gif.images.fixed_height.url);
                                                      setShowReplyGifPicker(false);
                                                    }} 
                                                  />
                                                ) : (
                                                  <div className="text-[8px] text-outline p-4 text-center italic">Giphy API key not configured.</div>
                                                )}
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {commentingOn === bug.id && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3 pt-4 border-t border-outline-variant/5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="w-8 h-8 rounded-[8px] bg-surface-container-high overflow-hidden flex-shrink-0 border border-outline-variant/10">
                              <img 
                                src={isCommentAnonymous ? `https://api.dicebear.com/7.x/bottts/svg?seed=new` : (profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`)} 
                                alt="Me" 
                                className={`w-full h-full object-cover ${isCommentAnonymous ? 'p-1' : ''} ${(!isCommentAnonymous && profile?.photoURL?.includes('pixel')) ? '[image-rendering:pixelated]' : ''}`} 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 flex flex-col gap-3 relative">
                              <div className="relative">
                                <textarea
                                  autoFocus
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  onPaste={handlePaste}
                                  placeholder="Add a comment..."
                                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-[8px] p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none font-medium pr-12"
                                  rows={2}
                                />
                                <button 
                                  onClick={() => handleCommentSubmit(bug.id)}
                                  disabled={(!commentText.trim() && commentImages.length === 0 && !commentGif) || isUploading}
                                  className="absolute right-3 bottom-3 p-2 bg-primary text-white rounded-[8px] disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                                >
                                  <Send size={18} />
                                </button>
                              </div>
                              
                              <AnimatePresence>
                                {(commentImages.length > 0 || commentGif) && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-wrap gap-2 overflow-hidden"
                                  >
                                    {commentImages.map((file, idx) => (
                                      <div key={idx} className="relative group/img">
                                        <img src={URL.createObjectURL(file)} alt="Preview" className="h-24 w-24 object-cover rounded-[8px] border border-outline-variant/20 shadow-sm" />
                                        <button 
                                          onClick={() => setCommentImages(prev => prev.filter((_, i) => i !== idx))} 
                                          className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    ))}
                                    
                                    {commentGif && (
                                      <div className="relative group/gif">
                                        <img src={commentGif} alt="GIF Preview" className="h-24 w-24 object-cover rounded-[8px] border border-outline-variant/20 shadow-sm" />
                                        <button 
                                          onClick={() => setCommentGif(null)} 
                                          className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 shadow-lg opacity-0 group-hover/gif:opacity-100 transition-opacity"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => setIsCommentAnonymous(!isCommentAnonymous)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] transition-all border ${
                                      isCommentAnonymous ? 'bg-primary/10 border-primary/20 text-primary' : 'text-outline/60 hover:text-on-surface border-transparent hover:bg-surface-container-high'
                                    }`}
                                  >
                                    <Bug size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Anonymous</span>
                                  </button>
                                  
                                  <div className="h-5 w-[1px] bg-outline-variant/20 mx-1" />

                                  <div className="relative">
                                    <input 
                                      type="file" 
                                      multiple 
                                      accept="image/*" 
                                      onChange={(e) => {
                                        if (e.target.files) {
                                          setCommentImages(Array.from(e.target.files));
                                        }
                                      }}
                                      className="hidden" 
                                      id={`comment-image-upload-${bug.id}`} 
                                    />
                                    <label 
                                      htmlFor={`comment-image-upload-${bug.id}`} 
                                      className="p-2 rounded-[8px] text-outline/60 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer flex items-center"
                                      title="Add Images"
                                    >
                                      <ImageIcon size={18} />
                                    </label>
                                  </div>

                                  <button 
                                    ref={gifButtonRef}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowGifPicker(!showGifPicker);
                                    }}
                                    className={`gif-button-trigger p-2 rounded-[8px] transition-all ${showGifPicker ? 'text-primary bg-primary/5' : 'text-outline/60 hover:text-primary hover:bg-primary/5'}`}
                                    title="Add GIF"
                                  >
                                    <Smile size={18} />
                                  </button>
                                </div>
                                
                                <button 
                                  onClick={() => {
                                    setCommentingOn(null);
                                    setCommentImages([]);
                                    setCommentGif(null);
                                    setShowGifPicker(false);
                                  }}
                                  className="text-[10px] font-black uppercase tracking-widest text-outline/60 hover:text-on-surface transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>

                              <AnimatePresence>
                                {showGifPicker && (
                                  <motion.div 
                                    ref={gifPickerRef} 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="gif-picker-container absolute z-50 bottom-full mb-4 left-0 bg-surface rounded-[8px] shadow-2xl border border-outline-variant/20 w-72 h-96 flex flex-col overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">Giphy Search</span>
                                      <button onClick={() => setShowGifPicker(false)} className="text-outline hover:text-on-surface">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                    <div className="p-2">
                                      <input
                                        type="text"
                                        placeholder="Search GIFs..."
                                        value={gifSearchTerm}
                                        onChange={(e) => setGifSearchTerm(e.target.value)}
                                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-[8px] p-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                      />
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                      {gf ? (
                                        <Grid 
                                          key={gifSearchTerm}
                                          width={260} 
                                          columns={2} 
                                          fetchGifs={async (offset) => {
                                            try {
                                              if (gifSearchTerm) {
                                                return await gf.search(gifSearchTerm, { offset, limit: 10 });
                                              } else {
                                                return await gf.trending({ offset, limit: 10 });
                                              }
                                            } catch (e) {
                                              console.error("Giphy error:", e);
                                              return { data: [] } as any;
                                            }
                                          }} 
                                          onGifClick={(gif, e) => {
                                            e.preventDefault();
                                            setCommentGif(gif.images.fixed_height.url);
                                            setShowGifPicker(false);
                                          }} 
                                        />
                                      ) : (
                                        <div className="text-xs text-outline p-4 text-center italic">Giphy API key not configured.</div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      {filteredBugs.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-32 bg-surface-container-low rounded-[12px] border-2 border-dashed border-outline-variant/10"
        >
          <Bug className="mx-auto text-outline/20 mb-6" size={64} />
          <p className="text-on-surface-variant font-bold text-lg">No stories found for this filter.</p>
          <p className="text-outline text-sm mt-2">Try adjusting your filters or start a new story.</p>
          <button 
            onClick={onAddBug}
            className="mt-8 px-8 py-3 bg-primary text-white rounded-[8px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20"
          >
            Start a Story
          </button>
        </motion.div>
      )}
    </div>
  );
}
