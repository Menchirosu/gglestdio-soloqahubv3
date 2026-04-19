import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Icon } from '@iconify/react';
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

// Lumie category pill — sage for Work, terracotta-tinted warm for Personal
function CategoryPill({ category }: { category: Achievement['category'] }) {
  if (category === 'Work') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] ring-1 ring-[#5A8B58]/25 text-[#3F6B3E] bg-[#5A8B58]/10" style={{ fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        <Icon icon="solar:case-minimalistic-bold-duotone" width={11} height={11} />
        Work
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] ring-1 ring-primary/25 text-[#9A4E35] bg-primary/10" style={{ fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      <Icon icon="solar:heart-bold-duotone" width={11} height={11} />
      Personal
    </span>
  );
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
  const reduce = useReducedMotion();
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
      {/* Hero */}
      <section className="page-hero px-6 py-7 md:px-8 md:py-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5A8B58]" style={{ fontWeight: 600 }}>
              Recognition
            </p>
            <h1 className="mt-2 page-title-serif text-[40px] text-foreground md:text-[48px]">
              <span style={{ fontStyle: 'italic' }}>Keep the wins in one place.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-7 text-muted-foreground">
              Work stuff. Personal stuff. The things you do not want to forget six weeks from now when the sprint has already moved on.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] text-muted-foreground" style={{ fontWeight: 510 }}>
              {stats.total} {stats.total === 1 ? 'entry' : 'entries'}
            </div>
            <button
              onClick={onAddAchievement}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13px] text-white shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{ fontWeight: 590 }}
            >
              <Icon icon="solar:add-circle-bold-duotone" width={16} height={16} />
              Add achievement
            </button>
          </div>
        </div>

        {/* Stat tiles — Newsreader italic numbers matching Overview/Signals */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[12px] border border-border bg-card px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>Work</p>
            <p className="mt-2 font-serif italic tabular-nums text-[32px] text-foreground leading-none" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
              {stats.workCount}
            </p>
          </div>
          <div className="rounded-[12px] border border-border bg-card px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>Personal</p>
            <p className="mt-2 font-serif italic tabular-nums text-[32px] text-foreground leading-none" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
              {stats.personalCount}
            </p>
          </div>
          <div className="rounded-[12px] border border-border bg-card px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>Mine</p>
            <p className="mt-2 font-serif italic tabular-nums text-[32px] text-foreground leading-none" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
              {stats.mineCount}
            </p>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <section className="page-toolbar sticky top-24 z-20 px-4 py-3 md:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>
              <Icon icon="solar:filter-linear" width={12} height={12} />
              View
            </div>
            {selectedItemId && (
              <button
                onClick={() => onClearSelection?.()}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white shadow-sm shadow-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                style={{ fontWeight: 600 }}
              >
                <Icon icon="solar:close-circle-linear" width={12} height={12} />
                Clear search
              </button>
            )}
            {filters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    isActive
                      ? 'bg-primary text-white shadow-sm shadow-primary/15'
                      : 'bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  style={{ fontWeight: 600 }}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="whisper text-[13px]" style={{ fontStyle: 'italic' }}>
              Short, honest entries are easier to scan later than polished paragraphs.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground" style={{ fontWeight: 600 }}>Sort</span>
              <div className="inline-flex rounded-full border border-border bg-card p-0.5">
                {(['Newest', 'Oldest'] as SortMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSortMode(m)}
                    className={`rounded-full px-3 py-1.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                      sortMode === m ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    style={{ fontWeight: 600 }}
                  >
                    {m}
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
                <div className="empty-float flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-border bg-card text-muted-foreground">
                  <Icon icon="solar:stars-bold-duotone" width={22} height={22} />
                </div>
                <div className="flex-1">
                  <p className="whisper text-[18px] text-foreground" style={{ fontStyle: 'italic' }}>Nothing here yet.</p>
                  <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                    Start with one real entry — a release you saved, a flaky path you fixed, or a hard week you got through.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={onAddAchievement}
                      className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-[13px] text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      style={{ fontWeight: 590 }}
                    >
                      <Icon icon="solar:add-circle-bold-duotone" width={14} height={14} />
                      Add the first one
                    </button>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] text-muted-foreground">
                      <Icon icon="solar:folder-open-linear" width={12} height={12} />
                      Work and personal notes can live side by side
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-[12px] border border-border bg-card px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground" style={{ fontWeight: 600 }}>Good first entries</p>
                <div className="mt-3 space-y-2">
                  {starterPrompts.map((prompt) => (
                    <div key={prompt} className="rounded-[10px] bg-secondary/60 px-3 py-2 text-[13px] leading-relaxed text-foreground">
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
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.22 }}
                    className="page-panel"
                  >
                    <div className="flex items-start justify-between gap-3 px-5 pt-5 md:px-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <CategoryPill category={achievement.category} />
                        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground" style={{ fontWeight: 600 }}>
                          {timeAgo(achievement.createdAt || achievement.date)}
                        </span>
                      </div>

                      {isOwner && (
                        <div className="relative shrink-0">
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === achievement.id ? null : achievement.id)}
                            aria-label={`Open actions for ${achievement.title}`}
                            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          >
                            <Icon icon="solar:menu-dots-bold" width={18} height={18} />
                          </button>

                          {menuOpenId === achievement.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)}></div>
                              <div className="absolute right-0 z-20 mt-2 w-36 overflow-hidden rounded-[10px] border border-border bg-card shadow-xl">
                                <button
                                  onClick={() => {
                                    onEditAchievement(achievement);
                                    setMenuOpenId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12px] text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                  style={{ fontWeight: 590 }}
                                >
                                  <Icon icon="solar:pen-linear" width={14} height={14} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this achievement?')) {
                                      onDeleteAchievement(achievement.id);
                                    }
                                    setMenuOpenId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12px] text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
                                  style={{ fontWeight: 590 }}
                                >
                                  <Icon icon="solar:trash-bin-minimalistic-linear" width={14} height={14} />
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
                      className="block w-full px-5 pb-5 pt-3 text-left transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset md:px-6"
                    >
                      <h2 className="text-[22px] text-foreground" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
                        {achievement.title}
                      </h2>

                      <p className="mt-2 line-clamp-3 max-w-3xl text-[14px] leading-7 text-muted-foreground">
                        {achievement.story}
                      </p>

                      <p className="mt-4 text-[14px] leading-6 text-foreground">
                        <span className="text-foreground" style={{ fontWeight: 600 }}>Why it mattered:</span> {achievement.impact}
                      </p>

                      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[12px] text-primary" style={{ fontWeight: 700 }}>
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
                            <p className="text-[13px] text-foreground" style={{ fontWeight: 590 }}>{achievement.author}</p>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground" style={{ fontWeight: 600 }}>
                              {achievement.category === 'Work' ? 'Work note' : 'Personal note'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon icon="solar:calendar-linear" width={14} height={14} className="text-muted-foreground" />
                            {displayMoment}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Icon icon="solar:arrow-right-linear" width={14} height={14} className="text-muted-foreground" />
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
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>
              What belongs here
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex gap-3">
                <Icon icon="solar:case-minimalistic-bold-duotone" width={18} height={18} className="mt-1 shrink-0 text-[#5A8B58]" />
                <p className="text-[13px] leading-6 text-muted-foreground">
                  Release saves, test fixes, bug prevention, mentoring, cleaner handoff notes, or the quiet stuff that kept the week from slipping.
                </p>
              </div>
              <div className="flex gap-3">
                <Icon icon="solar:heart-bold-duotone" width={18} height={18} className="mt-1 shrink-0 text-primary" />
                <p className="text-[13px] leading-6 text-muted-foreground">
                  Courses, speaking, volunteering, better habits, or anything outside the sprint that still changed how you show up.
                </p>
              </div>
            </div>
          </section>

          {isAdmin && (
            <section className="page-panel-muted px-6 py-6">
              <button
                onClick={() => setIsAdminPanelOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-4 rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-[10px] bg-primary/10 p-2.5 text-primary">
                    <Icon icon="solar:shield-check-bold-duotone" width={18} height={18} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>Admin only</p>
                    <h3 className="text-[15px] text-foreground" style={{ fontWeight: 600 }}>Review notes</h3>
                  </div>
                </div>
                <Icon
                  icon="solar:alt-arrow-down-linear"
                  width={16}
                  height={16}
                  className={`text-muted-foreground transition-transform ${isAdminPanelOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isAdminPanelOpen && (
                  <motion.div
                    initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                      Work entries get a quiet review signal based on detail, proof, and date info. Nothing from this panel shows up in the public page.
                    </p>
                    <div className="mt-3 space-y-2">
                      {adminCandidates.length === 0 ? (
                        <p className="whisper text-[13px]" style={{ fontStyle: 'italic' }}>No work entries to review yet.</p>
                      ) : (
                        adminCandidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="flex items-center justify-between rounded-[10px] border border-border bg-card px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Icon icon="solar:cup-star-bold-duotone" width={14} height={14} className="text-[#C86948]" />
                                <p className="truncate text-[12px] text-foreground" style={{ fontWeight: 590 }}>{candidate.author}</p>
                              </div>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{candidate.title}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-serif italic tabular-nums text-[18px] text-foreground" style={{ fontWeight: 500 }}>{candidate.reviewScore}</p>
                              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground" style={{ fontWeight: 600 }}>Signal</p>
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
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[16px] border border-border bg-card shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-border bg-card px-6 py-6 md:px-8">
                <div className="max-w-2xl">
                  <CategoryPill category={selectedAchievement.category} />
                  <h2 className="mt-3 text-[28px] text-foreground" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
                    {selectedAchievement.title}
                  </h2>
                </div>
                <button
                  onClick={() => setActiveAchievementId(null)}
                  aria-label="Close achievement details"
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <Icon icon="solar:close-circle-linear" width={20} height={20} />
                </button>
              </div>

              <div className="space-y-8 overflow-y-auto px-6 py-6 md:px-8">
                <section>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground" style={{ fontWeight: 600 }}>What happened</p>
                  <p className="mt-2 text-[15px] leading-8 text-foreground">{selectedAchievement.story}</p>
                </section>

                <section>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground" style={{ fontWeight: 600 }}>Why it mattered</p>
                  <p className="mt-2 text-[15px] leading-8 text-foreground">{selectedAchievement.impact}</p>
                </section>

                <section className="grid gap-4 border-t border-border pt-6 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[13px] text-primary" style={{ fontWeight: 700 }}>
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
                      <p className="text-[13px] text-foreground" style={{ fontWeight: 590 }}>{selectedAchievement.author}</p>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground" style={{ fontWeight: 600 }}>Contributor</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground" style={{ fontWeight: 600 }}>Moment</p>
                    <p className="mt-1 text-[13px] text-foreground">
                      {formatDisplayDate(selectedAchievement.achievementDate) || 'Not added'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground" style={{ fontWeight: 600 }}>Posted</p>
                    <p className="mt-1 text-[13px] text-foreground">{timeAgo(selectedAchievement.createdAt || selectedAchievement.date)}</p>
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
