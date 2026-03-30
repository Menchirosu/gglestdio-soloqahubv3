import React from 'react';
import { Bug, Lightbulb, BookOpen, Sparkles, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface EntrySelectorModalProps {
  onSelect: (type: 'bug' | 'tip' | 'knowledge' | 'achievement') => void;
}

export function EntrySelectorModal({ onSelect }: EntrySelectorModalProps) {
  const options = [
    {
      id: 'bug',
      title: 'Bug Wall',
      desc: 'Share a bug story, discovery, or lesson learned.',
      icon: Bug,
      color: 'text-error',
      bgColor: 'bg-error/10'
    },
    {
      id: 'tip',
      title: 'Tips & Tricks',
      desc: 'Share a helpful tip or a shortcut for the community.',
      icon: Lightbulb,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'knowledge',
      title: 'Knowledge Sharing',
      desc: 'Propose a session or share a learning resource.',
      icon: BookOpen,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      id: 'achievement',
      title: 'Achievements',
      desc: 'Capture a meaningful work or personal win in your growth journal.',
      icon: Sparkles,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10'
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4">
      {options.map((option, index) => (
        <motion.button
          key={option.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(option.id as any)}
          className="group flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 hover:bg-surface-container-high hover:scale-[1.02] transition-all text-left"
        >
          <div className={`w-12 h-12 ${option.bgColor} ${option.color} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
            <option.icon size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-on-surface">{option.title}</h3>
            <p className="text-xs text-outline leading-relaxed mt-0.5">{option.desc}</p>
          </div>
          <ChevronRight className="text-outline-variant group-hover:text-primary transition-colors" size={20} />
        </motion.button>
      ))}
    </div>
  );
}
