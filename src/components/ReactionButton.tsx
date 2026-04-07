import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart } from 'lucide-react';

interface ReactionButtonProps {
  count: number;
  isReacted: boolean;
  onReact: (e: React.MouseEvent) => void;
  size?: number;
}

interface Particle {
  id: number;
  tx: number;
  ty: number;
}

export function ReactionButton({ count, isReacted, onReact, size = 20 }: ReactionButtonProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [popping, setPopping] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReacted) {
      // Spawn 6 particles at evenly-spread angles with slight jitter
      const newParticles: Particle[] = Array.from({ length: 6 }, (_, i) => {
        const baseAngle = i * 60;
        const jitter = (Math.random() - 0.5) * 25;
        const rad = ((baseAngle + jitter) * Math.PI) / 180;
        const dist = 18 + Math.random() * 14;
        return { id: Date.now() + i, tx: Math.cos(rad) * dist, ty: Math.sin(rad) * dist };
      });
      setParticles(newParticles);
      setPopping(true);
      // Clear pop flag after animation completes
      setTimeout(() => {
        setPopping(false);
        setParticles([]);
      }, 700);
    }
    onReact(e);
  };

  return (
    <div className="relative flex items-center">
      {/* Burst particles */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.span
            key={p.id}
            className="pointer-events-none absolute left-[10px] top-[10px] h-1.5 w-1.5 rounded-full bg-error"
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x: p.tx, y: p.ty, scale: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0, 0.6, 1] }}
          />
        ))}
      </AnimatePresence>

      {/* Heart button — pop on first react */}
      <motion.button
        onClick={handleClick}
        animate={popping ? { scale: [1, 1.4, 0.9, 1] } : { scale: 1 }}
        transition={
          popping
            ? { duration: 0.4, times: [0, 0.3, 0.6, 1], ease: 'easeOut' }
            : { duration: 0.15 }
        }
        className={`flex items-center gap-1.5 transition-colors ${
          isReacted ? 'text-error' : 'text-outline/60 hover:text-error'
        }`}
      >
        <Heart
          size={size}
          fill={isReacted ? 'currentColor' : 'none'}
          className="transition-colors"
        />
        <span className="text-xs font-medium">{count || '0'}</span>
      </motion.button>
    </div>
  );
}
