import React, { useState } from 'react';
import { AlertTriangle, PlusCircle } from 'lucide-react';
import { Concern } from '../types';
import { useAuth } from '../AuthContext';

interface ConcernFormProps {
  onSubmit: (concern: any) => void;
  onClose: () => void;
  initialData?: Concern;
}

export function ConcernForm({ onSubmit, onClose, initialData }: ConcernFormProps) {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    author: initialData?.author || profile?.displayName || 'Anonymous Architect',
    isAnonymous: initialData?.author === 'Anonymous Architect' || false,
    category: initialData?.category || 'Workload',
    content: initialData?.content || ''
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
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-outline">Category</label>
        <select 
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
          className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
        >
          <option>Workload</option>
          <option>Process Bottleneck</option>
          <option>Tooling Issue</option>
          <option>Wellness</option>
          <option>Other</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-outline">What's on your mind?</label>
        <textarea
          required
          minLength={10}
          value={formData.content}
          onChange={e => setFormData({ ...formData, content: e.target.value })}
          className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          placeholder="Describe your concern or suggestion..."
          rows={5}
        />
        {formData.content.length > 0 && formData.content.length < 10 && (
          <p className="text-[10px] text-error">Please enter at least 10 characters.</p>
        )}
      </div>

      <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
        <input 
          type="checkbox"
          id="isAnonymousConcern"
          checked={formData.isAnonymous}
          onChange={e => setFormData({ ...formData, isAnonymous: e.target.checked })}
          className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 cursor-pointer"
        />
        <label htmlFor="isAnonymousConcern" className="text-sm font-bold text-on-surface cursor-pointer select-none">
          Submit Anonymously
          <span className="block text-[10px] text-outline font-medium uppercase tracking-wider mt-0.5">Your name will be hidden from the community</span>
        </label>
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
            Submit Concern
          </>
        )}
      </button>
    </form>
  );
}
