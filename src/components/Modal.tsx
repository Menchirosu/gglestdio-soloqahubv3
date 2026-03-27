import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

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
            className="relative w-full max-w-2xl bg-surface rounded-3xl shadow-2xl border border-outline-variant/10 overflow-hidden"
          >
            {!hideHeader && (
              <div className="px-8 py-6 border-b border-outline-variant/10 flex items-center justify-between">
                <h3 className="text-xl font-bold font-headline">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <div className={`p-8 max-h-[70vh] overflow-y-auto scrollbar-hide ${hideHeader ? 'pt-12' : ''}`}>
              {hideHeader && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 hover:bg-surface-container-low rounded-full transition-colors z-10"
                >
                  <X size={20} />
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
