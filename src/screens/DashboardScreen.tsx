import React from 'react';
import { 
  LayoutDashboard, 
  Bug, 
  Lightbulb, 
  BookOpen, 
  AlertTriangle, 
  Focus,
  ChevronRight,
  MessageSquare,
  ThumbsUp,
  Rocket
} from 'lucide-react';
import { Screen, BugStory, Tip, Proposal, Concern } from '../types';
import { useAuth } from '../AuthContext';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  bugs: BugStory[];
  tips: Tip[];
  proposals: Proposal[];
  concerns: Concern[];
  searchQuery: string;
}

export function DashboardScreen({ onNavigate, bugs, tips, proposals, concerns, searchQuery }: DashboardProps) {
  const { profile } = useAuth();
  
  // Use raw data for the activity list to keep it stable while searching
  const latestActivity = [
    ...bugs.map(b => ({ id: b.id, title: b.title, description: b.discovery, date: b.date, type: 'bug', icon: Bug, color: 'text-error', screen: 'bug-wall' as Screen })),
    ...tips.map(t => ({ id: t.id, title: t.title, description: t.desc, date: t.time, type: 'tip', icon: Lightbulb, color: 'text-primary', screen: 'tips-tricks' as Screen })),
    ...proposals.map(p => ({ id: p.id, title: p.title, description: p.scope, date: p.date, type: 'proposal', icon: BookOpen, color: 'text-secondary', screen: 'knowledge-sharing' as Screen })),
    ...concerns.map(c => ({ id: c.id, title: c.category, description: c.content, date: c.date, type: 'concern', icon: AlertTriangle, color: 'text-tertiary', screen: 'concerns' as Screen })),
  ].sort((a, b) => {
    const dateA = a.date === 'Just now' ? Date.now() : new Date(a.date).getTime();
    const dateB = b.date === 'Just now' ? Date.now() : new Date(b.date).getTime();
    return dateB - dateA;
  }).slice(0, 3);

  return (
    <div className="space-y-16">
      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-extrabold text-on-surface tracking-tighter mb-4 leading-tight font-headline">
              A home for solo QAs to <span className="text-primary italic">learn</span>, <span className="text-secondary italic">share</span>, and <span className="text-tertiary italic">breathe</span>.
            </h1>
            <p className="text-lg text-on-surface-variant leading-relaxed max-w-xl">
              Post bug stories, exchange testing wisdom, raise concerns, and recharge before the next test cycle.
            </p>
          </div>
          <div className="flex items-center bg-surface-container-low p-2 rounded-full">
            <div className="w-10 h-10 rounded-full border-2 border-surface bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm overflow-hidden">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span>{profile?.displayName?.[0] || 'U'}</span>
              )}
            </div>
            <span className="ml-4 pr-4 text-xs font-bold text-tertiary tracking-wide uppercase">Active Now</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-primary p-8 rounded-lg text-white relative overflow-hidden shadow-2xl shadow-primary/20 h-full min-h-[320px] flex flex-col">
            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-auto">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase mb-6 inline-block">Community Impact</span>
                <h2 className="text-3xl font-bold mb-2 font-headline">QA Solo Hub Stats</h2>
                <p className="text-white/80 font-medium">Your collective contributions at a glance.</p>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-xl">
                  <p className="text-3xl font-bold">{bugs.length}</p>
                  <p className="text-xs opacity-70">Bugs Reported</p>
                </div>
                <div className="bg-white/10 p-4 rounded-xl">
                  <p className="text-3xl font-bold">{tips.length}</p>
                  <p className="text-xs opacity-70">Tips Shared</p>
                </div>
                <div className="bg-white/10 p-4 rounded-xl">
                  <p className="text-3xl font-bold">{proposals.length}</p>
                  <p className="text-xs opacity-70">Proposals</p>
                </div>
                <div className="bg-white/10 p-4 rounded-xl">
                  <p className="text-3xl font-bold">{concerns.length}</p>
                  <p className="text-xs opacity-70">Concerns</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold tracking-tight font-headline">Latest Community Activity</h3>
          </div>
          <div className="space-y-6">
            {latestActivity.map((entry) => (
              <div 
                key={entry.id}
                onClick={() => onNavigate(entry.screen as Screen)}
                className="group bg-surface-container-low hover:bg-surface-container-high transition-all p-6 rounded-lg flex gap-6 border-l-4 border-primary/20 hover:border-primary cursor-pointer"
              >
                <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center ${entry.color}`}>
                  <entry.icon size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg group-hover:text-primary transition-colors font-headline">{entry.title}</h4>
                    <span className="text-[10px] font-bold text-outline uppercase tracking-tighter">{entry.date}</span>
                  </div>
                  <p className="text-on-surface-variant text-sm mb-4 leading-relaxed line-clamp-2">
                    {entry.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { id: 'focus-zone', title: 'Focus Zone', desc: 'Deep work timers & ambient noise.', icon: Focus, color: 'text-primary' },
          { id: 'knowledge-sharing', title: 'Knowledge Hub', desc: 'Shared templates & test cases.', icon: BookOpen, color: 'text-secondary' },
          { id: 'concerns', title: 'Mental Health', desc: 'Solo QA survival guides.', icon: AlertTriangle, color: 'text-tertiary' },
          { id: 'knowledge-sharing', title: 'Community Hall', desc: 'Daily stand-ups & watercooler.', icon: MessageSquare, color: 'text-error' },
        ].map((item, idx) => (
          <button 
            key={idx} 
            onClick={() => onNavigate(item.id as Screen)}
            className="group bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:shadow-xl transition-all flex flex-col gap-4 text-left"
          >
            <div className={`w-12 h-12 rounded-2xl bg-surface-container-low ${item.color} flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all`}>
              <item.icon size={24} />
            </div>
            <div>
              <p className="font-bold text-lg font-headline">{item.title}</p>
              <p className="text-xs text-outline">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
