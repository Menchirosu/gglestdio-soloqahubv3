import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bug, Lightbulb, BookOpen, AlertTriangle, Search, X } from 'lucide-react';
import { BugStory, Tip, Proposal, Concern, Screen } from '../types';

interface SearchResult {
  id: string;
  title: string;
  type: 'bug' | 'tip' | 'proposal' | 'concern';
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
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-auto" 
            onClick={onClose} 
          />
          
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden pointer-events-auto max-h-[400px] flex flex-col"
          >
          <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-primary" />
              <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface">Search Results</h4>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-surface-container-high rounded-full transition-colors">
              <X size={14} className="text-outline" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {results.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-outline italic">No results found for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => onResultClick(result)}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className={`p-2 rounded-lg ${
                      result.type === 'bug' ? 'bg-error/10 text-error' :
                      result.type === 'tip' ? 'bg-primary/10 text-primary' :
                      result.type === 'proposal' ? 'bg-secondary/10 text-secondary' :
                      'bg-tertiary/10 text-tertiary'
                    }`}>
                      {result.type === 'bug' && <Bug size={16} />}
                      {result.type === 'tip' && <Lightbulb size={16} />}
                      {result.type === 'proposal' && <BookOpen size={16} />}
                      {result.type === 'concern' && <AlertTriangle size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                        {result.title}
                      </p>
                      <p className="text-[10px] text-outline uppercase tracking-widest font-bold mt-0.5">
                        {result.type === 'bug' ? 'Bug Story' :
                         result.type === 'tip' ? 'Tip & Trick' :
                         result.type === 'proposal' ? 'Proposal' :
                         'Concern'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {results.length > 0 && (
            <div className="p-3 text-center bg-surface-container-low border-t border-outline-variant/10">
              <p className="text-[10px] text-outline font-medium">
                Showing {results.length} matching items
              </p>
            </div>
          )}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
}
