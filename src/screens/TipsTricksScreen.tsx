import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, Edit3, Trash2, X, Lightbulb, ArrowUpDown, Heart, Calendar, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tip } from '../types';
import { useAuth } from '../AuthContext';
import { timeAgo } from '../utils/timeAgo';

interface TipsTricksProps {
  tips: Tip[];
  onAddTip: () => void;
  onDeleteTip: (tipId: string) => void;
  onEditTip: (tip: Tip) => void;
  onReact: (tipId: string, emoji: string, currentUserName?: string) => void;
  searchQuery: string;
  selectedItemId?: string | null;
  onClearSelection?: () => void;
}

export function TipsTricksScreen({ tips, onAddTip, onDeleteTip, onEditTip, onReact, searchQuery, selectedItemId, onClearSelection }: TipsTricksProps) {
  const { profile } = useAuth();
  const [activeCat, setActiveCat] = useState('All Resources');
  const [currentPage, setCurrentPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedTipId, setSelectedTipId] = useState<string | null>(null);
  const selectedTip = tips.find(t => t.id === selectedTipId) ?? null;

  const categories = ['All Resources', 'Manual Testing', 'Automation', 'API Testing', 'Test Data', 'Reporting', 'Communication'];
  
  const itemsPerPage = 6;
  
  const filteredTips = tips.filter(t => {
    if (selectedItemId) return t.id === selectedItemId;
    const matchesCat = activeCat === 'All Resources' || t.cat === activeCat;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  }).sort((a, b) => {
    const timeA = a.createdAt?.seconds || new Date(a.date || a.time).getTime();
    const timeB = b.createdAt?.seconds || new Date(b.date || b.time).getTime();
    return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
  });

  const totalPages = Math.ceil(filteredTips.length / itemsPerPage);
  const paginatedTips = filteredTips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-10">
      <section className="page-hero flex flex-col gap-6 px-6 py-6 md:flex-row md:items-end md:justify-between md:px-8">
        <div className="max-w-2xl">
          <span className="page-kicker mb-2 block">Knowledge Base</span>
          <h1 className="page-title mb-3">Tips & Tricks</h1>
          <p className="page-subtitle">Practical notes, shortcuts, and working habits from people solving quality problems on their own.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 rounded-[8px] border border-border/80 bg-input/80 px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
              style={{ fontWeight: 510 }}
            >
              <ArrowUpDown size={16} />
              {sortBy === 'newest' ? 'Newest First' : 'Oldest First'}
            </button>
            
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-surface-container-highest border border-outline-variant/20 rounded-[8px] shadow-2xl z-20 py-2 overflow-hidden">
                  <button 
                    onClick={() => {
                      setSortBy('newest');
                      setIsSortOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold transition-colors flex items-center gap-3 ${sortBy === 'newest' ? 'text-primary bg-primary/10' : 'text-on-surface hover:bg-surface-container-low'}`}
                  >
                    Newest First
                  </button>
                  <button 
                    onClick={() => {
                      setSortBy('oldest');
                      setIsSortOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold transition-colors flex items-center gap-3 ${sortBy === 'oldest' ? 'text-primary bg-primary/10' : 'text-on-surface hover:bg-surface-container-low'}`}
                  >
                    Oldest First
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={onAddTip}
              className="flex items-center gap-2 rounded-[8px] bg-primary px-4 py-2 text-[13px] text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              style={{ fontWeight: 510 }}
            >
              <PlusCircle size={14} />
              Contribute Tip
            </button>
          </div>
        </div>
      </section>

      <section className="page-toolbar overflow-x-auto px-4 py-3 scrollbar-hide">
        <div className="flex gap-3 min-w-max">
          {selectedItemId && (
            <button 
              onClick={() => {
                if (onClearSelection) onClearSelection();
              }}
              className="flex items-center gap-2 rounded-[9999px] border border-border bg-input px-4 py-1.5 text-[12px] text-foreground transition-colors hover:bg-surface-container-low"
              style={{ fontWeight: 510 }}
            >
              <X size={14} />
              Clear Search
            </button>
          )}
          {categories.map((cat, idx) => (
            <button 
              key={idx} 
              onClick={() => setActiveCat(cat)}
              className={`px-4 py-1.5 rounded-[6px] text-xs transition-all ${
                activeCat === cat
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
              style={{ fontWeight: activeCat === cat ? 590 : 510 }}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 items-stretch">
        <AnimatePresence mode="wait" key={`${activeCat}-${currentPage}`}>
        {paginatedTips.map((tip, idx) => (
          <motion.article
            key={tip.id}
            onClick={() => setSelectedTipId(tip.id)}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, delay: idx * 0.06, ease: [0.25, 0, 0, 1] }}
            whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(26,23,20,0.08)' }}
            className="page-panel p-7 flex flex-col h-full group relative overflow-hidden cursor-pointer"
          >
            <div className="mb-6">
              <span className="inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-secondary/30 text-muted-foreground">
                {tip.cat}
              </span>
            </div>
            <h3 className="text-2xl font-bold leading-tight mb-4 group-hover:text-primary transition-colors text-foreground">
              {tip.title}
            </h3>
            <p className="leading-relaxed text-sm mb-6 line-clamp-3 text-muted-foreground">
              {tip.desc}
            </p>
            <div className="p-4 rounded-lg mb-8 italic text-sm border-l-4 bg-secondary/10 border-border/50 text-muted-foreground">
              <span className="font-bold block not-italic text-xs mb-1 text-foreground">Scenario:</span>
              "{tip.scenario}"
            </div>
            <div className="mt-auto pt-6 border-t border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-primary/10 text-primary">
                  {tip.author.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-xs font-bold text-foreground">{tip.author}</span>
              </div>
              <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onReact(tip.id, '❤️', profile?.displayName)}
                  className="flex items-center gap-1 transition-colors text-muted-foreground/60 hover:text-destructive"
                >
                  <Heart size={15} className={(tip.reactions?.['❤️'] ?? 0) > 0 ? 'fill-destructive text-destructive' : ''} />
                  <span className="text-xs font-medium">{tip.reactions?.['❤️'] || ''}</span>
                </motion.button>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {timeAgo(tip.createdAt || tip.date || tip.time)}
                </span>

                {(profile?.uid === tip.authorId || (!tip.authorId && profile?.displayName === tip.author)) && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === tip.id ? null : tip.id)}
                      className="p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    
                    {menuOpenId === tip.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setMenuOpenId(null)}
                        ></div>
                        <div className="absolute right-0 mt-1 w-32 bg-surface-container-highest border border-outline-variant/20 rounded-[8px] shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <button 
                            onClick={() => {
                              onEditTip(tip);
                              setMenuOpenId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-on-surface hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                          >
                            <Edit3 size={14} />
                            Edit Tip
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this tip?')) {
                                onDeleteTip(tip.id);
                              }
                              setMenuOpenId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-error hover:bg-error/10 transition-colors flex items-center gap-2"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.article>
        ))}
        </AnimatePresence>
      </div>

      {filteredTips.length === 0 && (
        <div className="page-empty flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-border bg-input text-muted-foreground">
            <Lightbulb size={22} strokeWidth={1.5} />
          </div>
          <div className="max-w-xs">
            <h3 className="text-[15px] text-foreground" style={{ fontWeight: 590 }}>No tips here yet</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Be the first to share what you know. Help the community grow.
            </p>
          </div>
          <button
            onClick={onAddTip}
            className="inline-flex items-center gap-2 rounded-[6px] bg-primary px-4 py-2 text-[13px] text-white transition-colors hover:bg-primary/90"
            style={{ fontWeight: 510 }}
          >
            <PlusCircle size={14} />
            Contribute a Tip
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-8">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container-high transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <span 
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition-all ${
                  currentPage === p ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {p}
              </span>
            ))}
          </div>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container-high transition-colors disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Tip Detail Modal */}
      {selectedTip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedTipId(null)}></div>
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-[12px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 border-b border-outline-variant/10 flex items-center justify-between bg-surface">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-[8px] text-primary">
                  <Lightbulb size={24} />
                </div>
                <h2 className="text-2xl font-black tracking-tight">Tip Details</h2>
              </div>
              <button 
                onClick={() => setSelectedTipId(null)}
                className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto space-y-8">
              <div className="space-y-4">
                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-black uppercase tracking-widest rounded-md">
                  {selectedTip.cat}
                </span>
                <h3 className="text-3xl font-black leading-tight text-on-surface">
                  {selectedTip.title}
                </h3>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-outline">The Insight</h4>
                <p className="text-lg text-on-surface-variant leading-relaxed font-medium">
                  {selectedTip.desc}
                </p>
              </div>

              <div className="p-6 bg-surface-container-low rounded-[8px] border-l-4 border-primary space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary">Real-World Scenario</h4>
                <p className="text-base italic text-on-surface leading-relaxed">
                  "{selectedTip.scenario}"
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-white font-black">
                    {selectedTip.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-xs font-black text-on-surface">{selectedTip.author}</p>
                    <p className="text-[10px] text-tertiary font-bold uppercase tracking-widest">Contributor</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-outline">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-on-surface">{selectedTip.date || selectedTip.time}</p>
                    <p className="text-[10px] text-tertiary font-bold uppercase tracking-widest">Posted Date</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-surface border-t border-outline-variant/10 flex items-center justify-between">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => onReact(selectedTip.id, '❤️', profile?.displayName)}
                className="flex items-center gap-2 text-outline/60 hover:text-error transition-colors"
              >
                <Heart size={18} className={(selectedTip.reactions?.['❤️'] ?? 0) > 0 ? 'fill-error text-error' : ''} />
                <span className="text-sm font-bold">{selectedTip.reactions?.['❤️'] || 0}</span>
              </motion.button>
              <button
                onClick={() => setSelectedTipId(null)}
                className="px-8 py-3 bg-primary text-white font-black rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
