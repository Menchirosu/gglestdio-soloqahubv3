import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Edit3,
  Filter,
  FolderOpen,
  HeartHandshake,
  MoreHorizontal,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  X,
} from 'lucide-react';
import { Achievement } from '../types';
import { useAuth } from '../AuthContext';
import { timeAgo } from '../utils/timeAgo';

interface AchievementsScreenProps {
  achievements: Achievement[];
  onAddAchievement: () => void;
  onDeleteAchievement: (achievementId: string) => void;
  onEditAchievement: (achievement: Achievement) => void;
  searchQuery: string;
  selectedItemId?: string | null;
  onClearSelection?: () => void;
}

type AchievementFilter = 'All' | 'Work' | 'Personal' | 'Mine';
type SortMode = 'Newest' | 'Oldest';

export function scoreAchievement(achievement: Achievement) {
  let score = 0;
  if (achievement.category === 'Work') score += 40;
  score += Math.min(achievement.story.trim().length, 220) * 0.08;
  score += Math.min(achievement.impact.trim().length, 180) * 0.12;
  if (achievement.achievementDate) score += 8;
  return Math.round(score);
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function formatDisplayDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AchievementsScreen({
  achievements,
  onAddAchievement,
  onDeleteAchievement,
  onEditAchievement,
  searchQuery,
  selectedItemId,
  onClearSelection,
}: AchievementsScreenProps) {
  const { profile, isAdmin } = useAuth();
  const [activeFilter, setActiveFilter] = useState<AchievementFilter>('All');
  const [sortMode, setSortMode] = useState<SortMode>('Newest');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [activeAchievementId, setActiveAchievementId] = useState<string | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const filters: AchievementFilter[] = ['All', 'Work', 'Personal', 'Mine'];

  const filteredAchievements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...achievements]
      .filter((achievement) => {
        if (selectedItemId) return achievement.id === selectedItemId;

        const matchesFilter =
          activeFilter === 'All' ||
          achievement.category === activeFilter ||
          (activeFilter === 'Mine' &&
            (!!profile?.uid
              ? achievement.authorId === profile.uid
              : achievement.author === profile?.displayName));

        const matchesSearch =
          !query ||
          achievement.title.toLowerCase().includes(query) ||
          achievement.story.toLowerCase().includes(query) ||
          achievement.impact.toLowerCase().includes(query) ||
          achievement.author.toLowerCase().includes(query);

        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        const timeA = a.createdAt?.seconds || new Date(a.achievementDate || a.date).getTime();
        const timeB = b.createdAt?.seconds || new Date(b.achievementDate || b.date).getTime();
        return sortMode === 'Newest' ? timeB - timeA : timeA - timeB;
      });
  }, [achievements, activeFilter, searchQuery, selectedItemId, profile?.uid, profile?.displayName, sortMode]);

  const selectedAchievement = achievements.find((achievement) => achievement.id === activeAchievementId) || null;

  const stats = useMemo(() => {
    const mineCount = achievements.filter((item) =>
      profile?.uid ? item.authorId === profile.uid : item.author === profile?.displayName
    ).length;

    return {
      total: achievements.length,
      workCount: achievements.filter((item) => item.category === 'Work').length,
      personalCount: achievements.filter((item) => item.category === 'Personal').length,
      mineCount,
    };
  }, [achievements, profile?.displayName, profile?.uid]);

  const adminCandidates = useMemo(() => {
    return achievements
      .filter((item) => item.category === 'Work')
      .map((item) => ({ ...item, reviewScore: scoreAchievement(item) }))
      .sort((a, b) => b.reviewScore - a.reviewScore)
      .slice(0, 5);
  }, [achievements]);

  const starterPrompts = [
    'Shipped a release without a late bug scramble',
    'Cut a flaky test path that kept slowing the team down',
    'Finished a course, cert, or talk that changed how you work',
  ];

  return (
    <div className="space-y-8 pb-4">
      <section className="page-hero px-6 py-6 md:px-8 md:py-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="page-kicker text-emerald-700 dark:text-emerald-300">Achievements</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-on-surface md:text-5xl">
              Keep the wins in one place.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant md:text-[15px]">
              Work stuff. Personal stuff. The things you do not want to forget six weeks from now when the sprint has already moved on.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-outline-variant/10 bg-surface px-4 py-2 text-xs font-semibold text-on-surface-variant">
              {stats.total} {stats.total === 1 ? 'entry' : 'entries'}
            </div>
            <button
              onClick={onAddAchievement}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/10 transition-all hover:bg-emerald-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <PlusCircle size={18} />
              Add achievement
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[8px] border border-outline-variant/10 bg-surface px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Work</p>
            <p className="mt-3 text-3xl font-black text-on-surface">{stats.workCount}</p>
          </div>
          <div className="rounded-[8px] border border-outline-variant/10 bg-surface px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Personal</p>
            <p className="mt-3 text-3xl font-black text-on-surface">{stats.personalCount}</p>
          </div>
          <div className="rounded-[8px] border border-outline-variant/10 bg-surface px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Mine</p>
            <p className="mt-3 text-3xl font-black text-on-surface">{stats.mineCount}</p>
          </div>
        </div>
      </section>

      <section className="page-toolbar sticky top-24 z-20 px-4 py-4 md:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-outline">
              <Filter size={14} />
              View
            </div>
            {selectedItemId && (
              <button
                onClick={() => onClearSelection?.()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-md shadow-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <X size={14} />
                Clear search
              </button>
            )}
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  activeFilter === filter
                    ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-950/10'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-on-surface-variant">
              Short, honest entries are easier to scan later than polished paragraphs.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-outline">Sort</span>
              <div className="inline-flex rounded-full border border-outline-variant/10 bg-surface p-1">
                {(['Newest', 'Oldest'] as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    className={`rounded-full px-3 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                      sortMode === mode ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_340px]">
        <div className="space-y-4">
          {filteredAchievements.length === 0 ? (
            <div className="page-empty text-left md:px-8">
              <div className="flex flex-col items-start gap-5 md:flex-row md:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-border bg-input text-muted-foreground">
                  <Sparkles size={20} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h2 className="text-[15px] text-foreground" style={{ fontWeight: 590 }}>Nothing here yet.</h2>
                  <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                    Start with one real entry — a release you saved, a flaky path you fixed, or a hard week you got through.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={onAddAchievement}
                    className="inline-flex items-center gap-2 rounded-[8px] bg-primary px-4 py-2 text-[13px] text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      style={{ fontWeight: 510 }}
                    >
                      <PlusCircle size={14} />
                      Add the first one
                    </button>
                    <div className="inline-flex items-center gap-2 rounded-[9999px] border border-border bg-input px-3 py-1.5 text-[12px] text-muted-foreground">
                      <FolderOpen size={13} />
                      Work and personal notes can live side by side
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-[8px] border border-border bg-input px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground" style={{ fontWeight: 510 }}>Good first entries</p>
                <div className="mt-3 space-y-2">
                  {starterPrompts.map((prompt) => (
                    <div key={prompt} className="rounded-[6px] bg-surface-container-low px-3 py-2 text-[13px] leading-relaxed text-foreground">
                      {prompt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAchievements.map((achievement, index) => {
                const isOwner =
                  profile?.uid === achievement.authorId ||
                  (!achievement.authorId && profile?.displayName === achievement.author);

                const displayMoment = formatDisplayDate(achievement.achievementDate) || achievement.date;

                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.22 }}
                    className="page-panel"
                  >
                    <div className="flex items-start justify-between gap-3 px-5 pt-5 md:px-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                            achievement.category === 'Work'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                          }`}
                        >
                          {achievement.category === 'Work' ? <BriefcaseBusiness size={12} /> : <HeartHandshake size={12} />}
                          {achievement.category}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-outline">
                          {timeAgo(achievement.createdAt || achievement.date)}
                        </span>
                      </div>

                      {isOwner && (
                        <div className="relative shrink-0">
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === achievement.id ? null : achievement.id)}
                            aria-label={`Open actions for ${achievement.title}`}
                            className="rounded-full p-2 text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {menuOpenId === achievement.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)}></div>
                              <div className="absolute right-0 z-20 mt-2 w-36 overflow-hidden rounded-[8px] border border-outline-variant/20 bg-surface shadow-2xl">
                                <button
                                  onClick={() => {
                                    onEditAchievement(achievement);
                                    setMenuOpenId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold text-on-surface transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                >
                                  <Edit3 size={14} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this achievement?')) {
                                      onDeleteAchievement(achievement.id);
                                    }
                                    setMenuOpenId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold text-error transition-colors hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30"
                                >
                                  <X size={14} />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveAchievementId(achievement.id)}
                      className="block w-full px-5 pb-5 pt-3 text-left transition-colors hover:bg-surface-container-low/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-inset md:px-6"
                    >
                      <h2 className="text-2xl font-black tracking-tight text-on-surface">
                        {achievement.title}
                      </h2>

                      <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-7 text-on-surface-variant">
                        {achievement.story}
                      </p>

                      <p className="mt-4 text-sm leading-6 text-on-surface">
                        <span className="font-bold text-on-surface">Why it mattered:</span> {achievement.impact}
                      </p>

                      <div className="mt-5 flex flex-col gap-3 border-t border-outline-variant/10 pt-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-emerald-500/10 text-sm font-black text-emerald-700 dark:text-emerald-300">
                            {achievement.authorPhotoURL ? (
                              <img
                                src={achievement.authorPhotoURL}
                                alt={achievement.author}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              getInitials(achievement.author)
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">{achievement.author}</p>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-outline">
                              {achievement.category === 'Work' ? 'Work note' : 'Personal note'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays size={15} className="text-outline" />
                            {displayMoment}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <UserRound size={15} className="text-outline" />
                            Open details
                          </span>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5 xl:sticky xl:top-40 xl:self-start">
          <section className="page-panel-muted px-6 py-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">What belongs here</p>
            <div className="mt-5 space-y-4">
              <div className="flex gap-3">
                <BriefcaseBusiness size={18} className="mt-1 text-emerald-700 dark:text-emerald-300" />
                <p className="text-sm leading-6 text-on-surface-variant">
                  Release saves, test fixes, bug prevention, mentoring, cleaner handoff notes, or the quiet stuff that kept the week from slipping.
                </p>
              </div>
              <div className="flex gap-3">
                <HeartHandshake size={18} className="mt-1 text-sky-700 dark:text-sky-300" />
                <p className="text-sm leading-6 text-on-surface-variant">
                  Courses, speaking, volunteering, better habits, or anything outside the sprint that still changed how you show up.
                </p>
              </div>
            </div>
          </section>

          {isAdmin && (
            <section className="page-panel-muted px-6 py-6">
              <button
                onClick={() => setIsAdminPanelOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-4 rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-[8px] bg-amber-500/12 p-3 text-amber-700 dark:text-amber-300">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-outline">Admin only</p>
                    <h3 className="text-lg font-black text-on-surface">Review notes</h3>
                  </div>
                </div>
                <ChevronDown size={18} className={`text-outline transition-transform ${isAdminPanelOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence initial={false}>
                {isAdminPanelOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="mt-4 text-sm leading-6 text-on-surface-variant">
                      Work entries get a quiet review signal based on detail, proof, and date info. Nothing from this panel shows up in the public page.
                    </p>
                    <div className="mt-4 space-y-3">
                      {adminCandidates.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">No work entries to review yet.</p>
                      ) : (
                        adminCandidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="flex items-center justify-between rounded-[8px] border border-outline-variant/10 bg-surface-container-low px-4 py-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Trophy size={14} className="text-amber-600 dark:text-amber-300" />
                                <p className="truncate text-sm font-bold text-on-surface">{candidate.author}</p>
                              </div>
                              <p className="mt-1 truncate text-xs text-on-surface-variant">{candidate.title}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-on-surface">{candidate.reviewScore}</p>
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-outline">Signal</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selectedAchievement && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setActiveAchievementId(null)}
            />

            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[12px] border border-outline-variant/10 bg-surface-container-lowest shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-outline-variant/10 bg-surface px-6 py-6 md:px-8">
                <div className="max-w-2xl">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                      selectedAchievement.category === 'Work'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                    }`}
                  >
                    {selectedAchievement.category}
                  </span>
                  <h2 className="mt-4 text-3xl font-black tracking-tight text-on-surface">{selectedAchievement.title}</h2>
                </div>
                <button
                  onClick={() => setActiveAchievementId(null)}
                  aria-label="Close achievement details"
                  className="rounded-full p-2 text-outline transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="space-y-8 overflow-y-auto px-6 py-6 md:px-8">
                <section>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">What happened</p>
                  <p className="mt-3 text-base leading-8 text-on-surface">{selectedAchievement.story}</p>
                </section>

                <section>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">Why it mattered</p>
                  <p className="mt-3 text-base leading-8 text-on-surface">{selectedAchievement.impact}</p>
                </section>

                <section className="grid gap-4 border-t border-outline-variant/10 pt-6 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-emerald-500/10 text-sm font-black text-emerald-700 dark:text-emerald-300">
                      {selectedAchievement.authorPhotoURL ? (
                        <img
                          src={selectedAchievement.authorPhotoURL}
                          alt={selectedAchievement.author}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        getInitials(selectedAchievement.author)
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{selectedAchievement.author}</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Contributor</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Moment</p>
                    <p className="mt-2 text-sm text-on-surface">
                      {formatDisplayDate(selectedAchievement.achievementDate) || 'Not added'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Posted</p>
                    <p className="mt-2 text-sm text-on-surface">{timeAgo(selectedAchievement.createdAt || selectedAchievement.date)}</p>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
