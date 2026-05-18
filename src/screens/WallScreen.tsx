import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Icon } from '@iconify/react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { BugStory, Comment } from '../types';
import { useAuth } from '../AuthContext';
import { uploadImage } from '../firebase';
import { timeAgo } from '../utils/timeAgo';
import { triggerLumieBot } from '../services/lumieBot';
import { e2ePresetGifs, isE2EMode } from '../e2e';

const giphyApiKey = import.meta.env.VITE_GIPHY_API_KEY;
const gf = giphyApiKey ? new GiphyFetch(giphyApiKey) : null;
const E2E_MODE = isE2EMode();

function parseHashtags(text: string): { content: string; tags: string[] } {
  const tags: string[] = [];
  const content = text
    .replace(/#(\w+)/g, (_, tag) => {
      tags.push(tag.toLowerCase());
      return '';
    })
    .trim()
    .replace(/\s{2,}/g, ' ');
  return { content, tags };
}

function hotScore(bug: BugStory): number {
  const ms = typeof bug.createdAt === 'string'
    ? new Date(bug.createdAt).getTime()
    : bug.createdAt?.toMillis?.()
      ?? (bug.createdAt?.seconds ? bug.createdAt.seconds * 1000 : new Date(bug.date).getTime());
  const ageDays = (Date.now() - ms) / 86_400_000;
  if (ageDays > 7) return 0;
  const reactions = Object.values(bug.reactions ?? {}).reduce((a, b) => a + b, 0);
  return reactions * 2 + (bug.comments?.length ?? 0);
}

function bugTime(b: BugStory): number {
  if (typeof b.createdAt === 'string') return new Date(b.createdAt).getTime();
  return b.createdAt?.toMillis?.()
    ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.date).getTime());
}

function commentTime(comment: Comment): number {
  if (!comment.createdAt && !comment.date) return 0;
  return new Date(comment.createdAt ?? comment.date).getTime() || 0;
}

function buildPreviewUrls(files: File[]) {
  return files.map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
}

