import React, { useState, useRef, useEffect } from 'react';
import { Bug, PlusCircle, Image as ImageIcon, Smile, Trash2 } from 'lucide-react';
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
  const [formData, setFormData] = useState({
    author: initialData?.author || profile?.displayName || 'Anonymous Architect',
    isAnonymous: initialData?.isAnonymous || false,
    title: initialData?.title || '',
    impact: initialData?.impact || '',
    mood: initialData?.mood || 'Neutral 😐',
    tags: initialData?.tags?.join(', ') || '',
    discovery: initialData?.discovery || '',
    lesson: initialData?.lesson || ''
  });

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const uploadedImageUrls = [...existingImageUrls];
      
      // Upload all new files
      for (const file of imageFiles) {
        try {
          const url = await uploadImage(file, 'bugs');
          if (url) uploadedImageUrls.push(url);
        } catch (error) {
          console.error("Failed to upload image", error);
          if (showToast) showToast('Failed to upload image. Using Cloudinary.', 'error');
        }
      }

      onSubmit({
        ...formData,
        authorId: initialData?.authorId || profile?.uid || null,
        authorPhotoURL: initialData?.authorPhotoURL || profile?.photoURL || null,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
        imageUrl: uploadedImageUrls[0] || null, // Keep for backward compatibility
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-outline">Bug Title</label>
          <input 
            required
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="e.g. The Infinite Token Loophole"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-outline">Impact Summary</label>
          <input 
            required
            value={formData.impact}
            onChange={e => setFormData({ ...formData, impact: e.target.value })}
            className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="e.g. Production Risk, UI Glitch"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-outline">How did it make you feel?</label>
          <select 
            value={formData.mood}
            onChange={e => setFormData({ ...formData, mood: e.target.value })}
            className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option>Neutral 😐</option>
            <option>Terrified 😱</option>
            <option>Amused 😂</option>
            <option>Frustrated 😤</option>
            <option>Proud 😎</option>
            <option>Confused 😵‍💫</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-outline">Tags (comma separated)</label>
        <input 
          value={formData.tags}
          onChange={e => setFormData({ ...formData, tags: e.target.value })}
          className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          placeholder="e.g. Critical, API Auth, UI"
        />
      </div>

      <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
        <input 
          type="checkbox"
          id="isAnonymous"
          checked={formData.isAnonymous}
          onChange={e => setFormData({ ...formData, isAnonymous: e.target.checked })}
          className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 cursor-pointer"
        />
        <label htmlFor="isAnonymous" className="text-sm font-bold text-on-surface cursor-pointer select-none">
          Post Anonymously
          <span className="block text-[10px] text-outline font-medium uppercase tracking-wider mt-0.5">Your name will be hidden from the community</span>
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-outline">Discovery Method</label>
        <textarea 
          required
          value={formData.discovery}
          onChange={e => setFormData({ ...formData, discovery: e.target.value })}
          onPaste={handlePaste}
          className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          placeholder="How did you find it? (Paste images here)"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-outline">Lesson Learned</label>
        <textarea 
          required
          value={formData.lesson}
          onChange={e => setFormData({ ...formData, lesson: e.target.value })}
          className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          placeholder="What's the takeaway?"
          rows={3}
        />
      </div>

      <div className="space-y-2 relative">
        <label className="text-xs font-bold uppercase tracking-widest text-outline">Attachments</label>
        <div className="flex gap-2">
          <input 
            type="file" 
            accept="image/*" 
            multiple
            className="hidden" 
            ref={fileInputRef} 
            onChange={(e) => {
              if (e.target.files) {
                const newFiles = Array.from(e.target.files);
                const totalCount = imageFiles.length + existingImageUrls.length + newFiles.length;
                if (totalCount <= 3) {
                  setImageFiles(prev => [...prev, ...newFiles]);
                } else {
                  const remaining = 3 - (imageFiles.length + existingImageUrls.length);
                  if (remaining > 0) {
                    setImageFiles(prev => [...prev, ...newFiles.slice(0, remaining)]);
                  }
                }
              }
            }} 
          />
          <button 
            type="button"
            disabled={imageFiles.length + existingImageUrls.length >= 3}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-lg text-sm font-bold text-on-surface hover:bg-surface-container-highest transition-colors disabled:opacity-50"
          >
            <ImageIcon size={16} /> Image ({imageFiles.length + existingImageUrls.length}/3)
          </button>
          <button 
            type="button"
            ref={gifButtonRef}
            onClick={() => setShowGifPicker(!showGifPicker)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-lg text-sm font-bold text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <Smile size={16} /> GIF
          </button>
        </div>

        {showGifPicker && (
          <div ref={gifPickerRef} className="absolute z-50 bottom-full mb-2 left-0 bg-surface-container-high p-2 rounded-xl shadow-xl border border-outline-variant/20 w-72 h-80 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-on-surface">Trending GIFs</span>
              <button type="button" onClick={() => setShowGifPicker(false)} className="text-outline hover:text-on-surface">
                <Trash2 size={14} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search GIFs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg p-2 text-sm mb-2 focus:ring-2 focus:ring-primary/20 transition-all"
            />
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
              <div className="text-xs text-outline p-4">Giphy API key not configured.</div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-4 mt-4">
          {existingImageUrls.map((url, idx) => (
            <div key={`existing-${idx}`} className="relative inline-block">
              <img src={url} alt="Preview" className="h-24 rounded border border-outline-variant/20 object-contain" />
              <button 
                type="button"
                onClick={() => setExistingImageUrls(prev => prev.filter((_, i) => i !== idx))} 
                className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 shadow-lg"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          
          {imageFiles.map((file, idx) => (
            <div key={`new-${idx}`} className="relative inline-block">
              <img src={URL.createObjectURL(file)} alt="Preview" className="h-24 rounded border border-outline-variant/20 object-contain" />
              <button 
                type="button"
                onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))} 
                className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 shadow-lg"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          
          {gifUrl && (
            <div className="relative inline-block">
              <img src={gifUrl} alt="GIF Preview" className="h-24 rounded border border-outline-variant/20 object-contain" />
              <button 
                type="button"
                onClick={() => setGifUrl(null)} 
                className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 shadow-lg"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      <button 
        disabled={isSubmitting}
        type="submit" 
        className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          <>
            <PlusCircle size={20} />
            Post to Bug Wall
          </>
        )}
      </button>
    </form>
  );
}
