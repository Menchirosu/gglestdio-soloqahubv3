import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, Bug, BookOpen, Lightbulb, Edit3, Send, PlusCircle, MoreHorizontal, Trash2, X, Trophy } from 'lucide-react';
import { Proposal } from '../types';
import { useAuth } from '../AuthContext';
import { timeAgo } from '../utils/timeAgo';
import { SpinWheel } from '../components/SpinWheel';
import { getAllUsers, getCurrentPresenter, UserProfile } from '../firebase';

interface KnowledgeSharingProps {
  proposals: Proposal[];
  onAddProposal: () => void;
  onDeleteProposal: (proposalId: string) => void;
  onEditProposal: (proposal: Proposal) => void;
  searchQuery: string;
  selectedItemId?: string | null;
  onClearSelection?: () => void;
}


export function KnowledgeSharingScreen({ proposals, onAddProposal, onDeleteProposal, onEditProposal, searchQuery, selectedItemId, onClearSelection }: KnowledgeSharingProps) {
  const { profile } = useAuth();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [realUsers, setRealUsers] = useState<UserProfile[]>([]);
  const [currentPresenter, setCurrentPresenter] = useState<any>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const users = await getAllUsers();
      setRealUsers(users);
    };
    fetchUsers();

    const unsubscribe = getCurrentPresenter(setCurrentPresenter);
    return () => unsubscribe();
  }, []);

  const allMembers = realUsers.map(u => ({ name: u.displayName, role: u.role === 'admin' ? 'Admin' : 'Solo QA Architect', photoURL: u.photoURL, uid: u.uid }));

  const filteredProposals = proposals.filter(p => {
    if (selectedItemId) return p.id === selectedItemId;
    return p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.scope.toLowerCase().includes(searchQuery.toLowerCase());
  });

return (
    <div className="space-y-10">
      <header className="page-hero px-6 py-6 md:px-8">
        <p className="page-kicker">Shared Knowledge</p>
        <h1 className="page-title mt-3">Knowledge Sharing</h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">A space for team wisdom — testing rigor, guides, and architectural mindfulness.</p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="page-panel lg:col-span-8 p-8 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-on-surface">Presenter Picker</h3>
              <p className="text-xs text-tertiary">Spin the wheel to choose this week's knowledge sharer.</p>
            </div>
            {currentPresenter && (
              <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border border-primary/20 rounded-full animate-in fade-in slide-in-from-right-4">
                <Trophy size={16} className="text-primary" />
                <p className="text-xs font-bold text-primary">Current: {currentPresenter.name}</p>
              </div>
            )}
          </div>
          <SpinWheel members={allMembers} />
        </div>

        <div className="page-panel-muted lg:col-span-4 p-6 flex flex-col">
          <h3 className="text-[15px] text-on-surface mb-4" style={{ fontWeight: 590, letterSpacing: '-0.01em' }}>Members</h3>
          <div className="space-y-1 flex-1 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
            {allMembers.map((member, i) => (
              <motion.div
                key={member.uid || member.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04, ease: 'easeOut' }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-input transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm group cursor-default"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-container-high ring-1 ring-border group-hover:ring-primary/20 transition-all shrink-0">
                  <img
                    src={(member as any).photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-on-surface truncate" style={{ fontWeight: 510 }}>{member.name}</p>
                </div>
                <span className={`shrink-0 rounded-[4px] px-2 py-0.5 text-[10px] tracking-wide ${
                  member.role === 'Admin'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-input text-muted-foreground border border-border'
                }`} style={{ fontWeight: 510 }}>
                  {member.role === 'Admin' ? 'Admin' : 'QA'}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="page-panel lg:col-span-2 bg-primary p-8 flex flex-col justify-between text-on-primary col-span-full border-primary/20">
          <div>
            <h3 className="text-xl font-bold mb-2">Plant a Seed</h3>
            <p className="text-primary-fixed-dim text-xs mb-8">Suggest a topic you want to hear or share about.</p>
            <div className="space-y-4">
              <button 
                onClick={() => onAddProposal()}
                className="mt-4 w-full py-8 bg-white/10 border-2 border-dashed border-white/20 text-white font-bold rounded-[8px] hover:bg-white/20 transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="p-3 bg-white text-primary rounded-full group-hover:scale-110 transition-transform">
                  <PlusCircle size={24} />
                </div>
                <span>Submit a New Proposal</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-outline-variant/30"></div>
          <h3 className="text-sm font-bold text-outline uppercase tracking-widest px-4">The Horizon: Upcoming Topics</h3>
          <div className="h-[1px] flex-1 bg-outline-variant/30"></div>
        </div>
        {selectedItemId && (
          <div className="flex justify-center">
            <button 
              onClick={() => {
                if (onClearSelection) onClearSelection();
              }}
              className="px-6 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all bg-primary text-white shadow-md shadow-primary/10 flex items-center gap-2"
            >
              <X size={14} />
              Clear Search
            </button>
          </div>
        )}
        {filteredProposals.length === 0 && (
          <div className="page-empty flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-border bg-input text-muted-foreground">
              <BookOpen size={22} strokeWidth={1.5} />
            </div>
            <div className="max-w-xs">
              <h3 className="text-[15px] text-foreground" style={{ fontWeight: 590 }}>No posts here yet</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">Submit a guide, proposal, or playbook for the team.</p>
            </div>
            <button
              onClick={onAddProposal}
              className="inline-flex items-center gap-2 rounded-[6px] bg-primary px-4 py-2 text-[13px] text-white transition-colors hover:bg-primary/90"
              style={{ fontWeight: 510 }}
            >
              <PlusCircle size={14} />
              Submit first post
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AnimatePresence mode="wait" key="proposals">
          {filteredProposals.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, delay: i * 0.06, ease: [0.25, 0, 0, 1] }}
              whileHover={{ y: -4, boxShadow: '0 10px 28px rgba(113,112,255,0.13)' }}
              className="page-panel-muted p-7 group"
            >
              <div className="flex justify-between items-start mb-6">
                <span className={`px-3 py-1 bg-secondary-container text-on-surface text-[10px] font-bold rounded-full uppercase tracking-tighter`}>{timeAgo(item.createdAt || item.date)}</span>
                <Rocket size={20} className="opacity-40" />
              </div>
              <h4 className="text-lg font-bold text-on-surface mb-3 group-hover:text-primary transition-colors">{item.title}</h4>
              <p className="text-xs text-tertiary leading-relaxed mb-6">{item.scope}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-surface-container-highest rounded-full flex items-center justify-center text-[10px] font-bold text-outline">?</div>
                  <span className="text-[11px] font-medium text-on-surface-variant italic">Nominated by {item.author}</span>
                </div>
                
                {(profile?.uid === item.authorId || (!item.authorId && profile?.displayName === item.author)) && (
                  <div className="relative">
                    <button 
                      onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                      className="p-1 rounded-full text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    
                    {menuOpenId === item.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setMenuOpenId(null)}
                        ></div>
                        <div className="absolute right-0 mt-1 w-32 bg-surface-container-highest border border-outline-variant/20 rounded-[8px] shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <button 
                            onClick={() => {
                              onEditProposal(item);
                              setMenuOpenId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-on-surface hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this proposal?')) {
                                onDeleteProposal(item.id);
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
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
