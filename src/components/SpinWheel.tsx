import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCw } from 'lucide-react';
import { updateCurrentPresenter } from '../firebase';

interface Member {
  name: string;
  photoURL?: string;
  uid?: string;
}

interface SpinWheelProps {
  members: Member[];
  onWinner?: (winner: Member) => void;
}

const WHEEL_COLORS = ['#D97706', '#B45309', '#FEF3C7', '#92400E', '#FDE68A'];

export function SpinWheel({ members, onWinner }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Member | null>(null);
  const controls = useAnimation();
  const wheelRef = useRef<SVGSVGElement>(null);

  const totalMembers = members.length;
  const segmentAngle = 360 / totalMembers;

  const spin = async () => {
    if (isSpinning || totalMembers === 0) return;

    setIsSpinning(true);
    setWinner(null);

    // Randomize spin: at least 5 full rotations + random angle
    const extraRotations = 5 + Math.floor(Math.random() * 5);
    const randomAngle = Math.floor(Math.random() * 360);
    const totalRotation = extraRotations * 360 + randomAngle;

    await controls.start({
      rotate: totalRotation,
      transition: {
        duration: 5,
        ease: [0.15, 0, 0.15, 1], // Custom cubic-bezier for fast start and slow stop
      },
    });

    // Calculate winner
    // The pointer is at the top (0 degrees).
    // The wheel rotates clockwise.
    // The angle we landed on is totalRotation % 360.
    // However, the wheel's 0 degree is usually the right side in SVG coordinate systems if not adjusted.
    // Let's assume we draw segments starting from the top.
    
    const finalAngle = totalRotation % 360;
    // Since the wheel rotates clockwise, the "top" of the wheel moves clockwise.
    // The segment that ends up at the top is the one that was at (360 - finalAngle) initially.
    const winningIndex = Math.floor(((360 - finalAngle) % 360) / segmentAngle);
    const selectedWinner = members[winningIndex];

    setWinner(selectedWinner);
    setIsSpinning(false);

    if (onWinner) onWinner(selectedWinner);
    
    // Save to Firestore
    await updateCurrentPresenter({
      name: selectedWinner.name,
      photoURL: selectedWinner.photoURL,
      uid: selectedWinner.uid
    });
  };

  // Reset rotation if members change significantly (optional, but good for stability)
  useEffect(() => {
    controls.set({ rotate: 0 });
    setWinner(null);
  }, [members.length, controls]);

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-8">
      <div className="relative w-80 h-80">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10">
          <div className="w-8 h-8 bg-on-surface rotate-45 rounded-sm shadow-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-primary rotate-0 rounded-sm"></div>
          </div>
        </div>

        {/* Wheel */}
        <motion.svg
          ref={wheelRef}
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-2xl"
          animate={controls}
          initial={{ rotate: 0 }}
        >
          <circle cx="50" cy="50" r="48" fill="var(--border)" stroke="var(--foreground)" strokeWidth="1" />
          
          {members.map((member, i) => {
            const startAngle = i * segmentAngle - 90; // -90 to start from top
            const endAngle = (i + 1) * segmentAngle - 90;
            
            const x1 = 50 + 45 * Math.cos((Math.PI * startAngle) / 180);
            const y1 = 50 + 45 * Math.sin((Math.PI * startAngle) / 180);
            const x2 = 50 + 45 * Math.cos((Math.PI * endAngle) / 180);
            const y2 = 50 + 45 * Math.sin((Math.PI * endAngle) / 180);
            
            const largeArcFlag = segmentAngle > 180 ? 1 : 0;
            const pathData = `M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            
            const textAngle = startAngle + segmentAngle / 2;
            const tx = 50 + 30 * Math.cos((Math.PI * textAngle) / 180);
            const ty = 50 + 30 * Math.sin((Math.PI * textAngle) / 180);

            return (
              <g key={member.uid || member.name}>
                <path
                  d={pathData}
                  fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                  stroke="var(--foreground)"
                  strokeWidth="0.5"
                  className={winner?.name === member.name ? 'brightness-110' : ''}
                />
                <text
                  x={tx}
                  y={ty}
                  fill={i % WHEEL_COLORS.length === 2 || i % WHEEL_COLORS.length === 4 ? 'var(--foreground)' : '#FFFFFF'}
                  fontSize="3"
                  fontWeight="bold"
                  textAnchor="middle"
                  transform={`rotate(${textAngle + 90}, ${tx}, ${ty})`}
                  className="pointer-events-none"
                >
                  {member.name.split(' ')[0]}
                </text>
              </g>
            );
          })}
          
          <circle cx="50" cy="50" r="5" fill="var(--foreground)" />
          <circle cx="50" cy="50" r="2" fill="var(--background)" />
        </motion.svg>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={spin}
          disabled={isSpinning}
          className={`px-8 py-3 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/20 flex items-center gap-2 transition-all active:scale-95 ${
            isSpinning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
          }`}
        >
          <RefreshCw size={20} className={isSpinning ? 'animate-spin' : ''} />
          {isSpinning ? 'Spinning...' : 'Spin the Wheel'}
        </button>

        <AnimatePresence>
          {winner && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center gap-4 animate-bounce"
            >
              <div className="p-2 bg-primary text-white rounded-full">
                <Trophy size={20} />
              </div>
              <p className="text-primary font-bold">
                🎯 This Week's Presenter: <span className="underline">{winner.name}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
