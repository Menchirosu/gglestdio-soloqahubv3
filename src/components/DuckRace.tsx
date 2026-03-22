import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap } from 'lucide-react';

export function DuckRace() {
  const [raceActive, setRaceActive] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [ducks, setDucks] = useState([
    { id: 1, name: 'Manual Manny', progress: 0, color: 'bg-yellow-400' },
    { id: 2, name: 'Auto Annie', progress: 0, color: 'bg-blue-400' },
    { id: 3, name: 'API Arnie', progress: 0, color: 'bg-green-400' },
    { id: 4, name: 'Load Larry', progress: 0, color: 'bg-red-400' },
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout | number;
    if (raceActive) {
      interval = setInterval(() => {
        setDucks(prev => {
          const newDucks = prev.map(d => ({
            ...d,
            progress: d.progress + Math.random() * 5
          }));
          const winnerDuck = newDucks.find(d => d.progress >= 100);
          if (winnerDuck) {
            setWinner(winnerDuck.name);
            setRaceActive(false);
          }
          return newDucks;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [raceActive]);

  const startRace = () => {
    setDucks(d => d.map(duck => ({ ...duck, progress: 0 })));
    setWinner(null);
    setRaceActive(true);
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold font-headline">The Great Duck Race</h3>
          <p className="text-xs text-outline font-medium">Testing speed, one waddle at a time.</p>
        </div>
        <button 
          onClick={startRace}
          disabled={raceActive}
          className="px-6 py-2 bg-secondary text-white rounded-full text-xs font-bold shadow-lg shadow-secondary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {raceActive ? 'Racing...' : 'Start Race'}
        </button>
      </div>

      <div className="space-y-6">
        {ducks.map((duck) => (
          <div key={duck.id} className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-outline">
              <span>{duck.name}</span>
              <span>{Math.min(100, Math.round(duck.progress))}%</span>
            </div>
            <div className="h-4 bg-surface-container-low rounded-full overflow-hidden relative">
              <motion.div 
                className={`absolute top-0 left-0 h-full ${duck.color} rounded-full`}
                animate={{ width: `${Math.min(100, duck.progress)}%` }}
                transition={{ type: 'spring', bounce: 0 }}
              />
              <motion.div 
                className="absolute top-1/2 -translate-y-1/2 -ml-2 z-10"
                animate={{ left: `${Math.min(100, duck.progress)}%` }}
                transition={{ type: 'spring', bounce: 0 }}
              >
                🦆
              </motion.div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {winner && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-4 bg-secondary/10 rounded-xl flex items-center gap-4 border border-secondary/20"
          >
            <div className="p-2 bg-secondary text-white rounded-lg">
              <Zap size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">We have a winner!</p>
              <p className="text-sm font-bold">{winner} takes the gold!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
