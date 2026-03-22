import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, Volume2, Quote, Droplets, Waves, Flame, Leaf } from 'lucide-react';

export function FocusZoneScreen() {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [sound, setSound] = useState('none');

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

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-16 py-8">
      <section className="text-center space-y-4">
        <h2 className="text-5xl font-black tracking-tighter font-headline">The Focus Zone</h2>
        <p className="text-tertiary text-lg">Silence the noise. Sharpen the mind. Ship the quality.</p>
      </section>

      <div className="flex flex-col items-center justify-center gap-12">
        <div className="relative w-80 h-80 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full border-8 border-surface-container-low ${isActive ? 'breathing-circle' : ''}`}></div>
          <div className="text-center relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-tertiary mb-2">{mode} session</p>
            <h3 className="text-7xl font-black font-mono tracking-tighter">{formatTime(timeLeft)}</h3>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={resetTimer}
            className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container-high transition-all"
          >
            <RefreshCw size={24} />
          </button>
          <button 
            onClick={toggleTimer}
            className="w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
          >
            {isActive ? <div className="w-6 h-6 bg-white rounded-sm"></div> : <Play size={32} fill="currentColor" />}
          </button>
          <button className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container-high transition-all">
            <Volume2 size={24} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12">
        <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm space-y-6">
          <h4 className="text-lg font-bold flex items-center gap-2 font-headline">
            <Quote size={20} className="text-secondary" />
            Mindful Mantra
          </h4>
          <p className="text-xl font-medium italic text-on-surface-variant leading-relaxed">
            "Quality is not an act, it is a habit. Breathe into the complexity, exhale the solutions."
          </p>
          <div className="flex items-center gap-3 pt-4">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <Leaf size={20} />
            </div>
            <span className="text-xs font-bold text-tertiary uppercase tracking-widest">Daily Wisdom</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm space-y-6">
          <h4 className="text-lg font-bold font-headline">Soundscapes</h4>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'rain', name: 'Rainfall', icon: Droplets, color: 'text-blue-400' },
              { id: 'waves', name: 'Ocean Waves', icon: Waves, color: 'text-cyan-400' },
              { id: 'fire', name: 'Fireplace', icon: Flame, color: 'text-orange-400' },
              { id: 'forest', name: 'Forest', icon: Leaf, color: 'text-emerald-400' },
            ].map((s) => (
              <button 
                key={s.id}
                onClick={() => setSound(s.id)}
                className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                  sound === s.id ? 'border-primary bg-primary/5' : 'border-surface-container-high hover:border-outline-variant'
                }`}
              >
                <s.icon size={20} className={s.color} />
                <span className="text-sm font-bold">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
