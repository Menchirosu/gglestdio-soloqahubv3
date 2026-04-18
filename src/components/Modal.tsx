import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@iconify/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  hideHeader?: boolean;
}

export function Modal({ isOpen, onClose, title, children, hideHeader = false }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-card rounded-[20px] shadow-2xl border border-border overflow-hidden"
          >
            {!hideHeader && (
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-[16px] text-foreground" style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground rounded-[6px] transition-colors"
                >
                  <Icon icon="solar:close-bold" width={20} height={20} />
                </button>
              </div>
            )}
            <div className={`p-8 max-h-[70vh] overflow-y-auto scrollbar-hide ${hideHeader ? 'pt-12' : ''}`}>
              {hideHeader && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground rounded-[6px] transition-colors z-10"
                >
                  <Icon icon="solar:close-bold" width={20} height={20} />
                </button>
              )}
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
