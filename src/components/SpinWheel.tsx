import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw } from 'lucide-react';
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

// Linear palette: alternating indigo + cool dark
const SEGMENT_COLORS = [
  { fill: '#7170ff', text: '#ffffff' },
  { fill: '#252633', text: '#9090c0' },
  { fill: '#5e6ad2', text: '#ffffff' },
  { fill: '#1c1d28', text: '#8888b8' },
  { fill: '#4a4abf', text: '#ffffff' },
  { fill: '#22232f', text: '#9090b8' },
  { fill: '#3d3daa', text: '#ffffff' },
  { fill: '#2a2b38', text: '#8888b5' },
];

function shiftColor(hex: string, amount: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
  return `rgb(${r},${g},${b})`;
}

function drawWheel(
  canvas: HTMLCanvasElement,
  members: Member[],
  winnerIdx: number | null
): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssSize = canvas.clientWidth || 320;
  canvas.width = cssSize * dpr;
  canvas.height = cssSize * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const size = cssSize;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;
  const n = members.length;
  if (n === 0) return;
  const segAngle = (2 * Math.PI) / n;

  // Soft indigo glow behind wheel
  const glowGrad = ctx.createRadialGradient(cx, cy, outerR * 0.6, cx, cy, outerR + 20);
  glowGrad.addColorStop(0, 'rgba(113,112,255,0.18)');
  glowGrad.addColorStop(1, 'rgba(113,112,255,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, outerR + 20, 0, Math.PI * 2);
  ctx.fillStyle = glowGrad;
  ctx.fill();

  // --- Segments ---
  for (let i = 0; i < n; i++) {
    const startA = -Math.PI / 2 + i * segAngle;
    const endA = startA + segAngle;
    const midA = startA + segAngle / 2;
    const col = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
    const isWinner = winnerIdx === i;

    // Segment path
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startA, endA);
    ctx.closePath();

    if (isWinner) {
      // Winner: bright fill
      ctx.fillStyle = shiftColor(col.fill, 55);
    } else {
      // Radial gradient: bright at center → base color → darker at edge
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
      rg.addColorStop(0, shiftColor(col.fill, 45));
      rg.addColorStop(0.55, col.fill);
      rg.addColorStop(1, shiftColor(col.fill, -25));
      ctx.fillStyle = rg;
    }
    ctx.fill();

    // Divider line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startA, endA);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Member name
    const textR = outerR * 0.62;
    const tx = cx + textR * Math.cos(midA);
    const ty = cy + textR * Math.sin(midA);
    const label = members[i].name.split(' ')[0];
    const fontSize = Math.max(8, Math.min(13, (size * 0.78) / (n * 1.6)));

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(midA + Math.PI / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = isWinner ? '#ffffff' : col.text;
    ctx.font = `700 ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // --- Tick marks on rim ---
  const ticks = n * 3;
  for (let t = 0; t < ticks; t++) {
    const a = (t / ticks) * Math.PI * 2;
    const r1 = outerR - 5;
    const r2 = outerR - 1;
    ctx.beginPath();
    ctx.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
    ctx.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a));
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // --- Outer metallic rim ---
  // Dark outer border
  ctx.beginPath();
  ctx.arc(cx, cy, outerR + 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Metallic sheen (light top-left, dark bottom-right)
  const rimSheen = ctx.createLinearGradient(cx - outerR, cy - outerR, cx + outerR, cy + outerR);
  rimSheen.addColorStop(0, 'rgba(255,255,255,0.28)');
  rimSheen.addColorStop(0.35, 'rgba(255,255,255,0.06)');
  rimSheen.addColorStop(0.65, 'rgba(0,0,0,0.06)');
  rimSheen.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = rimSheen;
  ctx.lineWidth = 4;
  ctx.stroke();

  // --- Hub shadow ---
  const hubR = outerR * 0.1;
  ctx.beginPath();
  ctx.arc(cx + 1.5, cy + 2, hubR + 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill();

  // Hub metallic fill
  const hubGrad = ctx.createRadialGradient(
    cx - hubR * 0.35,
    cy - hubR * 0.35,
    hubR * 0.05,
    cx, cy, hubR
  );
  hubGrad.addColorStop(0, '#e8e8ff');
  hubGrad.addColorStop(0.35, '#9090cc');
  hubGrad.addColorStop(0.75, '#4040a0');
  hubGrad.addColorStop(1, '#1a1a50');
  ctx.beginPath();
  ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.fill();

  // Hub specular highlight
  ctx.beginPath();
  ctx.arc(cx - hubR * 0.3, cy - hubR * 0.35, hubR * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fill();
}

export function SpinWheel({ members, onWinner }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Member | null>(null);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const controls = useAnimation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const totalRotRef = useRef(0);

  // Redraw on mount and when member list changes
  useEffect(() => {
    totalRotRef.current = 0;
    setWinner(null);
    setWinnerIdx(null);
    controls.set({ rotate: 0 });
    const id = requestAnimationFrame(() => {
      if (canvasRef.current) drawWheel(canvasRef.current, members, null);
    });
    return () => cancelAnimationFrame(id);
  }, [members.length, controls]);

  // Redraw when winner is determined
  useEffect(() => {
    if (canvasRef.current && !isSpinning) {
      drawWheel(canvasRef.current, members, winnerIdx);
    }
  }, [winnerIdx, isSpinning, members]);

  const spin = async () => {
    if (isSpinning || members.length === 0) return;
    setIsSpinning(true);
    setWinner(null);
    setWinnerIdx(null);
    if (canvasRef.current) drawWheel(canvasRef.current, members, null);

    const extraRotations = 6 + Math.floor(Math.random() * 5);
    const randomAngle = Math.floor(Math.random() * 360);
    totalRotRef.current += extraRotations * 360 + randomAngle;

    await controls.start({
      rotate: totalRotRef.current,
      transition: {
        duration: 5.5,
        ease: [0.12, 0, 0.08, 1], // fast start, very slow stop
      },
    });

    const finalAngle = ((totalRotRef.current % 360) + 360) % 360;
    const segAngle = 360 / members.length;
    const wIdx = Math.floor(((360 - finalAngle + 360) % 360) / segAngle) % members.length;
    const selectedWinner = members[wIdx];

    setWinnerIdx(wIdx);
    setWinner(selectedWinner);
    setIsSpinning(false);

    if (onWinner) onWinner(selectedWinner);
    await updateCurrentPresenter({
      name: selectedWinner.name,
      photoURL: selectedWinner.photoURL,
      uid: selectedWinner.uid,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-8">

      {/* 3D scene container */}
      <div className="relative w-80 h-80" style={{ perspective: '1200px' }}>

        {/* Ground shadow (indigo tint) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            bottom: '-8px',
            width: '80%',
            height: '28px',
            background: 'radial-gradient(ellipse, rgba(113,112,255,0.22) 0%, transparent 70%)',
            filter: 'blur(12px)',
          }}
        />

        {/* Tilt wrapper — static rotateX for 3D depth */}
        <div
          className="relative w-full h-full"
          style={{ transform: 'rotateX(16deg)', transformOrigin: 'center bottom' }}
        >
          {/* Metallic pointer — outside the spinning div so it stays fixed */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2.5 z-20 pointer-events-none">
            <svg width="22" height="30" viewBox="0 0 22 30" fill="none">
              {/* Drop shadow shape */}
              <polygon points="11,28 1,5 21,5" fill="rgba(0,0,0,0.35)" transform="translate(1.5,2)" />
              <defs>
                <linearGradient id="ptr-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#9898ee" />
                  <stop offset="42%" stopColor="#f0f0ff" />
                  <stop offset="100%" stopColor="#4848b8" />
                </linearGradient>
              </defs>
              {/* Pointer body */}
              <polygon points="11,27 1,4 21,4" fill="url(#ptr-grad)" />
              {/* Inner highlight */}
              <polygon points="11,22 5,8 17,8" fill="rgba(255,255,255,0.22)" />
            </svg>
          </div>

          {/* Spinning wheel */}
          <motion.div animate={controls} className="w-full h-full">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ display: 'block' }}
            />
          </motion.div>
        </div>
      </div>

      {/* Spin button + winner */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={spin}
          disabled={isSpinning || members.length === 0}
          className={`px-7 py-2.5 bg-primary text-white text-sm font-[590] rounded-[6px] flex items-center gap-2 transition-all
            ${isSpinning || members.length === 0
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-primary/90 active:scale-[0.97]'
            }`}
        >
          <RotateCcw size={15} className={isSpinning ? 'animate-spin' : ''} />
          {isSpinning ? 'Spinning...' : 'Spin the Wheel'}
        </button>

        <AnimatePresence>
          {winner && (
            <motion.div
              key={winner.name}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="bg-primary/10 border border-primary/20 px-5 py-3 rounded-[8px] flex items-center gap-3"
            >
              <div className="p-1.5 bg-primary/20 rounded-[6px]">
                <Trophy size={15} className="text-primary" />
              </div>
              <p className="text-sm text-on-surface font-[590]">
                This week's presenter:{' '}
                <span className="text-primary">{winner.name}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
