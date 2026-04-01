import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, approveUser, rejectUser, UserProfile } from '../firebase';
import { Award, BriefcaseBusiness, BookOpen, Clock, ShieldCheck, ShieldX, Sparkles, Trophy, UserCheck, Users, Bug, Lightbulb } from 'lucide-react';
import { BUG_STORY_WEIGHT, KNOWLEDGE_WEIGHT, LOOKBACK_DAYS, QaLeaderboardEntry, RankActivityItem, TIP_WEIGHT, WORK_ACHIEVEMENT_WEIGHT, computeQaLeaderboard } from '../utils/qaRanking';

export const AdminDashboard: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [bugs, setBugs] = useState<RankActivityItem[]>([]);
  const [tips, setTips] = useState<RankActivityItem[]>([]);
  const [proposals, setProposals] = useState<RankActivityItem[]>([]);
  const [achievements, setAchievements] = useState<RankActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const bugsQuery = query(collection(db, 'bugs'), orderBy('createdAt', 'desc'));
    const tipsQuery = query(collection(db, 'tips'), orderBy('createdAt', 'desc'));
    const proposalsQuery = query(collection(db, 'proposals'), orderBy('createdAt', 'desc'));
    const achievementsQuery = query(collection(db, 'achievements'), orderBy('createdAt', 'desc'));

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const users = snapshot.docs.map((doc) => doc.data() as UserProfile);
      setAllUsers(users);
      setPendingUsers(users.filter((user) => user.status === 'pending'));
      setLoading(false);
    });

    const unsubscribeBugs = onSnapshot(bugsQuery, (snapshot) => {
      setBugs(snapshot.docs.map((doc) => doc.data() as RankActivityItem));
    });

    const unsubscribeTips = onSnapshot(tipsQuery, (snapshot) => {
      setTips(snapshot.docs.map((doc) => doc.data() as RankActivityItem));
    });

    const unsubscribeProposals = onSnapshot(proposalsQuery, (snapshot) => {
      setProposals(snapshot.docs.map((doc) => doc.data() as RankActivityItem));
    });

    const unsubscribeAchievements = onSnapshot(achievementsQuery, (snapshot) => {
      setAchievements(snapshot.docs.map((doc) => doc.data() as RankActivityItem));
    });

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
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-on-surface">Admin Control Center</h1>
          <p className="text-on-surface-variant">Manage user access and see who is carrying the strongest QA signal this month.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold">
          <ShieldCheck size={18} />
          Admin Access
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-widest">Pending</span>
            <Clock size={16} className="text-primary" />
          </div>
          <p className="text-4xl font-bold text-on-surface">{pendingUsers.length}</p>
        </div>
        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-widest">Approved</span>
            <UserCheck size={16} className="text-emerald-500" />
          </div>
          <p className="text-4xl font-bold text-on-surface">{allUsers.filter((user) => user.status === 'approved').length}</p>
        </div>
        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-widest">Total Users</span>
            <Users size={16} className="text-on-surface" />
          </div>
          <p className="text-4xl font-bold text-on-surface">{allUsers.length}</p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Award size={20} className="text-amber-500" />
          <div>
            <h2 className="text-xl font-bold text-on-surface">Top QA Leaderboard</h2>
            <p className="text-sm text-on-surface-variant">Approved users over the last {LOOKBACK_DAYS} days. Score = bugs x{BUG_STORY_WEIGHT}, tips x{TIP_WEIGHT}, knowledge x{KNOWLEDGE_WEIGHT}, work achievements x{WORK_ACHIEVEMENT_WEIGHT}, personal achievements x1.</p>
          </div>
        </div>

        {topQa ? (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
            <div className="rounded-[2rem] border border-amber-500/20 bg-gradient-to-br from-amber-500/12 via-surface-container-low to-surface p-6 shadow-lg shadow-amber-950/5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                    <Trophy size={14} />
                    Rank #1
                  </div>
                  <div className="flex items-center gap-4">
                    <img
                      src={topQa.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topQa.user.uid}`}
                      alt={topQa.user.displayName}
                      className="w-16 h-16 rounded-2xl object-cover border border-white/40"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="text-2xl font-black text-on-surface">{topQa.user.displayName}</h3>
                      <p className="text-sm text-on-surface-variant">{topQa.user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-outline">Total Score</p>
                  <p className="text-5xl font-black text-on-surface">{topQa.totalScore}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="rounded-2xl bg-surface-container-high/60 px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">Bugs</p>
                  <p className="mt-2 text-2xl font-black text-on-surface">{topQa.bugStories}</p>
                </div>
                <div className="rounded-2xl bg-surface-container-high/60 px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">Tips</p>
                  <p className="mt-2 text-2xl font-black text-on-surface">{topQa.tips}</p>
                </div>
                <div className="rounded-2xl bg-surface-container-high/60 px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">Knowledge</p>
                  <p className="mt-2 text-2xl font-black text-on-surface">{topQa.knowledgeProposals}</p>
                </div>
                <div className="rounded-2xl bg-surface-container-high/60 px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">Work Wins</p>
                  <p className="mt-2 text-2xl font-black text-on-surface">{topQa.workAchievements}</p>
                </div>
                <div className="rounded-2xl bg-surface-container-high/60 px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">Personal</p>
                  <p className="mt-2 text-2xl font-black text-on-surface">{topQa.personalAchievements}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-low p-6">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                <h3 className="text-lg font-black text-on-surface">Top 5 Members</h3>
              </div>

              <div className="mt-5 space-y-3">
                {leaderboard.map((entry, index) => (
                  <div key={entry.user.uid} className="rounded-2xl border border-outline-variant/10 bg-surface px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={entry.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user.uid}`}
                          alt={entry.user.displayName}
                          className="w-11 h-11 rounded-xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-on-surface">#{index + 1} {entry.user.displayName}</p>
                          <p className="truncate text-[11px] text-outline">{entry.user.email}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-2xl font-black text-on-surface">{entry.totalScore}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-outline">Score</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-3 py-1.5 text-error">
                        <Bug size={12} />
                        {entry.bugStories} bugs
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-primary">
                        <Lightbulb size={12} />
                        {entry.tips} tips
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-3 py-1.5 text-violet-600 dark:text-violet-300">
                        <BookOpen size={12} />
                        {entry.knowledgeProposals} knowledge
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1.5 text-emerald-700 dark:text-emerald-300">
                        <BriefcaseBusiness size={12} />
                        {entry.workAchievements} work wins
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-3 py-1.5 text-sky-700 dark:text-sky-300">
                        <Sparkles size={12} />
                        {entry.personalAchievements} personal
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-outline-variant/20 bg-surface-container-low p-10 text-center space-y-2">
            <p className="text-lg font-bold text-on-surface">No scored member activity yet.</p>
            <p className="text-sm text-on-surface-variant">The leaderboard will populate once approved members contribute bugs, tips, knowledge entries, or achievements within the last 30 days.</p>
          </div>
        )}
      </section>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <Clock size={20} className="text-primary" />
          Pending Approvals
        </h2>

        {pendingUsers.length === 0 ? (
          <div className="bg-surface-container-low p-12 rounded-3xl border border-dashed border-outline-variant/20 text-center space-y-2">
            <p className="text-on-surface-variant font-medium">No pending requests at the moment.</p>
            <p className="text-sm text-outline">New users will appear here when they sign up.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div key={user.uid} className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 flex items-center justify-between hover:border-primary/20 transition-all">
                <div className="flex items-center gap-4">
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                    alt={user.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="font-bold text-on-surface">{user.displayName}</h3>
                    <p className="text-sm text-outline">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReject(user.uid)}
                    className="px-3 py-2 text-error border border-error/20 hover:bg-error/10 rounded-xl transition-all flex items-center gap-2 text-sm font-bold"
                    title="Reject User"
                  >
                    <ShieldX size={16} />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(user.uid)}
                    className="px-4 py-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 text-sm"
                  >
                    <UserCheck size={16} />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <UserCheck size={20} className="text-emerald-500" />
          User Directory
        </h2>
        <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high/50">
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {allUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-surface-container-high/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                        alt={user.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="text-sm font-bold text-on-surface">{user.displayName}</p>
                        <p className="text-[10px] text-outline">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                      user.status === 'pending' ? 'bg-primary/10 text-primary' :
                      'bg-error/10 text-error'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-on-surface-variant font-medium">{user.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-outline">
                      {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
