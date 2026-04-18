import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Achievement } from '../types';
import { ConfettiCelebration } from './ConfettiCelebration';

interface AchievementFormProps {
  onSubmit: (achievement: any) => Promise<void> | void;
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
  const [celebrating, setCelebrating] = useState(false);
  const [celebrationTitle, setCelebrationTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        achievementDate: formData.achievementDate || undefined,
      });
      if (!initialData) {
        setCelebrationTitle(formData.title);
        setCelebrating(true);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Failed to submit achievement form', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {celebrating && (
        <ConfettiCelebration
          title={celebrationTitle}
          onDone={() => {
            setCelebrating(false);
            onClose();
          }}
        />
      )}
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="achievement-title" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Achievement Title</label>
          <input
            id="achievement-title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-secondary/30 border-none rounded-[12px] p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="e.g. Reduced flaky regression runs before release"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Category</label>
          <div className="grid grid-cols-2 gap-3">
            {(['Work', 'Personal'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFormData({ ...formData, category: option })}
                className={`rounded-[12px] border px-4 py-4 text-left transition-all ${
                  formData.category === option
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/20 bg-card text-foreground'
                }`}
              >
                <span className="block text-sm font-bold">{option}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {option === 'Work' ? 'Testing wins, delivery impact, collaboration' : 'Personal growth, learning, community, resilience'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="achievement-date" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">When Did It Happen?</label>
          <input
            id="achievement-date"
            type="date"
            value={formData.achievementDate}
            onChange={(e) => setFormData({ ...formData, achievementDate: e.target.value })}
            className="w-full bg-secondary/30 border-none rounded-[12px] p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="achievement-story" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What Happened?</label>
        <textarea
          id="achievement-story"
          required
          minLength={24}
          value={formData.story}
          onChange={(e) => setFormData({ ...formData, story: e.target.value })}
          className="w-full bg-secondary/30 border-none rounded-[16px] p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          placeholder="Describe the moment, challenge, or initiative in a few sentences."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="achievement-impact" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Why Did It Matter?</label>
        <textarea
          id="achievement-impact"
          required
          minLength={20}
          value={formData.impact}
          onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
          className="w-full bg-secondary/30 border-none rounded-[16px] p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          placeholder="Explain the impact on quality, team flow, customer confidence, or personal growth."
          rows={4}
        />
      </div>

      <div className="rounded-[12px] border border-[#5A8B58]/15 bg-[#5A8B58]/8 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-[10px] bg-[#5A8B58]/15 p-2 text-[#5A8B58]">
            <Icon icon="solar:medal-ribbon-bold-duotone" width={16} height={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Keep it honest and specific.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Short, concrete stories are easier for the team to appreciate and easier for you to revisit later.
            </p>
          </div>
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
            Save Achievement
          </>
        )}
      </button>
    </form>
    </>
  );
}
