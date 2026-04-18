import React from 'react';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';

interface EntrySelectorModalProps {
  onSelect: (type: 'bug' | 'tip' | 'knowledge' | 'achievement') => void;
}

export function EntrySelectorModal({ onSelect }: EntrySelectorModalProps) {
  const options = [
    {
      id: 'bug',
      title: 'Bug Story',
      desc: 'Share a bug story, discovery, or lesson learned.',
      icon: 'solar:bug-bold-duotone',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      id: 'tip',
      title: 'Tip & Trick',
      desc: 'Share a helpful tip or a shortcut for the community.',
      icon: 'solar:lightbulb-bold-duotone',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      id: 'knowledge',
      title: 'Knowledge Post',
      desc: 'Propose a session or share a learning resource.',
      icon: 'solar:book-bold-duotone',
      color: 'text-foreground',
      bgColor: 'bg-secondary/60',
    },
    {
      id: 'achievement',
      title: 'Achievement',
      desc: 'Capture a meaningful work or personal win in your growth journal.',
      icon: 'solar:medal-ribbon-bold-duotone',
      color: 'text-[#5A8B58]',
      bgColor: 'bg-[#5A8B58]/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3">
      {options.map((option, index) => (
        <motion.button
          key={option.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          onClick={() => onSelect(option.id as any)}
          className="group flex items-center gap-4 p-4 bg-secondary/30 hover:bg-secondary/60 rounded-[12px] border border-border hover:border-primary/20 transition-all text-left"
        >
          <div className={`w-10 h-10 ${option.bgColor} ${option.color} rounded-[10px] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
            <Icon icon={option.icon} width={20} height={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-[13px] text-foreground" style={{ fontWeight: 590 }}>{option.title}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{option.desc}</p>
          </div>
          <Icon icon="solar:alt-arrow-right-bold" width={14} height={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </motion.button>
      ))}
    </div>
  );
}
