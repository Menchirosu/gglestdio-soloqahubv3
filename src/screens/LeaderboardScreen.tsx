import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Achievement, BugStory, Proposal, Tip } from '../types';
import { useAuth } from '../AuthContext';
import { db, getLeaderboardNominees, setLeaderboardNominee, UserProfile } from '../firebase';
import {
  BUG_STORY_WEIGHT,
  KNOWLEDGE_WEIGHT,
  LOOKBACK_DAYS,
  TIP_WEIGHT,
  WORK_ACHIEVEMENT_WEIGHT,
  computeQaLeaderboard,
} from '../utils/qaRanking';

interface LeaderboardScreenProps {
  bugs: BugStory[];
  tips: Tip[];
  proposals: Proposal[];
  achievements: Achievement[];
  isAdmin?: boolean;
}

type NomineeMap = Record<string, string>;

export function LeaderboardScreen({
  bugs,
  tips,
  proposals,
  achievements,
  isAdmin = false,
}: LeaderboardScreenProps) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [nominees, setNominees] = useState<NomineeMap>({});
  const [drafts, setDrafts] = useState<NomineeMap>({});
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [showCriteria, setShowCriteria] = useState(false);

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map((doc) => doc.data() as UserProfile));
    });
    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadNominees = async () => {
      const data = await getLeaderboardNominees();
      if (cancelled) return;
      const mapped = Object.fromEntries(
        (data.nominees ?? []).map((item) => [item.uid, item.blurb])
      );
      setNominees(mapped);
      setDrafts(mapped);
    };

    loadNominees();
    return () => {
      cancelled = true;
    };
  }, []);

  const leaderboard = useMemo(
    () =>
      computeQaLeaderboard({
        users,
        bugs,
        tips,
        proposals,
        achievements,
      }),
    [users, bugs, tips, proposals, achievements]
  );

  const activeLeaderboard = leaderboard.filter((entry) => entry.totalScore > 0);
  const podium = activeLeaderboard.slice(0, 3);
  const spotlight = activeLeaderboard.find((entry) => nominees[entry.user.uid]) ?? activeLeaderboard[0] ?? null;
  const jumpInBugs = useMemo(
    () =>
      bugs
        .filter((bug) => {
          const reactionCount = Object.values(bug.reactions ?? {}).reduce((sum, count) => sum + count, 0);
          return reactionCount === 0 && (bug.comments?.length ?? 0) === 0;
        })
        .slice(0, 5),
    [bugs]
  );
  const myEntry = profile?.uid
    ? activeLeaderboard.find((entry) => entry.user.uid === profile.uid) ?? null
    : null;
  const myRank = myEntry ? activeLeaderboard.findIndex((entry) => entry.user.uid === myEntry.user.uid) + 1 : null;

  const saveNominee = async (uid: string) => {
    setSavingUid(uid);
    try {
      const next = (drafts[uid] ?? '').trim();
      await setLeaderboardNominee(uid, next);
      setNominees((prev) => {
        const updated = { ...prev };
        if (next) updated[uid] = next;
        else delete updated[uid];
        return updated;
      });
    } finally {
      setSavingUid(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="page-hero relative overflow-hidden px-6 py-6 sm:px-7">
          <div className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-primary/14 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-10 h-28 w-28 rounded-full bg-[#C86948]/12 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-primary" style={{ fontWeight: 600 }}>
              <Icon icon="solar:cup-star-bold-duotone" width={14} height={14} />
              Leaderboard
            </div>
            <h1 className="mt-4 page-title-serif text-[32px] text-foreground">
              Quality work people can actually feel.
            </h1>
            <p className="mt-3 max-w-[46rem] text-[13px] leading-7 text-muted-foreground">
              Rolling {LOOKBACK_DAYS}-day score. Bugs x{BUG_STORY_WEIGHT}, tips x{TIP_WEIGHT}, knowledge x{KNOWLEDGE_WEIGHT}, work achievements x{WORK_ACHIEVEMENT_WEIGHT}, personal achievements x1.
            </p>

            {myEntry && myRank ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[12px] border border-border bg-card px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground" style={{ fontWeight: 600 }}>My Rank</p>
                  <p className="mt-1 font-serif italic text-[30px] leading-none text-foreground">#{myRank}</p>
                </div>
                <div className="rounded-[12px] border border-border bg-card px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground" style={{ fontWeight: 600 }}>My Score</p>
                  <p className="mt-1 font-serif italic text-[30px] leading-none text-foreground">{myEntry.totalScore}</p>
                </div>
                <div className="rounded-[12px] border border-border bg-card px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground" style={{ fontWeight: 600 }}>Strongest Signal</p>
                  <p className="mt-1 text-[13px] leading-6 text-foreground">
                    {myEntry.bugStories >= myEntry.tips && myEntry.bugStories >= myEntry.knowledgeProposals
                      ? `${myEntry.bugStories} bug stories`
                      : myEntry.tips >= myEntry.knowledgeProposals
                        ? `${myEntry.tips} tips shared`
                        : `${myEntry.knowledgeProposals} knowledge posts`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[12px] border border-border bg-card px-4 py-3 text-[13px] text-muted-foreground">
                No score yet. Post one bug story, tip, or knowledge note to get on the board.
              </div>
            )}
          </div>
        </div>

        <div className="page-panel-muted p-5">
          <div className="flex items-center gap-2">
            <Icon icon="solar:medal-star-bold-duotone" width={16} height={16} className="text-primary" />
            <h2 className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>Spotlight</h2>
          </div>

          {spotlight ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={spotlight.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${spotlight.user.uid}`}
                  alt={spotlight.user.displayName}
                  className="h-12 w-12 rounded-[12px] border border-border object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>{spotlight.user.displayName}</p>
                  <p className="text-[12px] text-muted-foreground">#{activeLeaderboard.findIndex((entry) => entry.user.uid === spotlight.user.uid) + 1} on the board</p>
                </div>
              </div>
              <div className="rounded-[12px] border border-primary/15 bg-primary/6 px-4 py-3">
                <p className="text-[12px] leading-6 text-foreground/85">
                  {nominees[spotlight.user.uid] || 'Consistent quality signal across bug stories, knowledge sharing, and team-visible follow-through.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Bug stories', value: spotlight.bugStories, icon: 'solar:bug-bold-duotone' },
                  { label: 'Tips', value: spotlight.tips, icon: 'solar:lightbulb-bold-duotone' },
                  { label: 'Knowledge', value: spotlight.knowledgeProposals, icon: 'solar:book-bookmark-bold-duotone' },
                  { label: 'Work wins', value: spotlight.workAchievements, icon: 'solar:case-minimalistic-bold-duotone' },
                ].map((item) => (
                  <div key={item.label} className="rounded-[10px] border border-border bg-card px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon icon={item.icon} width={12} height={12} />
                      <span className="text-[10px] uppercase tracking-[0.12em]" style={{ fontWeight: 600 }}>{item.label}</span>
                    </div>
                    <p className="mt-1 font-serif italic text-[24px] leading-none text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[12px] border border-border bg-card px-4 py-3 text-[13px] text-muted-foreground">
              The board will populate once approved members contribute within the current lookback window.
            </div>
          )}
        </div>
      </section>

      {podium.length > 0 && (
        <section className="grid gap-3 lg:grid-cols-3">
          {podium.map((entry, index) => (
            <motion.div
              key={entry.user.uid}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: index * 0.05 }}
              className={`rounded-[14px] border px-5 py-5 ${
                index === 0 ? 'bg-card ring-1 ring-primary/20 border-primary/20' : 'bg-card border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={entry.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user.uid}`}
                    alt={entry.user.displayName}
                    className="h-11 w-11 rounded-[10px] border border-border object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground" style={{ fontWeight: 600 }}>
                      Rank #{index + 1}
                    </p>
                    <p className="truncate text-[16px] text-foreground" style={{ fontWeight: 600 }}>{entry.user.displayName}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-serif italic text-[32px] leading-none text-foreground">{entry.totalScore}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground" style={{ fontWeight: 600 }}>Score</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {[
                  `${entry.bugStories} bugs`,
                  `${entry.tips} tips`,
                  `${entry.knowledgeProposals} knowledge`,
                  `${entry.workAchievements + entry.personalAchievements} wins`,
                ].map((chip) => (
                  <span key={chip} className="rounded-full bg-secondary/60 px-2.5 py-1 text-[11px] text-foreground/80">
                    {chip}
                  </span>
                ))}
              </div>

              {isAdmin && (
                <div className="mt-4 space-y-2">
                  <textarea
                    value={drafts[entry.user.uid] ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [entry.user.uid]: e.target.value }))}
                    rows={3}
                    placeholder="Optional spotlight blurb for this member"
                    className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40"
                  />
                  <button
                    onClick={() => saveNominee(entry.user.uid)}
                    disabled={savingUid === entry.user.uid}
                    className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-3 py-2 text-[12px] text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ fontWeight: 600 }}
                  >
                    <Icon icon="solar:medal-ribbon-star-bold-duotone" width={14} height={14} />
                    {savingUid === entry.user.uid ? 'Saving...' : 'Save spotlight'}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </section>
      )}

      <section className="page-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[18px] text-foreground" style={{ fontWeight: 600 }}>Full Ranking</h2>
            <p className="text-[12px] text-muted-foreground">Approved members only. Ordered by total score, then name.</p>
          </div>
          <div className="rounded-full bg-secondary/60 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground" style={{ fontWeight: 600 }}>
            {activeLeaderboard.length} members
          </div>
        </div>

        {activeLeaderboard.length > 0 ? (
          <div className="mt-4 divide-y divide-border/70">
            {activeLeaderboard.map((entry, index) => (
              <div key={entry.user.uid} className="grid gap-3 px-1 py-3 md:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,0.55fr))_minmax(0,0.65fr)] md:items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-secondary/60 text-[12px] text-foreground" style={{ fontWeight: 600 }}>
                    #{index + 1}
                  </span>
                  <img
                    src={entry.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user.uid}`}
                    alt={entry.user.displayName}
                    className="h-9 w-9 shrink-0 rounded-[10px] border border-border object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-foreground" style={{ fontWeight: 590 }}>{entry.user.displayName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{entry.user.email}</p>
                  </div>
                </div>

                {[
                  entry.bugStories,
                  entry.tips,
                  entry.knowledgeProposals,
                  entry.workAchievements,
                  entry.personalAchievements,
                ].map((value, statIndex) => (
                  <div key={statIndex} className="rounded-[10px] bg-secondary/30 px-3 py-2 text-center">
                    <p className="font-serif italic text-[20px] leading-none text-foreground">{value}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground" style={{ fontWeight: 600 }}>
                      {['Bugs', 'Tips', 'Know', 'Work', 'Life'][statIndex]}
                    </p>
                  </div>
                ))}

                <div className="rounded-[10px] bg-primary/8 px-3 py-2 text-center">
                  <p className="font-serif italic text-[22px] leading-none text-foreground">{entry.totalScore}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-primary" style={{ fontWeight: 700 }}>Score</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[12px] border border-border bg-card px-4 py-6 text-center">
            <p className="text-[15px] text-foreground" style={{ fontWeight: 590 }}>Nothing on the board yet.</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Contributions inside the last {LOOKBACK_DAYS} days will show up here automatically.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <div className="page-panel-muted p-5">
          <div className="flex items-center gap-2">
            <Icon icon="solar:sort-from-bottom-to-top-bold-duotone" width={16} height={16} className="text-primary" />
            <h2 className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>Jump In</h2>
          </div>
          <p className="mt-1 text-[12px] leading-6 text-muted-foreground">
            Unengaged wall posts that may need a first comment, question, or quick triage nudge.
          </p>

          {jumpInBugs.length > 0 ? (
            <div className="mt-4 space-y-2">
              {jumpInBugs.map((bug) => (
                <div key={bug.id} className="rounded-[12px] border border-border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[13px] text-foreground" style={{ fontWeight: 590 }}>
                      {bug.title || 'Wall post'}
                    </p>
                    <span className="shrink-0 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground" style={{ fontWeight: 600 }}>
                      Open
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-6 text-muted-foreground">
                    {bug.discovery}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{bug.author}</span>
                    <span>•</span>
                    <span>{bug.tags?.length ? `#${bug.tags[0]}` : 'No tag'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[12px] border border-border bg-card px-4 py-3 text-[13px] text-muted-foreground">
              Nothing waiting right now. The wall has at least one touch on every recent post.
            </div>
          )}
        </div>

        <div className="page-panel-muted p-5">
          <button
            type="button"
            onClick={() => setShowCriteria((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <div className="flex items-center gap-2">
                <Icon icon="solar:document-text-bold-duotone" width={16} height={16} className="text-primary" />
                <h2 className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>Criteria</h2>
              </div>
              <p className="mt-1 text-[12px] leading-6 text-muted-foreground">
                Scoring model and what counts toward the quarterly board.
              </p>
            </div>
            <Icon
              icon={showCriteria ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
              width={16}
              height={16}
              className="shrink-0 text-muted-foreground"
            />
          </button>

          {showCriteria && (
            <div className="mt-4 space-y-3">
              {[
                `Bug stories: ${BUG_STORY_WEIGHT} points each`,
                `Tips shared: ${TIP_WEIGHT} points each`,
                `Knowledge posts: ${KNOWLEDGE_WEIGHT} points each`,
                `Work achievements: ${WORK_ACHIEVEMENT_WEIGHT} points each`,
                'Personal achievements: 1 point each',
                `Window: last ${LOOKBACK_DAYS} days only`,
                'Eligibility: approved members only',
                'Tiebreak: alphabetical by display name',
              ].map((item) => (
                <div key={item} className="rounded-[10px] border border-border bg-card px-3 py-2 text-[12px] text-foreground/85">
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
