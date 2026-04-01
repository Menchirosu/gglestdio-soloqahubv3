import { Timestamp } from 'firebase/firestore';
import { UserProfile } from '../firebase';

export type RankActivityItem = {
  authorId?: string | null;
  createdAt?: unknown;
  category?: 'Work' | 'Personal';
  isDeleted?: boolean;
  deletedAt?: unknown;
};

export type QaLeaderboardEntry = {
  user: UserProfile;
  bugStories: number;
  tips: number;
  knowledgeProposals: number;
  workAchievements: number;
  personalAchievements: number;
  totalScore: number;
};

export const LOOKBACK_DAYS = 30;
export const BUG_STORY_WEIGHT = 5;
export const TIP_WEIGHT = 3;
export const KNOWLEDGE_WEIGHT = 3;
export const WORK_ACHIEVEMENT_WEIGHT = 2;

export function toMillis(value: unknown): number | null {
  if (!value) return null;

  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (typeof value === 'object' && value !== null) {
    if ('toMillis' in value && typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if ('seconds' in value && typeof value.seconds === 'number') {
      return value.seconds * 1000;
    }
  }

  if (typeof value === 'string' || value instanceof Date || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

export function isActiveContribution(item: RankActivityItem, cutoffTime: number) {
  if (!item.authorId || item.isDeleted || item.deletedAt) {
    return false;
  }

  const createdAtMillis = toMillis(item.createdAt);
  return createdAtMillis !== null && createdAtMillis >= cutoffTime;
}

export function computeQaLeaderboard({
  users,
  bugs,
  tips,
  proposals,
  achievements,
  now = Date.now(),
}: {
  users: UserProfile[];
  bugs: RankActivityItem[];
  tips: RankActivityItem[];
  proposals: RankActivityItem[];
  achievements: RankActivityItem[];
  now?: number;
}) {
  const cutoffTime = now - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const eligibleUsers = users.filter((user) => user.status === 'approved');

  return eligibleUsers
    .map((user) => {
      const bugStories = bugs.filter((item) => isActiveContribution(item, cutoffTime) && item.authorId === user.uid).length;
      const tipCount = tips.filter((item) => isActiveContribution(item, cutoffTime) && item.authorId === user.uid).length;
      const knowledgeProposals = proposals.filter((item) => isActiveContribution(item, cutoffTime) && item.authorId === user.uid).length;
      const workAchievements = achievements.filter(
        (item) => isActiveContribution(item, cutoffTime) && item.authorId === user.uid && item.category === 'Work'
      ).length;
      const personalAchievements = achievements.filter(
        (item) => isActiveContribution(item, cutoffTime) && item.authorId === user.uid && item.category === 'Personal'
      ).length;

      return {
        user,
        bugStories,
        tips: tipCount,
        knowledgeProposals,
        workAchievements,
        personalAchievements,
        totalScore:
          bugStories * BUG_STORY_WEIGHT +
          tipCount * TIP_WEIGHT +
          knowledgeProposals * KNOWLEDGE_WEIGHT +
          workAchievements * WORK_ACHIEVEMENT_WEIGHT +
          personalAchievements,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore || a.user.displayName.localeCompare(b.user.displayName));
}
