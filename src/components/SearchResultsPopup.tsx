import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@iconify/react';
import { Screen } from '../types';

interface SearchResult {
  id: string;
  title: string;
  type: 'bug' | 'tip' | 'proposal';
  screen: Screen;
}

interface SearchResultsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  results: SearchResult[];
  onResultClick: (result: SearchResult) => void;
  searchQuery: string;
}

export function SearchResultsPopup({ isOpen, onClose, results, onResultClick, searchQuery }: SearchResultsPopupProps) {
  return (
    <AnimatePresence>
      {isOpen && searchQuery && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute top-full left-0 right-0 mt-2 bg-card rounded-[12px] shadow-2xl border border-border overflow-hidden z-50 max-h-[400px] flex flex-col"
        >
          <div className="p-3 border-b border-border flex items-center justify-between bg-secondary/30">
            <div className="flex items-center gap-2">
              <Icon icon="solar:magnifer-bold-duotone" width={13} height={13} className="text-primary" />
              <h4 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>Search Results</h4>
            </div>
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-[4px] transition-colors">
              <Icon icon="solar:close-bold" width={13} height={13} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {results.length === 0 ? (
              <div className="p-8 text-center">
                <p className="whisper text-[14px]">No results for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="py-1">
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => onResultClick(result)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors text-left group"
                  >
                    <div className={`p-1.5 rounded-[6px] shrink-0 ${
                      result.type === 'bug' ? 'bg-destructive/10 text-destructive' :
                      result.type === 'tip' ? 'bg-primary/10 text-primary' :
                      'bg-secondary/60 text-muted-foreground'
                    }`}>
                      <Icon
                        icon={
                          result.type === 'bug' ? 'solar:bug-bold-duotone' :
                          result.type === 'tip' ? 'solar:lightbulb-bold-duotone' :
                          'solar:book-bold-duotone'
                        }
                        width={14} height={14}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground truncate group-hover:text-primary transition-colors" style={{ fontWeight: 510 }}>
                        {result.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] mt-0.5" style={{ fontWeight: 600 }}>
                        {result.type === 'bug' ? 'Bug Story' : result.type === 'tip' ? 'Tip' : 'Knowledge Post'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="p-2.5 text-center bg-secondary/20 border-t border-border">
              <p className="text-[10px] text-muted-foreground" style={{ fontWeight: 500 }}>
                {results.length} matching item{results.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
