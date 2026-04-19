import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Icon } from '@iconify/react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { BugStory, Comment } from '../types';
import { useAuth } from '../AuthContext';
import { getComments, uploadImage } from '../firebase';
import { timeAgo } from '../utils/timeAgo';
import { triggerLumieBot } from '../services/lumieBot';

/**
 * Lumie Wall - social thought-feed for bug stories.
 *
 * Locked decisions (grill-me sessions 2026-04-19):
 *   - Thoughts, not tickets. No severity, no title, no structured fields.
 *   - Feed / Hot tabs only.
 *   - Pinned top composer: text + image + GIF + inline #hashtags.
 *   - Always-visible connector spine between all posts (Threads style).
 *   - Inline thread expansion. One level of replies. Always-visible reply composer.
 *   - Triage actions (edit, resolve, link, delete) in the more menu only.
 *   - Multi-image: grid-cols-2 aspect-square. Single: natural ratio max-h-72.
 *   - Hover tint on posts (no hover border).
 */

const giphyApiKey = import.meta.env.VITE_GIPHY_API_KEY;
const gf = giphyApiKey ? new GiphyFetch(giphyApiKey) : null;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function parseHashtags(text: string): { content: string; tags: string[] } {
  const tags: string[] = [];
  const content = text
    .replace(/#(\w+)/g, (_, tag) => { tags.push(tag.toLowerCase()); return ''; })
    .trim()
    .replace(/\s{2,}/g, ' ');
  return { content, tags };
}

function hotScore(bug: BugStory): number {
  const ms = bug.createdAt?.toMillis?.()
    ?? (bug.createdAt?.seconds ? bug.createdAt.seconds * 1000 : new Date(bug.date).getTime());
  const ageDays = (Date.now() - ms) / 86_400_000;
  if (ageDays > 7) return 0;
  const reactions = Object.values(bug.reactions ?? {}).reduce((a, b) => a + b, 0);
  return reactions * 2 + (bug.comments?.length ?? 0);
}

function bugTime(b: BugStory): number {
  return b.createdAt?.toMillis?.()
    ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.date).getTime());
}