function TagPills({ tags }: { tags: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
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

function reviewStatusForBug(bug: BugStory): 'pending' | 'review_required' | 'reviewed' {
  return bug.triage?.review_status ?? (bug.triage?.needs_human_review ? 'review_required' : 'pending');
}

function reviewEventLabel(status: 'review_required' | 'reviewed') {
  return status === 'reviewed' ? 'Review completed' : 'Marked for review';
}

function MediaGallery({
  imageUrls,
  imageUrl,
  gifUrl,
  maxHeightClass = 'max-h-72',
}: {
  imageUrls?: string[] | null;
  imageUrl?: string | null;
  gifUrl?: string | null;
  maxHeightClass?: string;
}) {
  const images = imageUrls?.length ? imageUrls : imageUrl ? [imageUrl] : [];

  return (
    <>
      {images.length === 1 && (
        <img
          src={images[0]}
          alt="Attachment"
          className={`mt-3 w-full rounded-[12px] border border-border/20 object-cover ${maxHeightClass}`}
        />
      )}
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {images.map((url, index) => (
            <div key={index} className="aspect-square overflow-hidden rounded-[12px] border border-border/20">
              <img src={url} alt="Attachment" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
      {gifUrl && (
        <img
          src={gifUrl}
          alt="GIF"
          className={`mt-3 rounded-[12px] border border-border/20 object-cover ${maxHeightClass.replace('72', '48')}`}
        />
      )}
    </>
  );
}

function GifPicker({
  anchorRef,
  isOpen,
  search,
  onSearchChange,
  onSelect,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const reposition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const pickerWidth = 288;
      const pickerHeight = 320;
      const gutter = 12;
      const left = Math.max(gutter, Math.min(rect.left, window.innerWidth - pickerWidth - gutter));
      const preferAbove = rect.top >= pickerHeight + gutter;
      const top = preferAbove
        ? rect.top - pickerHeight - 8
        : Math.min(rect.bottom + 8, window.innerHeight - pickerHeight - gutter);
      setPosition({ top, left });
    };

    reposition();
    const handleDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.wall-gif-picker') || target.closest('.wall-gif-trigger')) return;
      onClose();
    };

    document.addEventListener('mousedown', handleDown);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    return () => {
      document.removeEventListener('mousedown', handleDown);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [anchorRef, isOpen, onClose]);

  if (!isOpen) return null;

  const usePresetGrid = E2E_MODE || !gf;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.14 }}
        style={{ position: 'fixed', top: position.top, left: position.left }}
        className="wall-gif-picker z-[200] flex h-80 w-72 flex-col overflow-y-auto rounded-[16px] border border-border/20 bg-card p-2 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">GIFs</span>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon icon="solar:close-circle-bold" width={12} />
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          placeholder={usePresetGrid ? 'Search preset GIF labels...' : 'Search GIFs...'}
          className="mb-2 w-full rounded-[10px] border border-border/10 bg-secondary/20 p-2 text-xs transition-all focus:ring-1 focus:ring-primary/20"
        />

        <div className="custom-scrollbar flex-1 overflow-y-auto">
          {usePresetGrid ? (
            <div className="grid grid-cols-2 gap-2 p-1">
              {e2ePresetGifs
                .filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
                .map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item.url);
                      onClose();
                    }}
                    className="overflow-hidden rounded-[12px] border border-border/20 bg-secondary/20 text-left transition-colors hover:border-primary/30 hover:bg-secondary/40"
                  >
                    <img src={item.url} alt={item.label} className="h-20 w-full object-cover" />
                    <span className="block px-2 py-1.5 text-[11px] text-foreground">{item.label}</span>
                  </button>
                ))}
            </div>
          ) : (
            <Grid
              key={search}
              width={260}
              columns={2}
              fetchGifs={async offset => {
                try {
                  return search
                    ? await gf.search(search, { offset, limit: 10 })
                    : await gf.trending({ offset, limit: 10 });
                } catch {
                  return { data: [] } as never;
                }
              }}
              onGifClick={(gif, event) => {
                event.preventDefault();
                onSelect(gif.images.fixed_height.url);
                onClose();
              }}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ComposerMediaPreview({
  files,
  gifUrl,
  onRemoveFile,
  onRemoveGif,
}: {
  files: File[];
  gifUrl: string | null;
  onRemoveFile: (index: number) => void;
  onRemoveGif: () => void;
}) {
  const previews = useMemo(() => buildPreviewUrls(files), [files]);

  useEffect(() => () => {
    previews.forEach(item => URL.revokeObjectURL(item.previewUrl));
  }, [previews]);

  return (
    <>
      {previews.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {previews.map(({ file, previewUrl }, index) => (
            <div key={`${file.name}-${index}`} className="group relative">
              <img src={previewUrl} alt="Preview" className="h-24 rounded-[12px] border border-border/20 object-cover" />
              <button
                type="button"
                onClick={() => onRemoveFile(index)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Icon icon="solar:close-circle-bold" width={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {gifUrl && (
        <div className="group relative mt-3 inline-block">
          <img src={gifUrl} alt="GIF" className="max-h-40 rounded-[12px] border border-border/20 object-cover" />
          <button
            type="button"
            onClick={onRemoveGif}
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Icon icon="solar:close-circle-bold" width={10} />
          </button>
        </div>
      )}
    </>
  );
}

function ThreadComposer({
  placeholder,
  submitLabel,
  submitTestId,
  onSubmit,
  showToast,
}: {
  placeholder: string;
  submitLabel: string;
  submitTestId?: string;
  onSubmit: (payload: { text: string; files: File[]; gifUrl: string | null }) => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifButtonRef = useRef<HTMLButtonElement>(null);

  const canSubmit = (text.trim().length > 0 || files.length > 0 || !!gifUrl) && !isSubmitting;

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ text, files, gifUrl });
      setText('');
      setFiles([]);
      setGifUrl(null);
      setGifSearch('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch {
      showToast?.(`Failed to ${submitLabel.toLowerCase()}.`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-2 rounded-[18px] border border-border/60 bg-[color:var(--frame)] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all focus-within:border-primary/30 focus-within:bg-card">
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        placeholder={placeholder}
        onChange={event => {
          setText(event.target.value);
          event.target.style.height = 'auto';
          event.target.style.height = `${Math.min(event.target.scrollHeight, 84)}px`;
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
        className="w-full resize-none bg-transparent border-none p-0 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
      />

      <ComposerMediaPreview
        files={files}
        gifUrl={gifUrl}
        onRemoveFile={index => setFiles(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
        onRemoveGif={() => setGifUrl(null)}
      />

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
        <div className="flex items-center gap-2 text-muted-foreground/65">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={event => {
              if (event.target.files) {
                setFiles(prev => [...prev, ...Array.from(event.target.files ?? [])]);
              }
            }}
          />
          <button type="button" aria-label="Add image" onClick={() => fileInputRef.current?.click()} className="rounded-full p-1.5 transition-colors hover:bg-secondary/50 hover:text-primary" title="Add image">
            <Icon icon="solar:gallery-bold-duotone" width={17} />
          </button>
          <button
            ref={gifButtonRef}
            type="button"
            aria-label="Add GIF"
            className="wall-gif-trigger rounded-full p-1.5 transition-colors hover:bg-secondary/50 hover:text-primary"
            title="Add GIF"
            onClick={event => {
              event.stopPropagation();
              setShowGifPicker(prev => !prev);
            }}
          >
            <Icon icon="solar:emoji-funny-square-bold-duotone" width={17} />
          </button>
          <span className="select-none text-[11px] text-muted-foreground/45">Shift+Enter for a new line</span>
        </div>

        <button
          type="button"
          data-testid={submitTestId}
          onClick={() => void submit()}
          disabled={!canSubmit}
          className="shell-action-primary px-3.5 py-1.5 text-[12px] disabled:translate-y-0 disabled:opacity-35"
          style={{ fontWeight: 590 }}
        >
          {isSubmitting ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            submitLabel
          )}
        </button>
      </div>

      <GifPicker
        anchorRef={gifButtonRef}
        isOpen={showGifPicker}
        search={gifSearch}
        onSearchChange={setGifSearch}
        onSelect={setGifUrl}
        onClose={() => setShowGifPicker(false)}
      />
    </div>
  );
}

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
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gifBtnRef = useRef<HTMLButtonElement>(null);

  const canPost = (text.trim().length > 0 || imageFiles.length > 0 || !!gifUrl) && !isSubmitting;

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
        showToast?.('Wall post published.', 'success');
        void triggerLumieBot(bugId, content, hadImage || !!hadGif);
      }
    } catch {
      showToast?.('Failed to post bug story. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-panel mb-2 overflow-hidden px-4 py-4 md:px-5" data-testid="wall-composer">
      <div className="flex gap-3">
        <img
          src={profile?.photoURL ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`}
          alt={profile?.displayName ?? 'Me'}
          className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0 flex-1">
          <p className="page-kicker mb-2">Wall composer</p>
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            placeholder="What's the bug story today?"
            onChange={event => {
              setText(event.target.value);
              event.target.style.height = 'auto';
              event.target.style.height = `${event.target.scrollHeight}px`;
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              if (!text && !imageFiles.length && !gifUrl) setIsFocused(false);
            }}
            onKeyDown={event => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            className="w-full resize-none border-none bg-transparent p-0 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
          />

          <ComposerMediaPreview
            files={imageFiles}
            gifUrl={gifUrl}
            onRemoveFile={index => setImageFiles(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
            onRemoveGif={() => setGifUrl(null)}
          />

          <AnimatePresence>
            {(isFocused || text || imageFiles.length > 0 || gifUrl) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                  <div className="flex items-center gap-3 text-muted-foreground/60">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={event => {
                        if (event.target.files) {
                          setImageFiles(prev => [...prev, ...Array.from(event.target.files ?? [])]);
                        }
                      }}
                    />
                    <button type="button" aria-label="Add image" onClick={() => fileInputRef.current?.click()} className="rounded-full p-1.5 transition-colors hover:bg-secondary/50 hover:text-primary" title="Add image">
                      <Icon icon="solar:gallery-bold-duotone" width={18} />
                    </button>
                    <button
                      ref={gifBtnRef}
                      type="button"
                      data-testid="wall-post-gif-trigger"
                      aria-label="Add GIF"
                      className="wall-gif-trigger rounded-full p-1.5 transition-colors hover:bg-secondary/50 hover:text-primary"
                      title="Add GIF"
                      onClick={event => {
                        event.stopPropagation();
                        setShowGifPicker(prev => !prev);
                      }}
                    >
                      <Icon icon="solar:emoji-funny-square-bold-duotone" width={18} />
                    </button>
                    <span className="select-none text-[11px] text-muted-foreground/40">#hashtag | Ctrl+Enter post</span>
                  </div>

                  <button
                    type="button"
                    data-testid="wall-post-submit"
                    onClick={() => void handleSubmit()}
                    disabled={!canPost}
                    className="shell-action-primary px-4 py-2 text-[13px] disabled:translate-y-0 disabled:opacity-30"
                    style={{ fontWeight: 590 }}
                  >
                    {isSubmitting ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                    ) : (
                      'Post'
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <GifPicker
        anchorRef={gifBtnRef}
        isOpen={showGifPicker}
        search={gifSearch}
        onSearchChange={setGifSearch}
        onSelect={setGifUrl}
        onClose={() => setShowGifPicker(false)}
      />
    </div>
  );
}

const ThreadComment: React.FC<{
  bugId: string;
  comment: Comment;
  isLast: boolean;
  isReplying: boolean;
  onStartReply: () => void;
  onReactComment: (bugId: string, commentId: string, currentUserId: string) => void;
  onReply: (commentId: string, payload: { text: string; files: File[]; gifUrl: string | null }) => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}> = ({
  bugId,
  comment,
  isLast,
  isReplying,
  onStartReply,
  onReactComment,
  onReply,
  showToast,
}) => {
  const { profile } = useAuth();
  const likes = comment.likes ?? [];
  const hasLiked = profile?.uid ? likes.includes(profile.uid) : false;
  const avatarSrc = comment.authorPhotoURL
    ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.authorId ?? comment.author}`;

  return (
    <div className="mb-3 flex gap-3" data-testid={`wall-comment-${comment.id}`}>
      <div className="flex shrink-0 flex-col items-center">
        {comment.isBot ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary/12">
            <Icon icon="solar:magic-stick-3-bold-duotone" width={14} className="text-primary" />
          </span>
        ) : (
          <img src={avatarSrc} alt={comment.author} className="h-7 w-7 rounded-full object-cover" referrerPolicy="no-referrer" />
        )}
        {!isLast && <div className="mt-1 min-h-[12px] w-px flex-1 bg-border/40" />}
      </div>

      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-foreground" style={{ fontWeight: 590 }}>
            {comment.isAnonymous ? 'Anonymous' : comment.author}
          </span>
          {comment.isBot && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>
              AI
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">{timeAgo(comment.createdAt ?? comment.date)}</span>
        </div>

        <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">{comment.text}</p>
        <MediaGallery imageUrls={comment.imageUrls} imageUrl={comment.imageUrl} gifUrl={comment.gifUrl} maxHeightClass="max-h-40" />

        <div className="mt-2 flex items-center gap-4 text-[12px] text-muted-foreground/65">
          <button
            type="button"
            onClick={() => profile?.uid && onReactComment(bugId, comment.id, profile.uid)}
            className={`flex items-center gap-1 transition-colors hover:text-destructive ${hasLiked ? 'text-destructive' : ''}`}
          >
            <Icon icon={hasLiked ? 'solar:heart-bold' : 'solar:heart-linear'} width={14} />
            {likes.length > 0 && <span>{likes.length}</span>}
          </button>
          <button type="button" onClick={onStartReply} className="transition-colors hover:text-primary">
            Reply
          </button>
        </div>

        {(comment.replies?.length ?? 0) > 0 && (
          <div className="mt-3 space-y-3 border-l border-border/40 pl-4">
            {(comment.replies ?? [])
              .slice()
              .sort((a, b) => commentTime(a) - commentTime(b))
              .map(reply => (
                <div key={reply.id} className="flex gap-3" data-testid={`wall-reply-${reply.id}`}>
                  <img
                    src={reply.authorPhotoURL ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.authorId ?? reply.author}`}
                    alt={reply.author}
                    className="mt-0.5 h-6 w-6 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] text-foreground" style={{ fontWeight: 590 }}>
                        {reply.isAnonymous ? 'Anonymous' : reply.author}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(reply.createdAt ?? reply.date)}</span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/85">{reply.text}</p>
                    <MediaGallery imageUrls={reply.imageUrls} imageUrl={reply.imageUrl} gifUrl={reply.gifUrl} maxHeightClass="max-h-32" />
                  </div>
                </div>
              ))}
          </div>
        )}

        <AnimatePresence>
          {isReplying && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <ThreadComposer
                placeholder="Write a reply..."
                submitLabel="Reply"
                submitTestId={`reply-submit-${comment.id}`}
                onSubmit={payload => onReply(comment.id, payload)}
                showToast={showToast}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ReplyThread({
  bug,
  onComment,
  onReplyComment,
  onReactComment,
  showToast,
}: {
  bug: BugStory;
  onComment: (...args: any[]) => void;
  onReplyComment: (bugId: string, commentId: string, reply: any) => void;
  onReactComment: (bugId: string, commentId: string, currentUserId: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}) {
  const { profile } = useAuth();
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);

  const sortedComments = useMemo(
    () => [...(bug.comments ?? [])].sort((a, b) => commentTime(a) - commentTime(b)),
    [bug.comments]
  );

  const createUploads = async (files: File[], folder: 'comments' | 'replies') => {
    const imageUrls: string[] = [];
    for (const file of files) {
      const url = await uploadImage(file, folder);
      if (url) imageUrls.push(url);
    }
    return imageUrls;
  };

  const submitComment = async ({ text, files, gifUrl }: { text: string; files: File[]; gifUrl: string | null }) => {
    try {
      const imageUrls = await createUploads(files, 'comments');
      await onComment(
        bug.id,
        text.trim(),
        profile?.displayName ?? 'Anonymous',
        false,
        profile?.photoURL ?? undefined,
        profile?.uid ?? undefined,
        imageUrls[0] ?? undefined,
        gifUrl ?? undefined,
        imageUrls
      );
      showToast?.('Comment posted successfully!', 'success');
    } catch {
      showToast?.('Failed to post comment.', 'error');
      throw new Error('comment-submit-failed');
    }
  };

  const submitReply = async (commentId: string, { text, files, gifUrl }: { text: string; files: File[]; gifUrl: string | null }) => {
    try {
      const imageUrls = await createUploads(files, 'replies');
      await onReplyComment(bug.id, commentId, {
        text: text.trim(),
        author: profile?.displayName ?? 'Anonymous',
        authorId: profile?.uid ?? null,
        authorPhotoURL: profile?.photoURL ?? null,
        date: 'Just now',
        isAnonymous: false,
        imageUrl: imageUrls[0] ?? null,
        imageUrls,
        gifUrl: gifUrl ?? null,
      });
      setReplyingToCommentId(null);
      showToast?.('Reply posted successfully!', 'success');
    } catch {
      showToast?.('Failed to post reply.', 'error');
      throw new Error('reply-submit-failed');
    }
  };

  return (
    <div className="mt-3" data-testid={`wall-thread-${bug.id}`}>
      {sortedComments.map((comment, index) => (
        <ThreadComment
          key={comment.id}
          bugId={bug.id}
          comment={comment}
          isLast={index === sortedComments.length - 1}
          isReplying={replyingToCommentId === comment.id}
          onStartReply={() => setReplyingToCommentId(prev => prev === comment.id ? null : comment.id)}
          onReactComment={onReactComment}
          onReply={submitReply}
          showToast={showToast}
        />
      ))}

      <div className="mt-2 flex gap-3">
        <img
          src={profile?.photoURL ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`}
          alt="Me"
          className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1">
          <ThreadComposer
            placeholder="Add to the thread..."
            submitLabel="Comment"
            submitTestId={`comment-submit-${bug.id}`}
            onSubmit={submitComment}
            showToast={showToast}
          />
        </div>
      </div>
    </div>
  );
}

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
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:bg-secondary/40 hover:text-foreground"
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
                onClick={() => {
                  onEdit();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-foreground transition-colors hover:bg-secondary/30"
              >
                <Icon icon="solar:pen-linear" width={13} className="text-muted-foreground" />
                Edit post
              </button>
            )}
            <button type="button" className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-foreground transition-colors hover:bg-secondary/30">
              <Icon icon="solar:check-circle-linear" width={13} className="text-muted-foreground" />
              Mark resolved
            </button>
            <button type="button" className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-foreground transition-colors hover:bg-secondary/30">
              <Icon icon="solar:link-linear" width={13} className="text-muted-foreground" />
              Link regression
            </button>
            {isOwner && (
              <>
                <div className="mx-3 border-t border-border/50" />
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-destructive transition-colors hover:bg-secondary/30"
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

function WallPost({
  bug,
  isExpanded,
  isLast,
  onToggle,
  onReact,
  onComment,
  onReplyComment,
  onReactComment,
  onEdit,
  onDelete,
  onMarkForReview,
  onMarkReviewed,
  showToast,
}: {
  bug: BugStory;
  isExpanded: boolean;
  isLast: boolean;
  onToggle: () => void;
  onReact: (bugId: string, emoji: string, currentUserName?: string) => void;
  onComment: (...args: any[]) => void;
  onReplyComment: (bugId: string, commentId: string, reply: any) => void;
  onReactComment: (bugId: string, commentId: string, currentUserId: string) => void;
  onEdit: (bug: BugStory) => void;
  onDelete: (bugId: string) => void;
  onMarkForReview: (bugId: string) => void;
  onMarkReviewed: (bugId: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}) {
  const { profile } = useAuth();
  const reduce = useReducedMotion();
  const isOwner = profile?.uid === bug.authorId;
  const heartCount = bug.reactions?.['❤️'] ?? 0;
  const commentCount = bug.comments?.length ?? 0;
  const hasLiked = profile?.uid ? (bug.reactedBy?.['❤️'] ?? []).includes(profile.uid) : false;
  const avatarSrc = bug.isAnonymous
    ? 'https://api.dicebear.com/7.x/bottts/svg?seed=anon'
    : (bug.authorPhotoURL ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${bug.authorId ?? bug.author}`);
  const triageStatus = reviewStatusForBug(bug);

  return (
    <div className="rounded-sm border-b border-border/50 transition-colors hover:bg-[var(--surface-low)]/60" data-testid={`wall-post-${bug.id}`}>
      <div className="flex gap-3 px-1 pt-4">
        <div className="flex shrink-0 flex-col items-center">
          <img src={avatarSrc} alt={bug.isAnonymous ? 'Anonymous' : bug.author} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
          {!isLast && <div className="mt-2 min-h-[20px] w-px flex-1 bg-border/40" />}
        </div>

        <div className="min-w-0 flex-1 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex flex-wrap items-baseline gap-2">
              <span className="text-[14px] text-foreground" style={{ fontWeight: 590 }}>
                {bug.isAnonymous ? 'Anonymous' : bug.author}
              </span>
              <span className="shrink-0 text-[12px] text-muted-foreground">{timeAgo(bug.createdAt ?? bug.date)}</span>
            </div>
            <MoreMenu isOwner={isOwner} onEdit={() => onEdit(bug)} onDelete={() => onDelete(bug.id)} />
          </div>

          <TagPills tags={bug.tags ?? []} />
          {bug.discovery && (
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">{bug.discovery}</p>
          )}
          {bug.triage && (
            <div
              className={`mt-3 rounded-[14px] px-3 py-3 ${
                triageStatus === 'review_required'
                  ? 'border border-amber-500/20 bg-amber-500/8'
                  : triageStatus === 'reviewed'
                    ? 'border border-emerald-500/18 bg-emerald-500/7'
                    : 'border border-primary/12 bg-primary/5'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                  <Icon icon="solar:danger-triangle-linear" width={13} />
                  AI triage
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                    triageStatus === 'review_required'
                      ? 'bg-amber-500/12 text-amber-700'
                      : triageStatus === 'reviewed'
                        ? 'bg-emerald-500/12 text-emerald-700'
                        : 'bg-white/80 text-foreground/80'
                  }`}
                >
                  {triageStatus === 'review_required'
                    ? 'Review required'
                    : triageStatus === 'reviewed'
                      ? 'Reviewed'
                      : 'Pending review'}
                </span>
                <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-foreground/80">
                  {bug.triage.category.replace('_', ' ')}
                </span>
                <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-foreground/80">
                  {bug.triage.severity}
                </span>
                <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-foreground/80">
                  {bug.triage.confidence}% confidence
                </span>
              </div>

              {triageStatus === 'review_required' && (
                <p className="mt-2 rounded-[10px] bg-white/60 px-2.5 py-2 text-[12px] leading-relaxed text-amber-900/90">
                  This item should be checked by a person before the triage result is treated as final.
                </p>
              )}

              <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
                <span className="font-semibold text-foreground">Summary:</span> {bug.triage.summary}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground/90">
                <span className="font-semibold text-foreground">Next step:</span> {bug.triage.suggested_next_step}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                {bug.triage.reasoning_short}
              </p>
              {bug.triage.review_note && (
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {bug.triage.review_note}
                </p>
              )}
              {bug.triage.review_history && bug.triage.review_history.length > 0 && (
                <div className="mt-3 rounded-[12px] border border-border/50 bg-white/55 px-2.5 py-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Review history</p>
                  <div className="mt-2 space-y-1.5">
                    {[...bug.triage.review_history].slice(-3).reverse().map((event, index) => (
                      <div key={`${event.timestamp}-${index}`} className="rounded-[10px] bg-white/70 px-2 py-1.5">
                        <p className="text-[12px] text-foreground" style={{ fontWeight: 600 }}>
                          {reviewEventLabel(event.status)}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{event.note}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                          {timeAgo(event.timestamp)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {triageStatus !== 'review_required' && (
                  <button
                    type="button"
                    onClick={() => onMarkForReview(bug.id)}
                    className="rounded-full border border-amber-500/20 bg-white/80 px-3 py-1.5 text-[12px] text-amber-800 transition-colors hover:bg-amber-50"
                  >
                    Mark for human review
                  </button>
                )}
                {triageStatus === 'review_required' && (
                  <button
                    type="button"
                    onClick={() => onMarkReviewed(bug.id)}
                    className="rounded-full border border-emerald-500/20 bg-white/80 px-3 py-1.5 text-[12px] text-emerald-800 transition-colors hover:bg-emerald-50"
                  >
                    Mark review complete
                  </button>
                )}
              </div>
            </div>
          )}
          <MediaGallery imageUrls={bug.imageUrls} imageUrl={bug.imageUrl} gifUrl={bug.gifUrl} />

          <div className="mt-3 flex items-center gap-5 text-muted-foreground/60">
            <button
              type="button"
              onClick={() => onReact(bug.id, '❤️', profile?.displayName)}
              className={`group flex items-center gap-1.5 text-[13px] transition-colors hover:text-destructive ${hasLiked ? 'text-destructive' : ''}`}
            >
              <Icon icon={hasLiked ? 'solar:heart-bold' : 'solar:heart-linear'} width={16} className="transition-transform group-hover:scale-110" />
              {heartCount > 0 && <span>{heartCount}</span>}
            </button>
            <button type="button" data-testid={`toggle-thread-${bug.id}`} onClick={onToggle} className="flex items-center gap-1.5 text-[13px] transition-colors hover:text-primary">
              <Icon icon="solar:chat-round-dots-linear" width={16} />
              {commentCount > 0 && <span>{commentCount}</span>}
            </button>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                className="overflow-hidden"
              >
                <ReplyThread
                  bug={bug}
                  onComment={onComment}
                  onReplyComment={onReplyComment}
                  onReactComment={onReactComment}
                  showToast={showToast}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

type TabKey = 'feed' | 'hot' | 'review';

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
  onMarkBugForReview: (bugId: string) => void;
  onMarkBugReviewed: (bugId: string) => void;
  searchQuery: string;
  selectedItemId: string | null;
  onClearSelection: () => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

export function WallScreen({
  bugs,
  onReact,
  onComment,
  onReactComment,
  onReplyComment,
  onDeleteBug,
  onEditBug,
  onAddBugSubmit,
  onMarkBugForReview,
  onMarkBugReviewed,
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
      const query = searchQuery.toLowerCase();
      list = list.filter(bug =>
        bug.discovery?.toLowerCase().includes(query)
        || bug.tags?.some(tag => tag.toLowerCase().includes(query))
        || bug.author?.toLowerCase().includes(query)
      );
    }
    if (activeTab === 'hot') {
      return list.filter(bug => hotScore(bug) > 0).sort((a, b) => hotScore(b) - hotScore(a));
    }
    if (activeTab === 'review') {
      return list
        .filter(bug => bug.triage && reviewStatusForBug(bug) === 'review_required')
        .sort((a, b) => bugTime(b) - bugTime(a));
    }
    return list.sort((a, b) => bugTime(b) - bugTime(a));
  }, [activeTab, bugs, searchQuery]);

  const reviewQueue = useMemo(
    () => bugs
      .filter(bug => bug.triage && reviewStatusForBug(bug) === 'review_required')
      .sort((a, b) => bugTime(b) - bugTime(a))
      .slice(0, 5),
    [bugs]
  );

  return (
    <div className="mx-auto max-w-[640px]" data-testid="wall-screen">
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="page-kicker">Living thread</p>
            <h1 className="page-title-serif mt-1 text-[30px] text-foreground">Wall</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Keep bug stories conversational, specific, and easy to continue.
            </p>
          </div>
          <div className="rounded-[16px] border border-border bg-card/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Flow</p>
            <p className="mt-1 text-[13px] text-foreground" style={{ fontWeight: 600 }}>
              {activeTab === 'feed'
                ? 'Latest discussion first'
                : activeTab === 'hot'
                  ? 'Surface posts getting traction'
                  : 'Focus only on items waiting for review'}
            </p>
          </div>
        </div>

        <div className="shell-tab-group wall-tab-group w-full overflow-x-auto">
        {[
          { key: 'feed' as const, label: 'Feed' },
          { key: 'hot' as const, label: 'Hot' },
          { key: 'review' as const, label: `Review${reviewQueue.length > 0 ? ` (${reviewQueue.length})` : ''}` },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
            className={`shell-tab wall-tab ${activeTab === tab.key ? 'shell-tab-active' : ''}`}
            style={{ fontWeight: activeTab === tab.key ? 620 : 520 }}
          >
            <span className="text-[13px]">{tab.label}</span>
          </button>
        ))}
        </div>
      </div>

      <WallComposer onSubmit={onAddBugSubmit} showToast={showToast} />

      {reviewQueue.length > 0 && activeTab !== 'review' && (
        <div className="mb-4 rounded-[18px] border border-amber-500/20 bg-amber-500/8 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-amber-700">Reviewer Queue</p>
              <p className="mt-1 text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                {reviewQueue.length} item{reviewQueue.length !== 1 ? 's' : ''} waiting for human review
              </p>
            </div>
            <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-medium text-amber-800">
              QA checkpoint
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {reviewQueue.map(bug => (
              <div
                key={`review-queue-${bug.id}`}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-amber-500/12 bg-white/65 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-foreground" style={{ fontWeight: 600 }}>
                    {bug.title || 'Wall post'}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                    {bug.triage?.summary || bug.discovery}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('review');
                      setExpandedId(bug.id);
                      onClearSelection();
                    }}
                    className="rounded-full border border-border/60 bg-white/80 px-3 py-1.5 text-[12px] text-foreground transition-colors hover:bg-secondary/30"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => void onMarkBugReviewed(bug.id)}
                    className="rounded-full border border-emerald-500/20 bg-white/80 px-3 py-1.5 text-[12px] text-emerald-800 transition-colors hover:bg-emerald-50"
                  >
                    Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {displayedBugs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-serif text-[22px] italic text-foreground/80">
            {searchQuery
              ? 'Nothing matched.'
              : activeTab === 'hot'
                ? 'Nothing hot yet.'
                : activeTab === 'review'
                  ? 'No review items right now.'
                  : 'The wall is quiet.'}
          </p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {searchQuery
              ? 'Try different keywords or a #tag.'
              : activeTab === 'review'
                ? 'New items that need a human checkpoint will show up here.'
                : 'Post the first thought to start the conversation.'}
          </p>
        </div>
      ) : (
        <div>
          {displayedBugs.map((bug, index) => (
            <motion.div
              key={bug.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: Math.min(index * 0.035, 0.18) }}
            >
              <WallPost
                bug={bug}
                isExpanded={expandedId === bug.id}
                isLast={index === displayedBugs.length - 1}
                onToggle={() => {
                  const closing = expandedId === bug.id;
                  setExpandedId(closing ? null : bug.id);
                  if (closing) onClearSelection();
                }}
                onReact={onReact}
                onComment={onComment}
                onReplyComment={onReplyComment}
                onReactComment={onReactComment}
                onEdit={onEditBug}
                onDelete={onDeleteBug}
                onMarkForReview={onMarkBugForReview}
                onMarkReviewed={onMarkBugReviewed}
                showToast={showToast}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
