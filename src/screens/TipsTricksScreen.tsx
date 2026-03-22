import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, Edit3, Trash2, X, Lightbulb, ArrowUpDown, Calendar, User as UserIcon } from 'lucide-react';
import { Tip } from '../types';
import { useAuth } from '../AuthContext';

interface TipsTricksProps {
  tips: Tip[];
  onAddTip: () => void;
  onDeleteTip: (tipId: string) => void;
  onEditTip: (tip: Tip) => void;
  searchQuery: string;
  selectedItemId?: string | null;
  onClearSelection?: () => void;
}

export function TipsTricksScreen({ tips, onAddTip, onDeleteTip, onEditTip, searchQuery, selectedItemId, onClearSelection }: TipsTricksProps) {
  const { profile } = useAuth();
  const [activeCat, setActiveCat] = useState('All Resources');
  const [currentPage, setCurrentPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);

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
    <div className="space-y-12">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <span className="text-xs font-bold tracking-[0.2em] text-secondary uppercase mb-3 block">Knowledge Base</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tighter mb-4 leading-none font-headline">Tips & Tricks</h1>
          <p className="text-lg text-on-surface-variant font-body leading-relaxed opacity-80">Refine your craft with architectural insights from the community. A curated collection for the solo quality engineer.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 bg-surface-container-low px-6 py-3 rounded-full text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <ArrowUpDown size={16} />
              {sortBy === 'newest' ? 'Newest First' : 'Oldest First'}
            </button>
            
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-surface-container-highest border border-outline-variant/20 rounded-2xl shadow-2xl z-20 py-2 overflow-hidden">
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
          <button 
            onClick={onAddTip}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Contribute Tip
          </button>
        </div>
      </section>

      <section className="overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-3 min-w-max">
          {selectedItemId && (
            <button 
              onClick={() => {
                if (onClearSelection) onClearSelection();
              }}
              className="px-6 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all bg-primary text-white shadow-md shadow-primary/10 flex items-center gap-2"
            >
              <X size={14} />
              Clear Search
            </button>
          )}
          {categories.map((cat, idx) => (
            <button 
              key={idx} 
              onClick={() => setActiveCat(cat)}
              className={`px-6 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all ${
                activeCat === cat 
                  ? 'bg-primary text-white shadow-md shadow-primary/10' 
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {paginatedTips.map((tip, idx) => (
          <article 
            key={tip.id} 
            onClick={() => setSelectedTip(tip)}
            className={`p-8 rounded-lg shadow-sm transition-all duration-300 flex flex-col group relative overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
              tip.highlight ? 'bg-primary text-white' : 'bg-surface-container-lowest'
            }`}
          >
            <div className="mb-6">
              <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md ${
                tip.highlight ? 'bg-white/20 backdrop-blur-sm' : 'bg-secondary-container text-on-secondary-container'
              }`}>
                {tip.cat}
              </span>
            </div>
            <h3 className={`text-2xl font-bold leading-tight mb-4 group-hover:text-primary transition-colors font-headline ${tip.highlight ? 'group-hover:text-secondary-fixed' : ''}`}>
              {tip.title}
            </h3>
            <p className={`leading-relaxed text-sm mb-6 line-clamp-3 ${tip.highlight ? 'text-white/80' : 'text-on-surface-variant'}`}>
              {tip.desc}
            </p>
            <div className={`p-4 rounded-lg mb-8 italic text-sm border-l-4 ${
              tip.highlight ? 'bg-white/10 border-white/30 text-white/90' : 'bg-surface-container-low border-secondary/30 text-tertiary'
            }`}>
              <span className={`font-bold block not-italic text-xs mb-1 ${tip.highlight ? 'text-white' : 'text-on-surface'}`}>Scenario:</span>
              "{tip.scenario}"
            </div>
            <div className={`mt-auto pt-6 border-t flex items-center justify-between ${tip.highlight ? 'border-white/10' : 'border-surface-container'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${tip.highlight ? 'bg-white/20' : 'bg-primary-container text-white'}`}>
                  {tip.author.split(' ').map(n => n[0]).join('')}
                </div>
                <span className={`text-xs font-bold ${tip.highlight ? 'text-white' : 'text-on-surface'}`}>{tip.author}</span>
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <span className={`text-[10px] font-medium uppercase tracking-wider ${tip.highlight ? 'text-white/60' : 'text-outline'}`}>
                  {tip.date || tip.time}
                </span>
                
                {(profile?.uid === tip.authorId || (!tip.authorId && profile?.displayName === tip.author)) && (
                  <div className="relative">
                    <button 
                      onClick={() => setMenuOpenId(menuOpenId === tip.id ? null : tip.id)}
                      className={`p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100 ${tip.highlight ? 'text-white/80 hover:bg-white/20' : 'text-outline hover:text-on-surface hover:bg-surface-container-high'}`}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    
                    {menuOpenId === tip.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setMenuOpenId(null)}
                        ></div>
                        <div className="absolute right-0 mt-1 w-32 bg-surface-container-highest border border-outline-variant/20 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
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
          </article>
        ))}
      </div>

      {filteredTips.length === 0 && (
        <div className="text-center py-24 bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant/20 flex flex-col items-center justify-center space-y-6">
          <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center text-primary shadow-inner">
            <Lightbulb size={40} strokeWidth={1.5} />
          </div>
          <div className="space-y-2 max-w-sm mx-auto">
            <h3 className="text-2xl font-black font-headline tracking-tight text-on-surface">No tips here yet</h3>
            <p className="text-on-surface-variant font-medium leading-relaxed opacity-70">
              Be the first to share what you know. Help the community grow by contributing your expertise.
            </p>
          </div>
          <button 
            onClick={onAddTip}
            className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-full text-sm font-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
          >
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
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedTip(null)}></div>
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 border-b border-outline-variant/10 flex items-center justify-between bg-surface">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Lightbulb size={24} />
                </div>
                <h2 className="text-2xl font-black font-headline tracking-tight">Tip Details</h2>
              </div>
              <button 
                onClick={() => setSelectedTip(null)}
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
                <h3 className="text-3xl font-black font-headline leading-tight text-on-surface">
                  {selectedTip.title}
                </h3>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-outline">The Insight</h4>
                <p className="text-lg text-on-surface-variant leading-relaxed font-medium">
                  {selectedTip.desc}
                </p>
              </div>

              <div className="p-6 bg-surface-container-low rounded-2xl border-l-4 border-primary space-y-3">
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

            <div className="p-6 bg-surface border-t border-outline-variant/10 flex justify-end">
              <button 
                onClick={() => setSelectedTip(null)}
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
