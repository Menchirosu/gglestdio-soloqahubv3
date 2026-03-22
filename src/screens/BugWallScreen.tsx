import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bug, MoreHorizontal, PlusCircle, MessageCircle, Heart, Shield, Trash2, Clock, Edit3, Image as ImageIcon, Smile, Share2, CornerDownRight, AlertCircle, Zap, Send, Search, X } from 'lucide-react';
import { BugStory } from '../types';
import { useAuth } from '../AuthContext';
import Linkify from 'linkify-react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid, Gif } from '@giphy/react-components';
import { uploadImage } from '../firebase';

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
  showToast
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
  
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [commentMenuOpenId, setCommentMenuOpenId] = useState<string | null>(null);
  const [commentImages, setCommentImages] = useState<File[]>([]);
  const [commentGif, setCommentGif] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const gifButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        gifPickerRef.current && !gifPickerRef.current.contains(event.target as Node) &&
        gifButtonRef.current && !gifButtonRef.current.contains(event.target as Node)
      ) {
        setShowGifPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
        setCommentingOn(null);
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
    if (replyText.trim() && profile) {
      setIsUploading(true);
      try {
        await onReplyComment(bugId, commentId, {
          text: replyText,
          author: profile?.displayName || 'Anonymous',
          authorId: profile?.uid || null,
          authorPhotoURL: profile?.photoURL || null,
          date: 'Just now',
          isAnonymous: isCommentAnonymous
        });
        setReplyText('');
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
    if (mood.includes('Amused')) return 'bg-secondary/10 text-secondary border-secondary/20';
    if (mood.includes('Frustrated')) return 'bg-tertiary/10 text-tertiary border-tertiary/20';
    if (mood.includes('Proud')) return 'bg-primary/10 text-primary border-primary/20';
    if (mood.includes('Confused')) return 'bg-outline/10 text-outline border-outline/20';
    return 'bg-surface-container-high text-on-surface-variant border-outline-variant/20';
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
    <div className="max-w-5xl mx-auto space-y-12 pb-20 px-4">
      <header className="relative py-12 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Bug className="text-primary" size={28} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">System Intelligence</span>
            </div>
            <h2 className="text-6xl md:text-7xl font-black text-on-surface tracking-tighter font-headline leading-[0.9]">
              Freedom <span className="text-primary italic">Wall</span>
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

      {/* Quick Post Bar */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={onAddBug}
        className="bg-surface-container-low border border-outline-variant/20 p-4 rounded-2xl group cursor-pointer hover:bg-surface-container-high hover:border-primary/30 transition-all shadow-sm hover:shadow-xl hover:shadow-primary/5"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
              alt={profile?.displayName} 
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-surface group-hover:ring-primary/20 transition-all" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-surface rounded-full" />
          </div>
          <div className="flex-1 text-on-surface-variant/60 text-base font-medium">
            What's the bug story today, {profile?.displayName?.split(' ')[0]}?
          </div>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-on-surface text-surface rounded-xl text-sm font-black uppercase tracking-widest hover:bg-primary transition-all shadow-lg shadow-on-surface/10">
            <PlusCircle size={18} />
            Post
          </button>
        </div>
      </motion.div>

      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar sticky top-0 z-20 bg-background/80 backdrop-blur-xl py-2 -mx-4 px-4">
        {selectedItemId && (
          <button 
            onClick={() => {
              if (onClearSelection) onClearSelection();
              if (onSearchChange) onSearchChange('');
            }}
            className="whitespace-nowrap flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border bg-primary border-primary text-white shadow-lg shadow-primary/20"
          >
            <X size={14} />
            Clear Search
          </button>
        )}
        {['All Stories', 'Terrified', 'Amused', 'Frustrated', 'Proud', 'UI', 'Automation'].map((tag, idx) => (
          <button 
            key={idx} 
            onClick={() => setActiveFilter(tag)}
            className={`whitespace-nowrap px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
              activeFilter === tag 
                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-surface-container-low border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high hover:border-outline-variant/30'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        <AnimatePresence mode="popLayout">
          {filteredBugs.map((bug) => (
            <motion.article 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={bug.id} 
              className="group relative bg-surface border border-outline-variant/10 rounded-3xl p-6 hover:shadow-2xl hover:shadow-primary/5 transition-all"
            >
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high overflow-hidden flex-shrink-0 border-2 border-outline-variant/10 group-hover:border-primary/30 transition-all">
                      <img 
                        src={getAvatarUrl(bug)} 
                        alt={bug.isAnonymous ? 'Anonymous' : bug.author} 
                        className={`w-full h-full object-cover ${bug.isAnonymous ? 'p-1.5' : ''} ${(!bug.isAnonymous && isPixelated(getAvatarUrl(bug), bug.author)) ? '[image-rendering:pixelated]' : ''}`} 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                    {bug.mood.includes('Terrified') && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center border-2 border-surface">
                        <AlertCircle size={10} />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-black text-on-surface hover:text-primary transition-colors cursor-pointer uppercase tracking-tight">
                          {bug.isAnonymous ? 'Anonymous Architect' : bug.author}
                        </h4>
                        <span className="text-[10px] font-black text-outline/40 uppercase tracking-widest">{bug.date}</span>
                      </div>
                      <h3 className="text-xl font-black text-on-surface leading-tight tracking-tighter font-headline group-hover:text-primary transition-colors">
                        {bug.title}
                      </h3>
                    </div>
                    
                    {isDeletable(bug) && (
                      <div className="relative">
                        <button 
                          onClick={() => setMenuOpenId(menuOpenId === bug.id ? null : bug.id)}
                          className="text-outline/40 hover:text-on-surface transition-colors p-2 rounded-xl hover:bg-surface-container-high"
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
                                className="absolute right-0 mt-2 w-48 bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 z-40 py-2 overflow-hidden"
                              >
                                <button 
                                  onClick={() => {
                                    onEditBug(bug);
                                    setMenuOpenId(null);
                                  }}
                                  className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-on-surface hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-3"
                                >
                                  <Edit3 size={16} />
                                  Edit Story
                                </button>
                                <button 
                                  onClick={() => {
                                    setDeletingId(bug.id);
                                    setMenuOpenId(null);
                                  }}
                                  className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-error hover:bg-error/10 transition-colors flex items-center gap-3"
                                >
                                  <Trash2 size={16} />
                                  Delete
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {deletingId === bug.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-error/5 border border-error/20 rounded-2xl p-4 flex items-center justify-between"
                    >
                      <span className="text-xs font-black uppercase tracking-widest text-error">Delete permanently?</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            onDeleteBug(bug.id);
                            setDeletingId(null);
                          }}
                          className="px-4 py-2 bg-error text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-error-dark transition-all shadow-lg shadow-error/20"
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => setDeletingId(null)}
                          className="px-4 py-2 bg-surface-container-high text-on-surface-variant text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-container-highest transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 border rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${getMoodColor(bug.mood)}`}>
                        {bug.mood}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-outline/60 uppercase tracking-widest">
                        <Zap size={10} className="text-primary" />
                        Impact: <span className="text-on-surface">{bug.impact}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
                        <Linkify options={{ className: 'text-primary hover:underline font-bold', target: '_blank' }}>
                          {bug.discovery}
                        </Linkify>
                      </p>
                      
                      {(bug.imageUrls && bug.imageUrls.length > 0) || bug.imageUrl || bug.gifUrl ? (
                        <div className="grid gap-2 grid-cols-1">
                          {bug.imageUrls && bug.imageUrls.length > 0 ? (
                            bug.imageUrls.map((url, i) => (
                              <motion.img 
                                whileHover={{ scale: 1.02 }}
                                key={i} 
                                src={url} 
                                alt="" 
                                className="w-full h-48 object-cover rounded-2xl border border-outline-variant/10 shadow-sm" 
                              />
                            ))
                          ) : bug.imageUrl && (
                            <motion.img 
                              whileHover={{ scale: 1.01 }}
                              src={bug.imageUrl} 
                              alt="" 
                              className="w-full h-auto max-h-[400px] object-contain rounded-2xl border border-outline-variant/10 shadow-sm" 
                            />
                          )}
                          {bug.gifUrl && (
                            <motion.img 
                              whileHover={{ scale: 1.01 }}
                              src={bug.gifUrl} 
                              alt="" 
                              className="w-full h-auto max-h-[400px] object-contain rounded-2xl border border-outline-variant/10 shadow-sm" 
                            />
                          )}
                        </div>
                      ) : null}
                      
                      <div className="relative pl-6 py-4 bg-surface-container-lowest rounded-2xl border-l-4 border-primary/30">
                        <CornerDownRight className="absolute left-1.5 top-4 text-primary/40" size={14} />
                        <p className="text-xs text-on-surface italic font-medium leading-relaxed">
                          "<Linkify options={{ className: 'text-primary hover:underline font-bold', target: '_blank' }}>{bug.lesson}</Linkify>"
                        </p>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-outline/40 mt-2">The Takeaway</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {bug.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-dark cursor-pointer bg-primary/5 px-2 py-1 rounded-md transition-colors">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex items-center gap-6 border-t border-outline-variant/5">
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onReact(bug.id, '❤️', profile?.displayName)}
                      className={`flex items-center gap-2 transition-all ${
                        bug.reactions?.['❤️'] ? 'text-error' : 'text-on-surface-variant hover:text-error'
                      }`}
                    >
                      <div className={`p-2 rounded-xl transition-colors ${bug.reactions?.['❤️'] ? 'bg-error/10' : 'hover:bg-error/5'}`}>
                        <Heart size={18} fill={bug.reactions?.['❤️'] ? 'currentColor' : 'none'} />
                      </div>
                      <span className="text-xs font-black tracking-tight">
                        {bug.reactions?.['❤️'] || '0'}
                      </span>
                    </motion.button>
                    
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setCommentingOn(commentingOn === bug.id ? null : bug.id)}
                      className={`flex items-center gap-2 transition-all ${
                        commentingOn === bug.id ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      <div className={`p-2 rounded-xl transition-colors ${commentingOn === bug.id ? 'bg-primary/10' : 'hover:bg-primary/5'}`}>
                        <MessageCircle size={18} />
                      </div>
                      <span className="text-xs font-black tracking-tight">
                        {bug.comments?.length || '0'}
                      </span>
                    </motion.button>

                    <button className="ml-auto p-2 text-outline/40 hover:text-on-surface transition-colors hover:bg-surface-container-high rounded-xl">
                      <Share2 size={16} />
                    </button>
                  </div>

                  {/* Comments Section */}
                  <AnimatePresence>
                    {(commentingOn === bug.id || (bug.comments && bug.comments.length > 0)) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 space-y-6 pl-4 border-l-2 border-outline-variant/10 overflow-hidden"
                      >
                        {bug.comments?.map((comment) => (
                          <div key={comment.id} className="flex gap-3 group/comment relative">
                            <div className="w-8 h-8 rounded-xl bg-surface-container-high overflow-hidden flex-shrink-0 border border-outline-variant/10">
                              <img 
                                src={getAvatarUrl(comment)} 
                                alt={comment.isAnonymous ? 'Anonymous' : comment.author} 
                                className={`w-full h-full object-cover ${comment.isAnonymous ? 'p-1' : ''} ${(!comment.isAnonymous && isPixelated(getAvatarUrl(comment), comment.author)) ? '[image-rendering:pixelated]' : ''}`} 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black uppercase tracking-tight text-on-surface">
                                    {comment.isAnonymous ? 'Anonymous Architect' : comment.author}
                                  </span>
                                  <span className="text-[10px] font-black text-outline/40 uppercase tracking-widest">{comment.date}</span>
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
                                            className="absolute right-0 mt-1 w-32 bg-surface rounded-xl shadow-xl border border-outline-variant/20 z-40 py-1 overflow-hidden"
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
                                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none font-medium"
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
                                    <p className="text-xs text-on-surface-variant font-medium leading-relaxed whitespace-pre-wrap break-words">
                                      <Linkify options={{ className: 'text-primary hover:underline font-bold', target: '_blank' }}>
                                        {comment.text}
                                      </Linkify>
                                    </p>
                                  )}
                                  {comment.imageUrls && comment.imageUrls.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {comment.imageUrls.map((url, idx) => (
                                        <img key={idx} src={url} alt="" className="max-w-full h-auto rounded-xl max-h-64 object-contain border border-outline-variant/10 shadow-sm" />
                                      ))}
                                    </div>
                                  ) : comment.imageUrl && (
                                    <img src={comment.imageUrl} alt="" className="max-w-full h-auto rounded-xl max-h-64 object-contain border border-outline-variant/10 shadow-sm" />
                                  )}
                                  {comment.gifUrl && (
                                    <img src={comment.gifUrl} alt="" className="max-w-full h-auto rounded-xl max-h-64 object-contain border border-outline-variant/10 shadow-sm" />
                                  )}
                                  
                                  <div className="flex items-center gap-4 mt-2">
                                    <button 
                                      onClick={() => profile && onReactComment(bug.id, comment.id, profile.uid)}
                                      className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                        profile && comment.likes?.includes(profile.uid) ? 'text-error' : 'text-outline/60 hover:text-error'
                                      }`}
                                    >
                                      <Heart size={12} fill={profile && comment.likes?.includes(profile.uid) ? 'currentColor' : 'none'} />
                                      {comment.likes?.length || 0}
                                    </button>
                                    <button 
                                      onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)}
                                      className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                        replyingToCommentId === comment.id ? 'text-primary' : 'text-outline/60 hover:text-primary'
                                      }`}
                                    >
                                      <MessageCircle size={12} />
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
                                              <span className="text-[8px] font-black text-outline/40 uppercase tracking-widest">{reply.date}</span>
                                            </div>
                                            <p className="text-xs text-on-surface-variant font-medium leading-relaxed whitespace-pre-wrap break-words">
                                              <Linkify options={{ className: 'text-primary hover:underline font-bold', target: '_blank' }}>
                                                {reply.text}
                                              </Linkify>
                                            </p>
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
                                    >
                                      <div className="w-6 h-6 rounded-lg bg-surface-container-high overflow-hidden flex-shrink-0 border border-outline-variant/10">
                                        <img 
                                          src={isCommentAnonymous ? `https://api.dicebear.com/7.x/bottts/svg?seed=new` : (profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`)} 
                                          alt="Me" 
                                          className={`w-full h-full object-cover ${isCommentAnonymous ? 'p-1' : ''} ${(!isCommentAnonymous && profile?.photoURL?.includes('pixel')) ? '[image-rendering:pixelated]' : ''}`} 
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                      <div className="flex-1 relative">
                                        <textarea
                                          autoFocus
                                          value={replyText}
                                          onChange={(e) => setReplyText(e.target.value)}
                                          placeholder="Write a reply..."
                                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-2 text-xs focus:ring-2 focus:ring-primary/20 transition-all resize-none font-medium pr-10"
                                          rows={1}
                                        />
                                        <button 
                                          onClick={() => handleReplySubmit(bug.id, comment.id)}
                                          disabled={!replyText.trim() || isUploading}
                                          className="absolute right-2 bottom-2 p-1.5 bg-primary text-white rounded-lg disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-sm shadow-primary/20"
                                        >
                                          <Send size={12} />
                                        </button>
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
                          >
                            <div className="w-8 h-8 rounded-xl bg-surface-container-high overflow-hidden flex-shrink-0 border border-outline-variant/10">
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
                                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none font-medium pr-12"
                                  rows={2}
                                />
                                <button 
                                  onClick={() => handleCommentSubmit(bug.id)}
                                  disabled={(!commentText.trim() && commentImages.length === 0 && !commentGif) || isUploading}
                                  className="absolute right-3 bottom-3 p-2 bg-primary text-white rounded-xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
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
                                        <img src={URL.createObjectURL(file)} alt="Preview" className="h-24 w-24 object-cover rounded-xl border border-outline-variant/20 shadow-sm" />
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
                                        <img src={commentGif} alt="GIF Preview" className="h-24 w-24 object-cover rounded-xl border border-outline-variant/20 shadow-sm" />
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
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border ${
                                      isCommentAnonymous ? 'bg-primary/10 border-primary/20 text-primary' : 'text-outline/60 hover:text-on-surface border-transparent hover:bg-surface-container-high'
                                    }`}
                                  >
                                    <Shield size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Anonymous</span>
                                  </button>
                                  
                                  <div className="h-4 w-[1px] bg-outline-variant/20 mx-1" />

                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    multiple
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    onChange={(e) => {
                                      if (e.target.files) {
                                        const newFiles = Array.from(e.target.files);
                                        if (commentImages.length + newFiles.length <= 3) {
                                          setCommentImages(prev => [...prev, ...newFiles]);
                                        }
                                      }
                                    }} 
                                  />
                                  <button 
                                    disabled={commentImages.length >= 3}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-outline/60 hover:text-primary p-2 rounded-xl hover:bg-primary/5 transition-all disabled:opacity-30"
                                    title="Upload Image"
                                  >
                                    <ImageIcon size={18} />
                                  </button>
                                  <button 
                                    ref={gifButtonRef}
                                    onClick={() => setShowGifPicker(!showGifPicker)}
                                    className={`p-2 rounded-xl transition-all ${showGifPicker ? 'text-primary bg-primary/5' : 'text-outline/60 hover:text-primary hover:bg-primary/5'}`}
                                    title="Add GIF"
                                  >
                                    <Smile size={18} />
                                  </button>
                                </div>
                                
                                <button 
                                  onClick={() => {
                                    setCommentingOn(null);
                                    setIsCommentAnonymous(false);
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
                                    className="absolute z-50 bottom-full mb-4 right-0 bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 w-72 h-96 flex flex-col overflow-hidden"
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
                                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
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
          className="text-center py-32 bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant/10"
        >
          <Bug className="mx-auto text-outline/20 mb-6" size={64} />
          <p className="text-on-surface-variant font-bold text-lg">No stories found for this filter.</p>
          <p className="text-outline text-sm mt-2">Try adjusting your filters or start a new story.</p>
          <button 
            onClick={onAddBug}
            className="mt-8 px-8 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20"
          >
            Start a Story
          </button>
        </motion.div>
      )}
    </div>
  );
}
