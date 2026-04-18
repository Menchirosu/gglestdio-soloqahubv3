import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Tip } from '../types';
import { useAuth } from '../AuthContext';

interface TipFormProps {
  onSubmit: (tip: any) => void;
  onClose: () => void;
  initialData?: Tip;
}

export function TipForm({ onSubmit, onClose, initialData }: TipFormProps) {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    cat: initialData?.cat || 'Manual Testing',
    title: initialData?.title || '',
    desc: initialData?.desc || '',
    scenario: initialData?.scenario || '',
    author: initialData?.author || profile?.displayName || 'Anonymous',
    highlight: initialData?.highlight || false
  });

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-outline">Tip Title</label>
          <input 
            required
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="e.g. The 20-Min Rule"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-outline">Category</label>
          <select 
            value={formData.cat}
            onChange={e => setFormData({ ...formData, cat: e.target.value })}
            className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option>Manual Testing</option>
            <option>Automation</option>
            <option>API Testing</option>
            <option>Time Management</option>
            <option>Communication</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-outline">Description</label>
        <textarea
          required
          minLength={10}
          value={formData.desc}
          onChange={e => setFormData({ ...formData, desc: e.target.value })}
          className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          placeholder="Explain the tip..."
          rows={3}
        />
        {formData.desc.length > 0 && formData.desc.length < 10 && (
          <p className="text-[10px] text-error">Please enter at least 10 characters.</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-outline">Real-world Scenario</label>
        <textarea 
          required
          value={formData.scenario}
          onChange={e => setFormData({ ...formData, scenario: e.target.value })}
          className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          placeholder="When does this apply?"
          rows={3}
        />
      </div>

      <div 
        onClick={() => setFormData({ ...formData, highlight: !formData.highlight })}
        className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon icon="solar:lightbulb-bold-duotone" width={18} height={18} className={`transition-colors ${formData.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium">Highlight as Featured Tip</span>
        </div>
        <div className={`w-11 h-6 rounded-full relative transition-colors ${formData.highlight ? 'bg-primary' : 'bg-outline-variant'}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.highlight ? 'right-1' : 'left-1'}`}></div>
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
            Share Tip
          </>
        )}
      </button>
    </form>
  );
}
