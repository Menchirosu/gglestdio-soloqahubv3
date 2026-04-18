import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@iconify/react';

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  return { toast, showToast };
}

export function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <AnimatePresence>
      <motion.div
        key={message}
        initial={{ opacity: 0, y: 16, x: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-[12px] px-4 py-3 shadow-[0_4px_24px_rgba(26,23,20,0.18)] ${
          type === 'success'
            ? 'bg-foreground text-background'
            : 'bg-destructive text-white'
        }`}
      >
        <Icon
          icon={type === 'success' ? 'solar:check-circle-bold-duotone' : 'solar:close-circle-bold-duotone'}
          width={16} height={16}
          className="shrink-0"
        />
        <p className="text-[13px] max-w-[260px]" style={{ fontWeight: 590 }}>{message}</p>
      </motion.div>
    </AnimatePresence>
  );
}
