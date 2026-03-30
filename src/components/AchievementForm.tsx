import React, { useState } from 'react';
import { Sparkles, PlusCircle } from 'lucide-react';
import { Achievement } from '../types';

interface AchievementFormProps {
  onSubmit: (achievement: any) => void;
  onClose: () => void;
  initialData?: Achievement;
}

export function AchievementForm({ onSubmit, onClose, initialData }: AchievementFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    category: initialData?.category || 'Work' as 'Work' | 'Personal',
    story: initialData?.story || '',
    impact: initialData?.impact || '',
    achievementDate: initialData?.achievementDate || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      onSubmit({
        ...formData,
        achievementDate: formData.achievementDate || undefined,
      });
      setIsSubmitting(false);
      onClose();
    }, 700);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-bold uppercase tracking-widest text-outline">Achievement Title</label>
          <input
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="e.g. Reduced flaky regression runs before release"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-outline">Category</label>
          <div className="grid grid-cols-2 gap-3">
            {(['Work', 'Personal'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFormData({ ...formData, category: option })}
                className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                  formData.category === option
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant/20 bg-surface-container-low text-on-surface'
                }`}
              >
                <span className="block text-sm font-bold">{option}</span>
                <span className="mt-1 block text-xs text-outline">
                  {option === 'Work' ? 'Testing wins, delivery impact, collaboration' : 'Personal growth, learning, community, resilience'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-outline">When Did It Happen?</label>
          <input
            type="date"
            value={formData.achievementDate}
            onChange={(e) => setFormData({ ...formData, achievementDate: e.target.value })}
            className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-outline">What Happened?</label>
        <textarea
          required
          minLength={24}
          value={formData.story}
          onChange={(e) => setFormData({ ...formData, story: e.target.value })}
          className="w-full bg-surface-container-highest border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          placeholder="Describe the moment, challenge, or initiative in a few sentences."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-outline">Why Did It Matter?</label>
        <textarea
          required
          minLength={20}
          value={formData.impact}
          onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
          className="w-full bg-surface-container-highest border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          placeholder="Explain the impact on quality, team flow, customer confidence, or personal growth."
          rows={4}
        />
      </div>

      <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/8 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-emerald-500/15 p-2 text-emerald-700 dark:text-emerald-300">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">Keep it honest and specific.</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Short, concrete stories are easier for the team to appreciate and easier for you to revisit later.
            </p>
          </div>
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
            Save Achievement
          </>
        )}
      </button>
    </form>
  );
}
