import { motion } from "motion/react";
import React, { useState, useEffect } from 'react';

interface BreathingGuideProps {
  isActive: boolean;
}

const PHASES = [
  { name: 'Inhale', duration: 4, scale: 1.5 },
  { name: 'Hold', duration: 4, scale: 1.5 },
  { name: 'Exhale', duration: 4, scale: 1 },
  { name: 'Hold', duration: 4, scale: 1 },
];

export function BreathingGuide({ isActive }: BreathingGuideProps) {
  const [state, setState] = useState({
    phaseIndex: 0,
    timeLeft: PHASES[0].duration,
  });

  useEffect(() => {
    if (!isActive) {
      setState({ phaseIndex: 0, timeLeft: PHASES[0].duration });
      return;
    }

    const timer = setInterval(() => {
      setState((prev) => {
        if (prev.timeLeft <= 1) {
          const nextIndex = (prev.phaseIndex + 1) % PHASES.length;
          return {
            phaseIndex: nextIndex,
            timeLeft: PHASES[nextIndex].duration,
          };
        }
        return {
          ...prev,
          timeLeft: prev.timeLeft - 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  const currentPhase = PHASES[state.phaseIndex];

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-4">
      <div className="relative flex items-center justify-center w-40 h-40">
        {/* Outer Ring for reference */}
        <div className="absolute inset-0 rounded-full border-4 border-surface-container-highest/30" />
        
        {/* Breathing Circle */}
        <motion.div
          animate={{
            scale: isActive ? currentPhase.scale : 1,
          }}
          transition={{
            duration: isActive ? 4 : 0.5,
            ease: "easeInOut",
          }}
          className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/20"
        >
          <span className="text-white text-3xl font-black font-mono">
            {isActive ? state.timeLeft : ""}
          </span>
        </motion.div>
      </div>
      
      <div className="text-center space-y-1">
        <h4 className="text-xl font-black uppercase tracking-widest text-primary h-6">
          {isActive ? currentPhase.name : "Focus Breathing"}
        </h4>
        <p className="text-tertiary text-[10px] font-bold uppercase tracking-[0.2em]">
          Box Pattern: 4s • 4s • 4s • 4s
        </p>
      </div>
    </div>
  );
}