// ---------------------------------------------------------------------------
// TagPills
// ---------------------------------------------------------------------------
function TagPills({ tags }: { tags: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {tags.map(tag => (
        <span
          key={tag}
          className="rounded-full border border-border/50 bg-secondary/30 px-2 py-0.5 text-[11px] text-muted-foreground"
          style={{ fontWeight: 500 }}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WallComposer
// ---------------------------------------------------------------------------
function WallComposer({
  onSubmit,
  showToast,
}: {
  onSubmit: (bug: any) => Promise<string | void>;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}) {
  const { profile } = useAuth();
  const [text, setText] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifPickerPos, setGifPickerPos] = useState({ top: 0, left: 0 });
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gifBtnRef = useRef<HTMLButtonElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);

  const positionGifPicker = () => {
    if (!gifBtnRef.current) return;
    const rect = gifBtnRef.current.getBoundingClientRect();
    const pickerWidth = 288;
    const pickerHeight = 320;
    const gutter = 12;
    const left = Math.max(gutter, Math.min(rect.left, window.innerWidth - pickerWidth - gutter));
    const preferAbove = rect.top >= pickerHeight + gutter;
    const top = preferAbove
      ? rect.top - pickerHeight - 8
      : Math.min(rect.bottom + 8, window.innerHeight - pickerHeight - gutter);
    setGifPickerPos({ top, left });
  };

  // Close GIF picker on outside click
  useEffect(() => {
    if (!showGifPicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.wall-gif-picker') || target.closest('.wall-gif-btn')) return;
      setShowGifPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showGifPicker]);

  useEffect(() => {
    if (!showGifPicker) return;
    positionGifPicker();
    const reposition = () => positionGifPicker();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [showGifPicker]);

  const canPost = (text.trim().length > 0 || imageFiles.length > 0 || !!gifUrl) && !isSubmitting;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleSubmit = async () => {
    if (!canPost) return;
    setIsSubmitting(true);
    const textSnapshot = text;
    const hadImage = imageFiles.length > 0;
    const hadGif = gifUrl;
    try {
      const { content, tags } = parseHashtags(textSnapshot);
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        try {
          const url = await uploadImage(file, 'bugs');
          if (url) uploadedUrls.push(url);
        } catch {
          showToast?.('Failed to upload image.', 'error');
        }
      }
      const bugId = await onSubmit({
        author: profile?.displayName ?? 'Anonymous',
        isAnonymous: false,
        title: content.split('\n')[0].substring(0, 50) || 'Wall post',
        impact: 'Shared Story',
        mood: 'Neutral',
        tags,
        discovery: content,
        lesson: 'Shared via Wall',
        authorId: profile?.uid ?? null,
        authorPhotoURL: profile?.photoURL ?? null,
        imageUrl: uploadedUrls[0] ?? null,
        imageUrls: uploadedUrls,
        gifUrl: hadGif ?? null,
      });
      setText('');
      setImageFiles([]);
      setGifUrl(null);
      setGifSearch('');
      setIsFocused(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      if (bugId) {
        triggerLumieBot(bugId, content, hadImage || !!hadGif);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const avatarSrc = profile?.photoURL
    ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`;

  return (
    <div className="border-b border-border pb-5 mb-1">
      <div className="flex gap-3">
        <img
          src={avatarSrc}
          alt={profile?.displayName ?? 'Me'}
          className="w-9 h-9 rounded-full shrink-0 object-cover mt-0.5"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { if (!text && !imageFiles.length && !gifUrl) setIsFocused(false); }}
            onKeyDown={handleKeyDown}
            placeholder="What's the bug story today?"
            rows={1}
            className="w-full resize-none bg-transparent border-none p-0 text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:ring-0 focus:outline-none leading-relaxed"
          />

          {/* Image previews */}
          {imageFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {imageFiles.map((file, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="h-24 rounded-[12px] border border-border/20 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Icon icon="solar:close-bold" width={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* GIF preview */}
          {gifUrl && (
            <div className="relative mt-3 inline-block group">
              <img
                src={gifUrl}
                alt="GIF"
                className="max-h-40 rounded-[12px] border border-border/20 object-cover"
              />
              <button
                type="button"
                onClick={() => setGifUrl(null)}
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Icon icon="solar:close-bold" width={10} />
              </button>
            </div>
          )}

          <AnimatePresence>
            {(isFocused || text || imageFiles.length > 0 || gifUrl) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-3 text-muted-foreground/60">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={e => {
                        if (e.target.files)
                          setImageFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="hover:text-primary transition-colors"
                      title="Add image"
                    >
                      <Icon icon="solar:gallery-bold-duotone" width={18} />
                    </button>

                    {/* GIF button */}
                    <div className="relative">
                      <button
                        ref={gifBtnRef}
                        type="button"
                        className="wall-gif-btn hover:text-primary transition-colors"
                        title="Add GIF"
                        onClick={e => {
                          e.stopPropagation();
                          if (!showGifPicker) positionGifPicker();
                          setShowGifPicker(p => !p);
                        }}
                      >
                        <Icon icon="solar:emoji-funny-square-bold-duotone" width={18} />
                      </button>

                      <AnimatePresence>
                        {showGifPicker && (
                          <motion.div
                            ref={gifPickerRef}
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            transition={{ duration: 0.14 }}
                            style={{ position: 'fixed', top: gifPickerPos.top, left: gifPickerPos.left }}
                            className="wall-gif-picker z-[200] bg-card border border-border/20 p-2 rounded-[16px] shadow-2xl w-72 h-80 overflow-y-auto flex flex-col"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex justify-between items-center mb-2 px-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">GIFs</span>
                              <button type="button" onClick={() => setShowGifPicker(false)} className="text-muted-foreground hover:text-foreground">
                                <Icon icon="solar:close-bold" width={12} />
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Search GIFs..."
                              value={gifSearch}
                              onChange={e => setGifSearch(e.target.value)}
                              className="w-full bg-secondary/20 border border-border/10 rounded-[10px] p-2 text-xs mb-2 focus:ring-1 focus:ring-primary/20 transition-all"
                            />
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                              {gf ? (
                                <Grid
                                  key={gifSearch}
                                  width={260}
                                  columns={2}
                                  fetchGifs={async (offset) => {
                                    try {
                                      return gifSearch
                                        ? await gf.search(gifSearch, { offset, limit: 10 })
                                        : await gf.trending({ offset, limit: 10 });
                                    } catch {
                                      return { data: [] } as any;
                                    }
                                  }}
                                  onGifClick={(gif, e) => {
                                    e.preventDefault();
                                    setGifUrl(gif.images.fixed_height.url);
                                    setShowGifPicker(false);
                                  }}
                                />
                              ) : (
                                <p className="text-[11px] text-muted-foreground text-center p-4">Giphy API key not configured.</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <span className="text-[11px] text-muted-foreground/40 select-none">
                      #hashtag | Ctrl+Enter post
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canPost}
                    className="rounded-full bg-foreground px-4 py-1.5 text-[13px] text-background disabled:opacity-30 transition-all hover:opacity-90 active:scale-95 flex items-center gap-1.5"
                    style={{ fontWeight: 590 }}
                  >
                    {isSubmitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    ) : 'Post'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReplyThread
// ---------------------------------------------------------------------------
function ReplyThread({
  bugId,
  onComment,
}: {
  bugId: string;
  onComment: (...args: any[]) => void;
}) {
  const { profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const unsub = getComments(bugId, setComments);
    return () => unsub?.();
  }, [bugId]);

  const handleSend = async () => {
    if (!replyText.trim() || isSending) return;
    setIsSending(true);
    try {
      onComment(
        bugId,
        replyText.trim(),
        profile?.displayName ?? 'Anonymous',
        false,
        profile?.photoURL ?? undefined,
        profile?.uid ?? undefined,
      );
      setReplyText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mt-2">
      {comments.map((c, idx) => {
        const isLast = idx === comments.length - 1;
        const avatarSrc = c.authorPhotoURL
          ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.authorId ?? c.author}`;
        return (
          <div key={c.id} className="flex gap-3 mb-3">
            <div className="flex flex-col items-center shrink-0">
              {c.isBot ? (
                <span className="w-7 h-7 rounded-[8px] bg-primary/12 flex items-center justify-center shrink-0">
                  <Icon icon="solar:magic-stick-3-bold-duotone" width={14} className="text-primary" />
                </span>
              ) : (
                <img
                  src={avatarSrc}
                  alt={c.author}
                  className="w-7 h-7 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              {!isLast && <div className="w-px flex-1 bg-border/40 mt-1 min-h-[12px]" />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] text-foreground" style={{ fontWeight: 590 }}>
                  {c.isAnonymous ? 'Anonymous' : c.author}
                </span>
                {c.isBot && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>
                    AI
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {timeAgo(c.createdAt ?? c.date)}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {c.text}
              </p>
              {(c.imageUrls?.length || c.imageUrl) && (
                <img
                  src={c.imageUrls?.[0] ?? c.imageUrl!}
                  alt="Attachment"
                  className="mt-2 max-h-40 rounded-[10px] border border-border/20 object-cover"
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Reply composer */}
      <div className="flex gap-3 mt-2">
        <img
          src={profile?.photoURL ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`}
          alt="Me"
          className="w-7 h-7 rounded-full shrink-0 object-cover mt-0.5"
          referrerPolicy="no-referrer"
        />
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border/50 bg-secondary/20 px-3 py-1.5 focus-within:border-primary/30 focus-within:bg-card transition-all">
          <textarea
            ref={textareaRef}
            value={replyText}
            onChange={e => {
              setReplyText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Add to the thread…"
            rows={1}
            className="flex-1 resize-none bg-transparent border-none p-0 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:ring-0 focus:outline-none leading-relaxed"
          />
          <AnimatePresence>
            {replyText.trim() && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.12 }}
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40 transition-all"
              >
                {isSending
                  ? <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <Icon icon="solar:arrow-up-bold" width={12} />
                }
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// More menu (··· triage actions)
// ---------------------------------------------------------------------------
function MoreMenu({
  isOwner,
  onEdit,
  onDelete,
}: {
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/50 hover:bg-secondary/40 hover:text-foreground transition-colors"
        aria-label="More options"
      >
        <Icon icon="solar:menu-dots-bold" width={14} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-8 z-20 min-w-[160px] overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_4px_20px_rgba(26,23,20,0.12)]"
          >
            {isOwner && (
              <button
                type="button"
                onClick={() => { onEdit(); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-foreground hover:bg-secondary/30 transition-colors"
              >
                <Icon icon="solar:pen-linear" width={13} className="text-muted-foreground" />
                Edit post
              </button>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-foreground hover:bg-secondary/30 transition-colors"
            >
              <Icon icon="solar:check-circle-linear" width={13} className="text-muted-foreground" />
              Mark resolved
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-foreground hover:bg-secondary/30 transition-colors"
            >
              <Icon icon="solar:link-linear" width={13} className="text-muted-foreground" />
              Link regression
            </button>
            {isOwner && (
              <>
                <div className="mx-3 border-t border-border/50" />
                <button
                  type="button"
                  onClick={() => { onDelete(); setOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-destructive hover:bg-secondary/30 transition-colors"
                >
                  <Icon icon="solar:trash-bin-trash-linear" width={13} />
                  Delete
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WallPost
// ---------------------------------------------------------------------------
function WallPost({
  bug,
  isExpanded,
  isLast,
  onToggle,
  onReact,
  onComment,
  onEdit,
  onDelete,
}: {
  bug: BugStory;
  isExpanded: boolean;
  isLast: boolean;
  onToggle: () => void;
  onReact: (bugId: string, emoji: string, currentUserName?: string) => void;
  onComment: (...args: any[]) => void;
  onEdit: (bug: BugStory) => void;
  onDelete: (bugId: string) => void;
}) {
  const { profile } = useAuth();
  const reduce = useReducedMotion();
  const isOwner = profile?.uid === bug.authorId;
  const heartCount = bug.reactions?.['❤️'] ?? 0;
  const commentCount = bug.comments?.length ?? 0;
  const hasLiked = profile?.uid ? (bug.reactedBy?.['❤️'] ?? []).includes(profile.uid) : false;

  const avatarSrc = bug.isAnonymous
    ? `https://api.dicebear.com/7.x/bottts/svg?seed=anon`
    : (bug.authorPhotoURL ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${bug.authorId ?? bug.author}`);

  const images = bug.imageUrls?.length
    ? bug.imageUrls
    : bug.imageUrl ? [bug.imageUrl] : [];

  return (
    <div className="border-b border-border/50 last:border-0 hover:bg-[var(--surface-low)]/60 transition-colors rounded-sm">
      {/* Main row: avatar spine + content */}
      <div className="flex gap-3 pt-4 px-1">

        {/* Avatar + always-visible connector spine */}
        <div className="flex shrink-0 flex-col items-center">
          <img
            src={avatarSrc}
            alt={bug.isAnonymous ? 'Anonymous' : bug.author}
            className="h-9 w-9 rounded-full object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
          {!isLast && (
            <div className="mt-2 w-px flex-1 min-h-[20px] bg-border/40" />
          )}
        </div>

        {/* Content column — includes inline thread so connector spans full height */}
        <div className="flex-1 min-w-0 pb-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
              <span className="text-[14px] text-foreground" style={{ fontWeight: 590 }}>
                {bug.isAnonymous ? 'Anonymous' : bug.author}
              </span>
              <span className="text-[12px] text-muted-foreground shrink-0">
                {timeAgo(bug.createdAt ?? bug.date)}
              </span>
            </div>
            <MoreMenu
              isOwner={isOwner}
              onEdit={() => onEdit(bug)}
              onDelete={() => onDelete(bug.id)}
            />
          </div>

          {/* Tags */}
          <TagPills tags={bug.tags ?? []} />

          {/* Thought text */}
          {bug.discovery && (
            <p className="mt-2 text-[15px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
              {bug.discovery}
            </p>
          )}

          {/* Images — grid for multiple, natural ratio for single */}
          {images.length === 1 && (
            <img
              src={images[0]}
              alt="Attachment"
              className="mt-3 max-h-72 w-full rounded-[12px] border border-border/20 object-cover"
            />
          )}
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {images.map((url, i) => (
                <div key={i} className="aspect-square rounded-[12px] overflow-hidden border border-border/20">
                  <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
          {bug.gifUrl && (
            <img
              src={bug.gifUrl}
              alt="GIF"
              className="mt-3 max-h-48 rounded-[12px] border border-border/20 object-cover"
            />
          )}

          {/* Reaction row */}
          <div className="mt-3 flex items-center gap-5 text-muted-foreground/60">
            <button
              type="button"
              onClick={() => onReact(bug.id, '❤️', profile?.displayName)}
              className={`group flex items-center gap-1.5 text-[13px] transition-colors hover:text-destructive ${hasLiked ? 'text-destructive' : ''}`}
            >
              <Icon
                icon={hasLiked ? 'solar:heart-bold' : 'solar:heart-linear'}
                width={16}
                className="transition-transform group-hover:scale-110"
              />
              {heartCount > 0 && <span>{heartCount}</span>}
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="flex items-center gap-1.5 text-[13px] transition-colors hover:text-primary"
            >
              <Icon icon="solar:chat-round-dots-linear" width={16} />
              {commentCount > 0 && <span>{commentCount}</span>}
            </button>
          </div>

          {/* Inline thread — inside content column so connector spans it */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                className="overflow-hidden"
              >
                <ReplyThread bugId={bug.id} onComment={onComment} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WallScreen
// ---------------------------------------------------------------------------
type TabKey = 'feed' | 'hot';

interface WallScreenProps {
  bugs: BugStory[];
  onReact: (bugId: string, emoji: string, currentUserName?: string) => void;
  onComment: (
    bugId: string,
    text: string,
    author: string,
    isAnonymous: boolean,
    authorPhotoURL?: string,
    authorId?: string,
    imageUrl?: string,
    gifUrl?: string,
    imageUrls?: string[]
  ) => void;
  onReactComment: (bugId: string, commentId: string, currentUserId: string) => void;
  onReplyComment: (bugId: string, commentId: string, reply: any) => void;
  onDeleteBug: (bugId: string) => void;
  onEditBug: (bug: BugStory) => void;
  onAddBugSubmit: (bug: any) => Promise<string | void>;
  onDeleteComment?: (bugId: string, commentId: string) => void;
  onEditComment?: (bugId: string, commentId: string, text: string) => void;
  searchQuery: string;
  selectedItemId: string | null;
  onClearSelection: () => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

export function WallScreen({
  bugs,
  onReact,
  onComment,
  onDeleteBug,
  onEditBug,
  onAddBugSubmit,
  searchQuery,
  selectedItemId,
  onClearSelection,
  showToast,
}: WallScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('feed');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (selectedItemId) setExpandedId(selectedItemId);
  }, [selectedItemId]);

  const displayedBugs = useMemo(() => {
    let list = [...bugs];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b =>
        b.discovery?.toLowerCase().includes(q) ||
        b.tags?.some(t => t.toLowerCase().includes(q)) ||
        b.author?.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'hot') {
      return list.filter(b => hotScore(b) > 0).sort((a, b) => hotScore(b) - hotScore(a));
    }
    return list.sort((a, b) => bugTime(b) - bugTime(a));
  }, [bugs, searchQuery, activeTab]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'feed', label: 'Feed' },
    { key: 'hot', label: 'Hot' },
  ];

  return (
    <div className="max-w-[640px] mx-auto">
      {/* Tabs */}
      <div className="mb-5 flex items-center gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-[8px] px-3 py-1.5 text-[13px] transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--surface-low)] text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-[var(--surface-low)]/70'
            }`}
            style={{ fontWeight: activeTab === tab.key ? 590 : 400 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pinned composer */}
      <WallComposer onSubmit={onAddBugSubmit} showToast={showToast} />

      {/* Feed */}
      {displayedBugs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-serif italic text-[22px] text-foreground/80">
            {searchQuery
              ? 'Nothing matched.'
              : activeTab === 'hot'
              ? 'Nothing hot yet.'
              : 'The wall is quiet.'}
          </p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {searchQuery
              ? 'Try different keywords or a #tag.'
              : 'Post the first thought to start the conversation.'}
          </p>
        </div>
      ) : (
        <div>
          {displayedBugs.map((bug, i) => (
            <motion.div
              key={bug.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.035, 0.18) }}
            >
              <WallPost
                bug={bug}
                isExpanded={expandedId === bug.id}
                isLast={i === displayedBugs.length - 1}
                onToggle={() => {
                  const closing = expandedId === bug.id;
                  setExpandedId(closing ? null : bug.id);
                  if (closing) onClearSelection();
                }}
                onReact={onReact}
                onComment={onComment}
                onEdit={onEditBug}
                onDelete={onDeleteBug}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

