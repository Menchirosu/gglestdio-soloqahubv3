import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';

interface ConfettiCelebrationProps {
  title: string;
  onDone: () => void;
}

// Linear palette confetti colors
const COLORS = ['#7170ff', '#5e6ad2', '#4a4abf', '#9998ff', '#c8c8ff', '#ffffff', '#b0b0ff'];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  rotation: number; rotSpeed: number;
  color: string;
  w: number; h: number;
}

function ConfettiCanvas({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Spawn particles from center-top spread
    const cx = canvas.width / 2;
    const particles: Particle[] = Array.from({ length: 90 }, () => {
      const spread = (Math.random() - 0.5) * canvas.width * 0.9;
      return {
        x: cx + spread * 0.3,
        y: -10 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 6,
        vy: 3 + Math.random() * 5,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        w: 5 + Math.random() * 9,
        h: 3 + Math.random() * 5,
      };
    });

    const DURATION = 2000;
    const startTime = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed > DURATION) {
        onDone();
        return;
      }

      const progress = elapsed / DURATION;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity
        p.vx *= 0.99; // air resistance
        p.rotation += p.rotSpeed;

        // Fade out in last 30%
        const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[200]"
    />
  );
}

export function ConfettiCelebration({ title, onDone }: ConfettiCelebrationProps) {
  return createPortal(
    <>
      <ConfettiCanvas onDone={onDone} />

      {/* Achievement flash card */}
      <div className="pointer-events-none fixed inset-0 z-[201] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.82, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -12 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          className="flex flex-col items-center gap-4 rounded-[12px] border border-primary/25 bg-panel px-10 py-8 shadow-2xl shadow-primary/10 text-center max-w-sm w-full"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-[8px] bg-primary/15">
            <Icon icon="solar:cup-star-bold-duotone" width={28} height={28} className="text-primary" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary" style={{ fontWeight: 590 }}>
              Achievement Unlocked
            </p>
            <p className="mt-1.5 text-base text-on-surface" style={{ fontWeight: 590 }}>
              {title}
            </p>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}
