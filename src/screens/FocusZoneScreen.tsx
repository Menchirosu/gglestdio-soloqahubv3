import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, useReducedMotion } from 'motion/react';
import { Icon } from '@iconify/react';
import { BreathingGuide } from '../components/BreathingGuide';
import { SoundGenerator } from '../services/soundGenerator';

const SOUNDSCAPES: { id: string; name: string; icon: string }[] = [
  { id: 'rain', name: 'Rainfall', icon: 'solar:cloud-rain-bold-duotone' },
  { id: 'waves', name: 'Ocean Waves', icon: 'solar:waterdrops-bold-duotone' },
  { id: 'fire', name: 'Fireplace', icon: 'solar:fire-bold-duotone' },
  { id: 'forest', name: 'Forest', icon: 'solar:leaf-bold-duotone' },
];

export function FocusZoneScreen() {
  const reduce = useReducedMotion();
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [sound, setSound] = useState('none');
  const [isMuted, setIsMuted] = useState(false);
  const soundGeneratorRef = useRef<SoundGenerator | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | number;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      setMode(m => m === 'focus' ? 'break' : 'focus');
      setTimeLeft(mode === 'focus' ? 5 * 60 : 25 * 60);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  // Audio handling
  useEffect(() => {
    if (!soundGeneratorRef.current) {
      soundGeneratorRef.current = new SoundGenerator();
    }

    const generator = soundGeneratorRef.current;

    if (sound === 'none') {
      generator.stop();
      return;
    }

    generator.play(sound);
    generator.setMuted(isMuted);

    return () => {
      // Cleanup handled by dependencies and unmount effect
    };
  }, [sound]);

  useEffect(() => {
    if (soundGeneratorRef.current) {
      soundGeneratorRef.current.setMuted(isMuted);
    }
  }, [isMuted]);

  useEffect(() => {
    return () => {
      if (soundGeneratorRef.current) {
        soundGeneratorRef.current.stop();
      }
    };
  }, []);

  const playBtnControls = useAnimation();

  const toggleTimer = () => {
    if (!isActive && !reduce) {
      playBtnControls.start({
        scale: [1, 1.1, 0.95, 1],
        transition: { duration: 0.4, ease: 'easeOut' },
      });
    }
    setIsActive(prev => !prev);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Hero */}
      <section className="text-center space-y-2">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground" style={{ fontWeight: 600 }}>
          Focus
        </p>
        <h1 className="page-title-serif text-[40px] text-foreground">
          <span style={{ fontStyle: 'italic' }}>The Focus Zone.</span>
        </h1>
        <p className="mx-auto max-w-xl text-[14px] text-muted-foreground leading-relaxed">
          Silence the noise. Sharpen the mind. Ship the quality.
        </p>
      </section>

      {/* Timer card */}
      <div className="page-panel p-8 max-w-2xl mx-auto flex flex-col items-center justify-center gap-6">
        <div className="relative w-56 h-56 flex items-center justify-center">
          {(() => {
            const total = mode === 'focus' ? 25 * 60 : 5 * 60;
            const elapsed = total - timeLeft;
            const progress = elapsed / total;
            const radius = 100;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference * (1 - progress);
            const isLow = timeLeft / total < 0.25;
            return (
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 224 224">
                <circle cx="112" cy="112" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-border" />
                <circle
                  cx="112" cy="112" r={radius} fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={`transition-all duration-1000 ${isLow ? 'text-[#C73D35]' : 'text-primary'}`}
                />
              </svg>
            );
          })()}
          <div className="text-center relative z-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1" style={{ fontWeight: 510 }}>
              {mode} session
            </p>
            <h3 className="text-6xl font-mono tracking-tighter tabular-nums text-foreground" style={{ fontWeight: 590 }}>
              {formatTime(timeLeft)}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <motion.button
            whileTap={reduce ? undefined : { scale: 0.9 }}
            transition={{ duration: 0.1 }}
            onClick={resetTimer}
            aria-label="Reset timer"
            className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
          >
            <Icon icon="solar:refresh-linear" width={20} height={20} />
          </motion.button>

          <motion.button
            animate={playBtnControls}
            whileTap={reduce ? undefined : { scale: 0.94 }}
            onClick={toggleTimer}
            aria-label={isActive ? 'Stop timer' : 'Start timer'}
            className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/30 hover:bg-primary/90 transition-colors"
          >
            {isActive
              ? <Icon icon="solar:stop-bold" width={26} height={26} />
              : <Icon icon="solar:play-bold" width={30} height={30} />}
          </motion.button>

          <motion.button
            whileTap={reduce ? undefined : { scale: 0.9 }}
            transition={{ duration: 0.1 }}
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isMuted
                ? 'bg-destructive/10 text-destructive'
                : 'bg-secondary text-muted-foreground hover:text-primary hover:bg-muted'
            }`}
          >
            <Icon
              icon={isMuted ? 'solar:volume-cross-linear' : 'solar:volume-loud-linear'}
              width={20}
              height={20}
            />
          </motion.button>
        </div>
      </div>

      {/* Breathing Guide */}
      <section className="page-panel max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-[10px] text-primary">
            <Icon icon="solar:wind-bold-duotone" width={20} height={20} />
          </div>
          <h2 className="text-[18px] text-foreground" style={{ fontWeight: 590, letterSpacing: '-0.02em' }}>
            Breathing Guide
          </h2>
        </div>
        <BreathingGuide isActive={isActive} />
      </section>

      {/* Mantra + Soundscapes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="page-panel-muted p-6 space-y-4">
          <h3 className="text-[15px] text-foreground flex items-center gap-2" style={{ fontWeight: 590 }}>
            <Icon icon="solar:quote-up-square-bold-duotone" width={18} height={18} className="text-[#5A8B58]" />
            Mindful Mantra
          </h3>
          <p className="whisper text-[17px] leading-relaxed" style={{ fontStyle: 'italic', color: 'var(--foreground)' }}>
            &ldquo;Quality is not an act, it is a habit. Breathe into the complexity, exhale the solutions.&rdquo;
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Icon icon="solar:leaf-bold-duotone" width={14} height={14} className="text-[#5A8B58]" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>
              Daily Wisdom
            </span>
          </div>
        </div>

        <div className="page-panel-muted p-6 space-y-4">
          <h3 className="text-[15px] text-foreground" style={{ fontWeight: 590 }}>Soundscapes</h3>
          <div className="grid grid-cols-2 gap-3">
            {SOUNDSCAPES.map((s) => {
              const isActiveSound = sound === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSound(isActiveSound ? 'none' : s.id)}
                  className={`p-3 rounded-[10px] border flex items-center gap-2 transition-colors ${
                    isActiveSound
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-border/80'
                  }`}
                  aria-pressed={isActiveSound}
                >
                  <Icon
                    icon={s.icon}
                    width={16}
                    height={16}
                    className={isActiveSound ? 'text-primary' : ''}
                  />
                  <span className="text-[12px]" style={{ fontWeight: 510 }}>{s.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
