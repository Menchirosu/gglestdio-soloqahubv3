import React, { useState, useRef, useEffect } from 'react';
import { Bug, PlusCircle, Image as ImageIcon, Smile, Trash2, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BugStory } from '../types';
import { useAuth } from '../AuthContext';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { uploadImage } from '../firebase';

const giphyApiKey = import.meta.env.VITE_GIPHY_API_KEY;
const gf = giphyApiKey ? new GiphyFetch(giphyApiKey) : null;

interface BugFormProps {
  onSubmit: (bug: any) => void;
  onClose: () => void;
  initialData?: BugStory;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function BugForm({ onSubmit, onClose, initialData, showToast }: BugFormProps) {
  const { profile } = useAuth();
  const [content, setContent] = useState(initialData?.discovery || '');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [gifUrl, setGifUrl] = useState<string | null>(initialData?.gifUrl || null);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(initialData?.imageUrls || (initialData?.imageUrl ? [initialData.imageUrl] : []));
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const gifButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('.gif-picker-container') || target.closest('.gif-button-trigger')) {
        return;
      }
      if (showGifPicker) setShowGifPicker(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showGifPicker]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && imageFiles.length === 0 && !gifUrl && existingImageUrls.length === 0) return;
    setIsSubmitting(true);
    
    try {
      const uploadedImageUrls = [...existingImageUrls];
      
      for (const file of imageFiles) {
        try {
          const url = await uploadImage(file, 'bugs');
          if (url) uploadedImageUrls.push(url);
        } catch (error) {
          console.error("Failed to upload image", error);
          if (showToast) showToast('Failed to upload image.', 'error');
        }
      }

      // Generate a title from content for backward compatibility
      const title = content.split('\n')[0].substring(0, 50) || 'Bug Story';

      onSubmit({
        author: isAnonymous ? 'Anonymous Architect' : (profile?.displayName || 'Anonymous Architect'),
        isAnonymous,
        title,
        impact: 'Shared Story',
        mood: 'Neutral 😐',
        tags: [],
        discovery: content,
        lesson: 'Shared via Freedom Wall',
        authorId: initialData?.authorId || profile?.uid || null,
        authorPhotoURL: initialData?.authorPhotoURL || profile?.photoURL || null,
        imageUrl: uploadedImageUrls[0] || null,
        imageUrls: uploadedImageUrls,
        gifUrl: gifUrl || null
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file && imageFiles.length + existingImageUrls.length < 3) {
          setImageFiles(prev => [...prev, file]);
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex gap-4">
        {/* Avatar Column */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant/10">
            <img 
              src={isAnonymous ? `https://api.dicebear.com/7.x/bottts/svg?seed=new` : (profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`)} 
              alt="Me" 
              className={`w-full h-full object-cover ${isAnonymous ? 'p-2' : ''}`}
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="w-0.5 flex-1 bg-outline-variant/20 rounded-full min-h-[40px]" />
        </div>

        {/* Content Column */}
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-on-surface">{isAnonymous ? 'Anonymous Architect' : profile?.displayName}</p>
            <textarea 
              autoFocus
              value={content}
              onChange={e => setContent(e.target.value)}
              onPaste={handlePaste}
              className="w-full bg-transparent border-none p-0 text-base text-on-surface placeholder:text-outline/40 focus:ring-0 transition-all resize-none min-h-[100px]"
              placeholder={`What's the bug story today, ${profile?.displayName?.split(' ')[0]}?`}
            />
          </div>

          {/* Previews */}
          <div className="flex flex-wrap gap-2">
            {existingImageUrls.map((url, idx) => (
              <div key={`existing-${idx}`} className="relative group">
                <img src={url} alt="Preview" className="h-32 rounded-xl border border-outline-variant/20 object-cover" />
                <button 
                  type="button"
                  onClick={() => setExistingImageUrls(prev => prev.filter((_, i) => i !== idx))} 
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            
            {imageFiles.map((file, idx) => (
              <div key={`new-${idx}`} className="relative group">
                <img src={URL.createObjectURL(file)} alt="Preview" className="h-32 rounded-xl border border-outline-variant/20 object-cover" />
                <button 
                  type="button"
                  onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))} 
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            
            {gifUrl && (
              <div className="relative group">
                <img src={gifUrl} alt="GIF Preview" className="h-32 rounded-xl border border-outline-variant/20 object-cover" />
                <button 
                  type="button"
                  onClick={() => setGifUrl(null)} 
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Actions Row */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex gap-4 text-outline/60">
              <div className="relative">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={(e) => {
                    if (e.target.files) {
                      const files = Array.from(e.target.files);
                      setImageFiles(prev => [...prev, ...files]);
                    }
                  }}
                  className="hidden" 
                  id="bug-image-upload" 
                />
                <label 
                  htmlFor="bug-image-upload" 
                  className="cursor-pointer hover:text-primary transition-colors flex items-center"
                  title="Add Images"
                >
                  <ImageIcon size={20} />
                </label>
              </div>

              <button 
                type="button"
                ref={gifButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGifPicker(!showGifPicker);
                }}
                className="gif-button-trigger hover:text-primary transition-colors"
                title="Add GIF"
              >
                <Smile size={20} />
              </button>

              <div className="h-5 w-[1px] bg-outline-variant/20 mx-1" />

              <button 
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all border ${
                  isAnonymous ? 'bg-primary/10 border-primary/20 text-primary' : 'text-outline/60 hover:text-on-surface border-transparent hover:bg-surface-container-high'
                }`}
              >
                <Bug size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Anonymous</span>
              </button>
            </div>

            <button 
              disabled={isSubmitting || (!content.trim() && imageFiles.length === 0 && !gifUrl && existingImageUrls.length === 0)}
              type="submit" 
              className="px-6 py-2 bg-on-surface text-surface font-bold rounded-full hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin"></div>
              ) : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* GIF Picker Overlay */}
      <AnimatePresence>
        {showGifPicker && (
          <motion.div 
            ref={gifPickerRef} 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="gif-picker-container absolute z-50 bottom-16 left-0 bg-surface border border-outline-variant/20 p-2 rounded-2xl shadow-2xl w-72 h-80 overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-outline">Trending GIFs</span>
              <button type="button" onClick={() => setShowGifPicker(false)} className="text-outline hover:text-on-surface">
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search GIFs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl p-2 text-xs mb-2 focus:ring-1 focus:ring-primary/20 transition-all"
            />
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {gf ? (
                <Grid 
                  key={searchTerm}
                  width={260} 
                  columns={2} 
                  fetchGifs={async (offset) => {
                    try {
                      if (searchTerm) {
                        return await gf.search(searchTerm, { offset, limit: 10 });
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
                    setGifUrl(gif.images.fixed_height.url);
                    setShowGifPicker(false);
                  }} 
                />
              ) : (
                <div className="text-[10px] text-outline p-4 text-center">Giphy API key not configured.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
