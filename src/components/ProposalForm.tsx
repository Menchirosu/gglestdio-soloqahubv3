import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Proposal } from '../types';
import { useAuth } from '../AuthContext';

interface ProposalFormProps {
  onSubmit: (proposal: any) => void;
  onClose: () => void;
  initialData?: Proposal;
}

export function ProposalForm({ onSubmit, onClose, initialData }: ProposalFormProps) {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    scope: initialData?.scope || '',
    type: initialData?.type || 'Session' as 'Session' | 'Resource',
    tags: initialData?.tags || [] as string[]
  });

  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      onSubmit(formData);
      setIsSubmitting(false);
      onClose();
    }, 800);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Proposal Title</label>
          <input
            required
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-secondary/30 border-none rounded-[12px] p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="e.g. Masterclass: API Security"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Type</label>
          <select
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value as 'Session' | 'Resource' })}
            className="w-full bg-secondary/30 border-none rounded-[12px] p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="Session">Knowledge Sharing Session</option>
            <option value="Resource">Learning Resource</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Description/Scope</label>
        <textarea
          required
          value={formData.scope}
          onChange={e => setFormData({ ...formData, scope: e.target.value })}
          className="w-full bg-secondary/30 border-none rounded-[12px] p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          placeholder="What are you sharing? What will people learn?"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map(tag => (
            <span key={tag} className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full flex items-center gap-1">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
            className="flex-1 bg-secondary/30 border-none rounded-[12px] p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Add a tag..."
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 bg-secondary/30 text-foreground font-bold rounded-[12px] hover:bg-secondary/50 transition-all"
          >
            Add
          </button>
        </div>
      </div>

      <button
        disabled={isSubmitting}
        type="submit"
        className="w-full py-3 bg-primary text-white text-sm font-[590] rounded-[6px] transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <Icon icon="solar:check-bold" width={15} height={15} />
            Submit Proposal
          </>
        )}
      </button>
    </form>
  );
}
