import React, { useState, useEffect } from 'react';
import { Rocket, Sprout, Bug, BookOpen, Lightbulb, Edit3, Play, Send, Leaf, PlusCircle, MoreHorizontal, Trash2, X } from 'lucide-react';
import { Screen, Proposal } from '../types';
import { useAuth } from '../AuthContext';
import { DuckRace } from '../components/DuckRace';

interface KnowledgeSharingProps {
  onNavigate: (screen: Screen) => void;
  proposals: Proposal[];
  onAddProposal: () => void;
  onDeleteProposal: (proposalId: string) => void;
  onEditProposal: (proposal: Proposal) => void;
  searchQuery: string;
  selectedItemId?: string | null;
  onClearSelection?: () => void;
}

const TEAM_PIONEERS = [
  { name: 'Alex Chen', role: 'Automation Architect', active: true },
  { name: 'Jamie Lark', role: 'Security Specialist' },
  { name: 'Sia Varma', role: 'UX Quality Lead' },
  { name: 'Morgan Lee', role: 'Performance Engineer' }
];

const ARCHITECTURAL_LEGACY = [
  { date: 'SEP 12', title: 'Advanced Playwright Interceptors', meta: 'Shared by Alex Chen • 45 mins' },
  { date: 'SEP 05', title: 'Chaos Engineering for QA Soloists', meta: 'Shared by Morgan Lee • 30 mins' },
  { date: 'AUG 28', title: 'The Psychology of Bug Reporting', meta: 'Shared by Sia Varma • 60 mins' }
];

const UPCOMING_TOPICS = [
  { date: 'OCT 04', title: 'LLMs in E2E Testing Strategies', desc: 'Deep dive into prompt engineering for robust playwright scripts and visual regression.', color: 'border-secondary', bg: 'bg-secondary-container', icon: Rocket },
  { date: 'OCT 11', title: 'The Multi-Repo Testing Labyrinth', desc: 'Solving orchestration challenges when services are scattered across 50+ repositories.', color: 'border-primary', bg: 'bg-primary-fixed', icon: BookOpen },
  { date: 'TBD', title: 'Sustainable QA Infrastructure', desc: 'Reducing carbon footprint of CI runners without compromising on test coverage.', color: 'border-tertiary', bg: 'bg-tertiary-fixed', icon: Leaf }
];

export function KnowledgeSharingScreen({ onNavigate, proposals, onAddProposal, onDeleteProposal, onEditProposal, searchQuery, selectedItemId, onClearSelection }: KnowledgeSharingProps) {
  const { profile } = useAuth();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filteredProposals = proposals.filter(p => {
    if (selectedItemId) return p.id === selectedItemId;
    return p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.scope.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUpcoming = UPCOMING_TOPICS.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-5xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">Knowledge Sharing</h1>
        <p className="text-tertiary text-lg max-w-xl">A sanctuary for team wisdom. Where testing rigor meets architectural mindfulness.</p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-lg p-8 shadow-sm relative overflow-hidden group">
          <DuckRace />
        </div>

        <div className="lg:col-span-4 bg-surface-container-low rounded-lg p-8 flex flex-col">
          <h3 className="text-xl font-bold text-on-surface mb-6 font-headline">Team Pioneers</h3>
          <div className="space-y-4 flex-1">
            {TEAM_PIONEERS.map((member, i) => (
              <div key={i} className="flex items-center gap-4 p-3 hover:bg-surface-container-lowest rounded-lg transition-all group">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high ring-2 ring-transparent group-hover:ring-secondary/30 transition-all">
                  <img src={`https://picsum.photos/seed/pioneer${i}/100/100`} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface font-headline">{member.name}</p>
                  <p className="text-[11px] text-tertiary font-medium">{member.role}</p>
                </div>
                {member.active && <div className="ml-auto w-2 h-2 rounded-full bg-secondary-fixed-dim wellness-pulse"></div>}
              </div>
            ))}
            <div className="pt-2 text-center">
              <button className="text-[11px] font-bold text-primary uppercase tracking-widest hover:underline">+3 More Members</button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-lg p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-on-surface font-headline">Architectural Legacy</h3>
            <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Past Presenters</span>
          </div>
          <div className="space-y-4">
            {ARCHITECTURAL_LEGACY.map((item, i) => (
              <div key={i} className="flex items-center gap-6 p-4 bg-surface-container-low rounded-xl group hover:bg-surface-container transition-colors">
                <span className="text-xs font-bold text-outline w-12">{item.date}</span>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-on-surface font-headline">{item.title}</h4>
                  <p className="text-xs text-tertiary">{item.meta}</p>
                </div>
                <button className="p-2 bg-white rounded-full text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={16} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary p-8 rounded-lg shadow-xl shadow-primary/10 flex flex-col justify-between text-on-primary">
          <div>
            <h3 className="text-xl font-bold mb-2 font-headline">Plant a Seed</h3>
            <p className="text-primary-fixed-dim text-xs mb-8">Suggest a topic you want to hear or share about.</p>
            <div className="space-y-4">
              <button 
                onClick={() => onAddProposal()}
                className="mt-4 w-full py-8 bg-white/10 border-2 border-dashed border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all flex flex-col items-center justify-center gap-3 group"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredProposals.map((item, i) => (
            <div key={item.id} className={`bg-surface-container-low p-8 rounded-lg group hover:bg-surface-container-lowest hover:shadow-lg transition-all border-b-4 border-secondary`}>
              <div className="flex justify-between items-start mb-6">
                <span className={`px-3 py-1 bg-secondary-container text-on-surface text-[10px] font-bold rounded-full uppercase tracking-tighter`}>{item.date}</span>
                <Rocket size={20} className="opacity-40" />
              </div>
              <h4 className="text-lg font-bold text-on-surface mb-3 group-hover:text-primary transition-colors font-headline">{item.title}</h4>
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
                        <div className="absolute right-0 mt-1 w-32 bg-surface-container-highest border border-outline-variant/20 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
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
            </div>
          ))}
          {filteredUpcoming.map((item, i) => (
            <div key={i} className={`bg-surface-container-low p-8 rounded-lg group hover:bg-surface-container-lowest hover:shadow-lg transition-all border-b-4 ${item.color}`}>
              <div className="flex justify-between items-start mb-6">
                <span className={`px-3 py-1 ${item.bg} text-on-surface text-[10px] font-bold rounded-full uppercase tracking-tighter`}>{item.date}</span>
                <item.icon size={20} className="opacity-40" />
              </div>
              <h4 className="text-lg font-bold text-on-surface mb-3 group-hover:text-primary transition-colors font-headline">{item.title}</h4>
              <p className="text-xs text-tertiary leading-relaxed mb-6">{item.desc}</p>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-surface-container-highest rounded-full flex items-center justify-center text-[10px] font-bold text-outline">?</div>
                <span className="text-[11px] font-medium text-on-surface-variant italic">Nominated Topic</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
