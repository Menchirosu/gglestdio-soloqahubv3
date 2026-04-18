import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Icon } from '@iconify/react';
import { db, approveUser, rejectUser, UserProfile } from '../firebase';
import {
  BUG_STORY_WEIGHT,
  KNOWLEDGE_WEIGHT,
  LOOKBACK_DAYS,
  QaLeaderboardEntry,
  RankActivityItem,
  TIP_WEIGHT,
  WORK_ACHIEVEMENT_WEIGHT,
  computeQaLeaderboard,
} from '../utils/qaRanking';

const SAGE = '#5A8B58';
const SAGE_DARK = '#3F6B3E';
const TERRA = '#C86948';

export const AdminDashboard: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [bugs, setBugs] = useState<RankActivityItem[]>([]);
  const [tips, setTips] = useState<RankActivityItem[]>([]);
  const [proposals, setProposals] = useState<RankActivityItem[]>([]);
  const [achievements, setAchievements] = useState<RankActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const bugsQuery = query(collection(db, 'bugs'), orderBy('createdAt', 'desc'));
    const tipsQuery = query(collection(db, 'tips'), orderBy('createdAt', 'desc'));
    const proposalsQuery = query(collection(db, 'proposals'), orderBy('createdAt', 'desc'));
    const achievementsQuery = query(collection(db, 'achievements'), orderBy('createdAt', 'desc'));

    const handleSnapshotError = (label: string, error: unknown) => {
      console.error(`Error loading admin ${label}:`, error);
      setLoadError(`Failed to load admin ${label}. Check Firestore permissions and indexes.`);
      setLoading(false);
    };

    const unsubscribeUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        const users = snapshot.docs.map((doc) => doc.data() as UserProfile);
        setAllUsers(users);
        setPendingUsers(users.filter((user) => user.status === 'pending'));
        setLoadError(null);
        setLoading(false);
      },
      (error) => handleSnapshotError('users', error)
    );

    const unsubscribeBugs = onSnapshot(
      bugsQuery,
      (snapshot) => {
        setBugs(snapshot.docs.map((doc) => doc.data() as RankActivityItem));
      },
      (error) => handleSnapshotError('bugs', error)
    );

    const unsubscribeTips = onSnapshot(
      tipsQuery,
      (snapshot) => {
        setTips(snapshot.docs.map((doc) => doc.data() as RankActivityItem));
      },
      (error) => handleSnapshotError('tips', error)
    );

    const unsubscribeProposals = onSnapshot(
      proposalsQuery,
      (snapshot) => {
        setProposals(snapshot.docs.map((doc) => doc.data() as RankActivityItem));
      },
      (error) => handleSnapshotError('knowledge posts', error)
    );

    const unsubscribeAchievements = onSnapshot(
      achievementsQuery,
      (snapshot) => {
        setAchievements(snapshot.docs.map((doc) => doc.data() as RankActivityItem));
      },
      (error) => handleSnapshotError('achievements', error)
    );

    return () => {
      unsubscribeUsers();
      unsubscribeBugs();
      unsubscribeTips();
      unsubscribeProposals();
      unsubscribeAchievements();
    };
  }, []);

  const leaderboard = useMemo(() => {
    return computeQaLeaderboard({
      users: allUsers,
      bugs,
      tips,
      proposals,
      achievements,
    })
      .filter((entry) => entry.totalScore > 0)
      .slice(0, 5);
  }, [allUsers, bugs, tips, proposals, achievements]);

  const topQa: QaLeaderboardEntry | null = leaderboard[0] ?? null;

  const handleApprove = async (uid: string) => {
    try {
      await approveUser(uid);
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleReject = async (uid: string) => {
    try {
      await rejectUser(uid);
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="page-empty text-left">
          <p className="whisper text-[18px] text-foreground" style={{ fontStyle: 'italic' }}>Admin panel failed to load.</p>
          <p className="mt-2 text-[13px] leading-7 text-muted-foreground">{loadError}</p>
        </div>
      </div>
    );
  }

  const approvedCount = allUsers.filter((user) => user.status === 'approved').length;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Hero */}
      <div className="page-hero flex items-start justify-between gap-4 px-6 py-5">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground" style={{ fontWeight: 600 }}>
            Admin
          </p>
          <h1 className="page-title-serif text-[32px] text-foreground">
            <span style={{ fontStyle: 'italic' }}>Control center.</span>
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Manage access and see who is carrying the strongest QA signal this month.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] text-primary shrink-0" style={{ fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <Icon icon="solar:shield-check-bold-duotone" width={14} height={14} />
          Admin Access
        </div>
      </div>

      {/* Stat tiles — dense density per Q7 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-[12px] border border-border bg-card px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>Pending</span>
            <Icon icon="solar:clock-circle-bold-duotone" width={14} height={14} className="text-primary" />
          </div>
          <p className="mt-2 font-serif italic tabular-nums text-[32px] text-foreground leading-none" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
            {pendingUsers.length}
          </p>
        </div>
        <div className="rounded-[12px] border border-border bg-card px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>Approved</span>
            <Icon icon="solar:user-check-bold-duotone" width={14} height={14} style={{ color: SAGE }} />
          </div>
          <p className="mt-2 font-serif italic tabular-nums text-[32px] text-foreground leading-none" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
            {approvedCount}
          </p>
        </div>
        <div className="rounded-[12px] border border-border bg-card px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>Total Users</span>
            <Icon icon="solar:users-group-rounded-bold-duotone" width={14} height={14} className="text-foreground" />
          </div>
          <p className="mt-2 font-serif italic tabular-nums text-[32px] text-foreground leading-none" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
            {allUsers.length}
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon icon="solar:cup-star-bold-duotone" width={18} height={18} style={{ color: TERRA }} />
          <div>
            <h2 className="text-[18px] text-foreground" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>Top QA Leaderboard</h2>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Approved users over the last {LOOKBACK_DAYS} days. Score = bugs x{BUG_STORY_WEIGHT}, tips x{TIP_WEIGHT}, knowledge x{KNOWLEDGE_WEIGHT}, work achievements x{WORK_ACHIEVEMENT_WEIGHT}, personal achievements x1.
            </p>
          </div>
        </div>

        {topQa ? (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
            {/* Top-1 spotlight */}
            <div className="page-panel p-5 ring-1 ring-primary/20">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-primary" style={{ fontWeight: 600 }}>
                    <Icon icon="solar:medal-star-bold-duotone" width={12} height={12} />
                    Rank #1
                  </div>
                  <div className="flex items-center gap-4">
                    <img
                      src={topQa.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topQa.user.uid}`}
                      alt={topQa.user.displayName}
                      className="w-14 h-14 rounded-[10px] object-cover border border-border"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="text-[18px] text-foreground" style={{ fontWeight: 600 }}>{topQa.user.displayName}</h3>
                      <p className="text-[12px] text-muted-foreground">{topQa.user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>Total Score</p>
                  <p className="mt-1 font-serif italic tabular-nums text-[48px] text-foreground leading-none" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
                    {topQa.totalScore}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { label: 'Bugs', value: topQa.bugStories },
                  { label: 'Tips', value: topQa.tips },
                  { label: 'Knowledge', value: topQa.knowledgeProposals },
                  { label: 'Work Wins', value: topQa.workAchievements },
                  { label: 'Personal', value: topQa.personalAchievements },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[10px] bg-secondary/60 px-3 py-2.5">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground" style={{ fontWeight: 600 }}>{stat.label}</p>
                    <p className="mt-1 font-serif italic tabular-nums text-[20px] text-foreground leading-none" style={{ fontWeight: 500 }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 */}
            <div className="page-panel-muted p-5">
              <div className="flex items-center gap-2">
                <Icon icon="solar:chart-2-bold-duotone" width={14} height={14} className="text-primary" />
                <h3 className="text-[13px] text-foreground" style={{ fontWeight: 600 }}>Top 5 Members</h3>
              </div>

              <div className="mt-3 space-y-2">
                {leaderboard.map((entry, index) => (
                  <div key={entry.user.uid} className="rounded-[10px] border border-border bg-card px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={entry.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user.uid}`}
                          alt={entry.user.displayName}
                          className="w-9 h-9 rounded-[8px] object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] text-foreground" style={{ fontWeight: 590 }}>
                            #{index + 1} {entry.user.displayName}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{entry.user.email}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-serif italic tabular-nums text-[18px] text-foreground leading-none" style={{ fontWeight: 500 }}>
                          {entry.totalScore}
                        </p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground" style={{ fontWeight: 600 }}>Score</p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1 text-[10px]">
                      {[
                        { icon: 'solar:bug-bold-duotone', label: `${entry.bugStories} bugs` },
                        { icon: 'solar:lightbulb-bold-duotone', label: `${entry.tips} tips` },
                        { icon: 'solar:book-bookmark-bold-duotone', label: `${entry.knowledgeProposals} knowledge` },
                        { icon: 'solar:case-minimalistic-bold-duotone', label: `${entry.workAchievements} work wins` },
                        { icon: 'solar:heart-bold-duotone', label: `${entry.personalAchievements} personal` },
                      ].map((chip, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary/70 px-2 py-0.5 text-foreground/80" style={{ fontWeight: 500 }}>
                          <Icon icon={chip.icon} width={10} height={10} className="text-muted-foreground" />
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="page-empty text-center">
            <p className="whisper text-[18px] text-foreground" style={{ fontStyle: 'italic' }}>No scored member activity yet.</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              The leaderboard will populate once approved members contribute bugs, tips, knowledge entries, or achievements within the last {LOOKBACK_DAYS} days.
            </p>
          </div>
        )}
      </section>

      {/* Pending approvals */}
      <div className="space-y-3">
        <h2 className="text-[16px] text-foreground flex items-center gap-2" style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
          <Icon icon="solar:clock-circle-bold-duotone" width={16} height={16} className="text-primary" />
          Pending Approvals
        </h2>

        {pendingUsers.length === 0 ? (
          <div className="page-empty">
            <p className="whisper text-[16px] text-foreground" style={{ fontStyle: 'italic' }}>Nothing waiting.</p>
            <p className="mt-1 text-[12px] text-muted-foreground">New members appear here when they sign in.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingUsers.map((user) => (
              <div key={user.uid} className="page-panel flex items-center justify-between px-4 py-3 transition-colors hover:border-primary/30">
                <div className="flex items-center gap-3">
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                    alt={user.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-[13px] text-foreground" style={{ fontWeight: 590 }}>{user.displayName}</h3>
                    <p className="text-[12px] text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReject(user.uid)}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-destructive/25 px-3 py-1.5 text-[12px] text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
                    style={{ fontWeight: 590 }}
                    title="Reject User"
                  >
                    <Icon icon="solar:shield-cross-bold-duotone" width={14} height={14} />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(user.uid)}
                    className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-3.5 py-1.5 text-[12px] text-white shadow-sm shadow-primary/15 transition-colors hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    style={{ fontWeight: 590 }}
                  >
                    <Icon icon="solar:user-check-bold-duotone" width={14} height={14} />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User directory */}
      <div className="space-y-3">
        <h2 className="text-[16px] text-foreground flex items-center gap-2" style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
          <Icon icon="solar:user-check-bold-duotone" width={16} height={16} style={{ color: SAGE }} />
          User Directory
        </h2>
        <div className="rounded-[12px] border border-border bg-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50">
                <th className="px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>User</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>Status</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>Role</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={{ fontWeight: 600 }}>Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allUsers.map((user) => {
                const statusStyle =
                  user.status === 'approved'
                    ? { color: SAGE_DARK, bg: `${SAGE}1A` }
                    : user.status === 'pending'
                    ? { color: TERRA, bg: `${TERRA}1A` }
                    : { color: '#C73D35', bg: '#C73D351A' };
                return (
                  <tr key={user.uid} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                          alt={user.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-[12px] text-foreground" style={{ fontWeight: 590 }}>{user.displayName}</p>
                          <p className="text-[10px] text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]"
                        style={{ fontWeight: 600, color: statusStyle.color, background: statusStyle.bg }}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] text-muted-foreground">{user.role}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] text-muted-foreground">
                        {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'Just now'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
