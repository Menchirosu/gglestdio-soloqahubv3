import React, { useState } from 'react';
import { Edit3, ShieldCheck, MessageSquare, User, ThumbsUp, PlusCircle, MoreHorizontal, Trash2, X } from 'lucide-react';
import { Concern } from '../types';
import { useAuth } from '../AuthContext';

interface ConcernsProps {
  concerns: Concern[];
  onAddConcern: () => void;
  onMarkHelpful: (concernId: string) => void;
  onDeleteConcern: (concernId: string) => void;
  onEditConcern: (concern: Concern) => void;
  searchQuery: string;
  selectedItemId?: string | null;
  onClearSelection?: () => void;
}

export function ConcernsScreen({ concerns, onAddConcern, onMarkHelpful, onDeleteConcern, onEditConcern, searchQuery, selectedItemId, onClearSelection }: ConcernsProps) {
  const { profile } = useAuth();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filteredConcerns = concerns.filter(c => {
    if (selectedItemId) return c.id === selectedItemId;
    return c.content.toLowerCase().includes(searchQuery.toLowerCase()) || c.category.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-4xl font-extrabold text-on-surface tracking-tight mb-4 font-headline">Concerns & Wellness</h2>
          <p className="text-on-surface-variant leading-relaxed text-lg">A safe, respectful space to share roadblocks, mental fatigue, or workflow issues. Your voice shapes a better community.</p>
        </div>
        <div className="flex items-center gap-2 text-secondary font-medium bg-secondary/10 px-4 py-2 rounded-full">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
          </span>
          Moderators Online
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-lowest rounded-lg p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/5 rounded-lg">
                <Edit3 className="text-primary" size={20} />
              </div>
              <h3 className="text-xl font-bold font-headline">New Reflection</h3>
            </div>
            <div className="space-y-6">
              <button 
                onClick={() => onAddConcern()}
                className="w-full py-12 bg-surface-container-low border-2 border-dashed border-outline-variant/30 text-on-surface font-bold rounded-2xl hover:bg-surface-container-high hover:border-primary/30 transition-all flex flex-col items-center justify-center gap-4 group"
              >
                <div className="p-4 bg-primary/10 text-primary rounded-full group-hover:scale-110 transition-transform">
                  <PlusCircle size={32} />
                </div>
                <div className="text-center">
                  <span className="block text-lg">Share a Reflection</span>
                  <span className="block text-xs text-outline font-medium mt-1">Roadblocks, wellness, or suggestions</span>
                </div>
              </button>
            </div>
          </div>
          <div className="bg-secondary/5 rounded-lg p-6 flex gap-4 items-start">
            <ShieldCheck className="text-secondary" size={24} />
            <div>
              <h4 className="font-bold text-sm text-secondary mb-1 font-headline">Our Safety Commitment</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">Every post is reviewed by our wellness committee. We strictly prohibit harassment and prioritize constructive architect-driven solutions.</p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 space-y-8">
          {selectedItemId && (
            <div className="flex justify-end">
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
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold flex items-center gap-2 font-headline">
              Recent Feedback
              <span className="text-sm font-normal text-outline">({filteredConcerns.length} active)</span>
            </h3>
            <div className="flex gap-4 text-xs font-bold text-outline">
              <button className="text-primary underline underline-offset-4">Recent</button>
              <button className="hover:text-primary">Status</button>
            </div>
          </div>
          <div className="space-y-6">
            {filteredConcerns.map((concern) => (
              <div key={concern.id} className="bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-lg p-6 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center">
                      <User size={18} className="text-outline" />
                    </div>
                    <div>
                      <p className="text-sm font-bold font-headline">{concern.author}</p>
                      <p className="text-[10px] text-outline uppercase tracking-wider">Posted {concern.date} • {concern.category}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase ${
                    concern.status === 'Under Review' ? 'bg-primary/10 text-primary' :
                    concern.status === 'Resolved' ? 'bg-secondary/10 text-secondary' :
                    'bg-tertiary/10 text-tertiary'
                  }`}>
                    {concern.status}
                  </span>
                </div>
                <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">{concern.content}</p>
                
                {concern.adminResponse && (
                  <div className="bg-surface-container-lowest rounded-md p-5 border-l-4 border-primary mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare size={14} className="text-primary" />
                      <span className="text-xs font-bold text-primary uppercase tracking-widest">Admin Response</span>
                    </div>
                    <p className="text-sm text-on-surface leading-relaxed italic">"{concern.adminResponse}"</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                  <button 
                    onClick={() => onMarkHelpful(concern.id)}
                    className="flex items-center gap-2 text-xs font-bold text-outline hover:text-primary transition-colors"
                  >
                    <ThumbsUp size={14} />
                    Helpful ({concern.helpfulCount})
                  </button>
                  
                  {(profile?.uid === concern.authorId || (!concern.authorId && profile?.displayName === concern.author)) && (
                    <div className="relative">
                      <button 
                        onClick={() => setMenuOpenId(menuOpenId === concern.id ? null : concern.id)}
                        className="p-1 rounded-full text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      
                      {menuOpenId === concern.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setMenuOpenId(null)}
                          ></div>
                          <div className="absolute right-0 mt-1 w-32 bg-surface-container-highest border border-outline-variant/20 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <button 
                              onClick={() => {
                                onEditConcern(concern);
                                setMenuOpenId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-xs font-bold text-on-surface hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                            >
                              <Edit3 size={14} />
                              Edit
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this concern?')) {
                                  onDeleteConcern(concern.id);
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
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
