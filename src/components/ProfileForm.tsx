import React, { useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { updateDisplayName, updatePhotoURL } from '../firebase';
import { useToast } from './Toast';
import { Icon } from '@iconify/react';

interface ProfileFormProps {
  onClose: () => void;
  onUpdateAvatars: (uid: string, newPhotoURL: string, authorName?: string) => void;
}

const RANDOM_STYLES = [
  'pixel-art',
  'pixel-art-neutral',
  'avataaars',
  'bottts',
  'adventurer',
  'lorelei',
  'personas',
  'miniavs',
  'open-peeps',
  'big-smile'
];

export const ProfileForm: React.FC<ProfileFormProps> = ({ onClose, onUpdateAvatars }) => {
  const { profile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [selectedPhotoURL, setSelectedPhotoURL] = useState(profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for base64 storage
        showToast('Image too large. Please choose an image under 1MB.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRandomize = () => {
    const randomStyle = RANDOM_STYLES[Math.floor(Math.random() * RANDOM_STYLES.length)];
    const randomSeed = Math.random().toString(36).substring(7);
    setSelectedPhotoURL(`https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid || !displayName.trim()) return;

    setIsSubmitting(true);
    try {
      const updates = [];
      if (displayName.trim() !== profile.displayName) {
        updates.push(updateDisplayName(profile.uid, displayName.trim()));
      }
      if (selectedPhotoURL !== profile.photoURL) {
        updates.push(updatePhotoURL(profile.uid, selectedPhotoURL));
      }

      if (updates.length > 0) {
        await Promise.all(updates);
        if (selectedPhotoURL !== profile.photoURL) {
          onUpdateAvatars(profile.uid, selectedPhotoURL, displayName.trim());
        }
        showToast('Profile updated successfully!');
      }
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isChanged = displayName.trim() !== profile?.displayName || selectedPhotoURL !== profile?.photoURL;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative group">
          <div className="w-32 h-32 rounded-3xl bg-surface-container-high overflow-hidden border-4 border-primary/20 shadow-xl transition-transform group-hover:scale-105">
            {selectedPhotoURL ? (
              <img 
                src={selectedPhotoURL} 
                alt="Avatar Preview" 
                className={`w-full h-full object-cover ${selectedPhotoURL.includes('pixel') ? '[image-rendering:pixelated]' : ''}`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-outline">
                <Icon icon="solar:user-bold-duotone" width={48} height={48} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 p-3 bg-primary text-white rounded-2xl shadow-lg hover:scale-110 transition-all"
            title="Upload Image"
          >
            <Icon icon="solar:upload-bold-duotone" width={20} height={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleRandomize}
            className="flex items-center gap-2 px-6 py-2 bg-surface-container-high text-on-surface font-bold rounded-full hover:bg-surface-container-highest transition-all group"
          >
            <Icon icon="solar:refresh-bold-duotone" width={16} height={16} className="group-hover:rotate-180 transition-transform duration-500" />
            Can't decide? Randomize!
          </button>
          <p className="text-[10px] text-outline uppercase font-bold tracking-widest">Or upload your own image</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-outline uppercase tracking-widest">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your display name"
          className="w-full bg-surface-container-high border-none rounded-2xl py-4 px-6 text-on-surface focus:ring-2 focus:ring-primary/20 transition-all"
          maxLength={50}
          required
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-4 bg-surface-container-high text-on-surface font-bold rounded-2xl hover:bg-surface-container-highest transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !displayName.trim() || !isChanged}
          className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all"
        >
          {isSubmitting ? 'Updating...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};
