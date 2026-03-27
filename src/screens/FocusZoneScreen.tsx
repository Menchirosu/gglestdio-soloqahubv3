import React, { useState, useEffect, useRef } from 'react';
import { Play, RefreshCw, Volume2, VolumeX, Quote, Droplets, Waves, Flame, Leaf, Wind } from 'lucide-react';
import { BreathingGuide } from '../components/BreathingGuide';
import { SoundGenerator } from '../services/soundGenerator';

export function FocusZoneScreen() {
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

    // Stop audio if timer is inactive or no sound is selected
    if (!isActive || sound === 'none') {
      generator.stop();
      return;
    }

    generator.play(sound);
    generator.setMuted(isMuted);

    return () => {
      // Cleanup handled by dependencies and unmount effect
    };
  }, [sound, isActive]);

  // Separate effect for muting to avoid restarting the audio
  useEffect(() => {
    if (soundGeneratorRef.current) {
      soundGeneratorRef.current.setMuted(isMuted);
    }
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundGeneratorRef.current) {
        soundGeneratorRef.current.stop();
      }
    };
  }, []);

  const toggleTimer = () => setIsActive(!isActive);
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
      <section className="text-center space-y-2">
        <h2 className="text-4xl font-black tracking-tighter font-headline">The Focus Zone</h2>
        <p className="text-tertiary text-base">Silence the noise. Sharpen the mind. Ship the quality.</p>
      </section>

      <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-outline-variant/10 max-w-2xl mx-auto flex flex-col items-center justify-center gap-6">
        {/* SVG Circular Progress Ring */}
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
                <circle cx="112" cy="112" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-surface-container-low" />
                <circle
                  cx="112" cy="112" r={radius} fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={`transition-all duration-1000 ${isLow ? 'text-amber-500' : 'text-primary'}`}
                />
              </svg>
            );
          })()}
          <div className="text-center relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-tertiary mb-1">{mode} session</p>
            <h3 className="text-6xl font-black font-mono tracking-tighter">{formatTime(timeLeft)}</h3>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={resetTimer}
            aria-label="Reset timer"
            className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container-high transition-all"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={toggleTimer}
            aria-label={isActive ? 'Pause timer' : 'Start timer'}
            className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
          >
            {isActive ? <div className="w-5 h-5 bg-white rounded-sm"></div> : <Play size={28} fill="currentColor" />}
          </button>
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-error/10 text-error' : 'bg-surface-container-low text-outline hover:text-primary hover:bg-surface-container-high'
            }`}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>

      {/* Breathing Guide Section */}
      <section className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Wind size={20} />
          </div>
          <h4 className="text-xl font-black font-headline">Breathing Guide</h4>
        </div>
        <BreathingGuide isActive={isActive} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm space-y-4">
          <h4 className="text-base font-bold flex items-center gap-2 font-headline">
            <Quote size={18} className="text-secondary" />
            Mindful Mantra
          </h4>
          <p className="text-lg font-medium italic text-on-surface-variant leading-relaxed">
            "Quality is not an act, it is a habit. Breathe into the complexity, exhale the solutions."
          </p>
          <div className="flex items-center gap-3 pt-2">
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <Leaf size={16} />
            </div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Daily Wisdom</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm space-y-4">
          <h4 className="text-base font-bold font-headline">Soundscapes</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'rain', name: 'Rainfall', icon: Droplets, color: 'text-blue-400' },
              { id: 'waves', name: 'Ocean Waves', icon: Waves, color: 'text-cyan-400' },
              { id: 'fire', name: 'Fireplace', icon: Flame, color: 'text-orange-400' },
              { id: 'forest', name: 'Forest', icon: Leaf, color: 'text-emerald-400' },
            ].map((s) => (
              <button 
                key={s.id}
                onClick={() => setSound(sound === s.id ? 'none' : s.id)}
                className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                  sound === s.id ? 'border-primary bg-primary/5' : 'border-surface-container-high hover:border-outline-variant'
                }`}
              >
                <s.icon size={16} className={s.color} />
                <span className="text-xs font-bold">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
