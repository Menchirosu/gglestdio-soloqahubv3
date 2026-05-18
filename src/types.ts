export type Screen = 'dashboard' | 'bug-wall' | 'tips-tricks' | 'knowledge-sharing' | 'achievements' | 'focus-zone' | 'admin-dashboard' | 'leaderboard';

export type TriageCategory = 'bug' | 'question' | 'feature_request' | 'process_issue' | 'noise';
export type TriageSeverity = 'low' | 'medium' | 'high' | 'critical';
export type TriageReviewStatus = 'pending' | 'review_required' | 'reviewed';

export interface TriageReviewEvent {
  status: Exclude<TriageReviewStatus, 'pending'>;
  note: string;
  timestamp: string;
}

export interface BugTriage {
  category: TriageCategory;
  severity: TriageSeverity;
  confidence: number;
  summary: string;
  suggested_next_step: string;
  needs_human_review: boolean;
  reasoning_short: string;
  review_status?: TriageReviewStatus;
  review_note?: string;
  review_history?: TriageReviewEvent[];
}

export interface Comment {
  id: string;
  author: string;
  authorId?: string;
  authorPhotoURL?: string;
  text: string;
  date: string;
  isAnonymous?: boolean;
  isBot?: boolean;
  createdAt?: string;
  imageUrl?: string;
  imageUrls?: string[];
  gifUrl?: string;
  likes?: string[];
  replies?: Comment[];
}

export interface BugStory {
  id: string;
  author: string;
  authorId?: string;
  authorPhotoURL?: string;
  isAnonymous?: boolean;
  date: string;
  title: string;
  impact: string;
  mood: string;
  tags: string[];
  discovery: string;
  lesson: string;
  reactions: Record<string, number>;
  reactedBy?: Record<string, string[]>;
  comments?: Comment[];
  createdAt?: any;
  imageUrl?: string;
  imageUrls?: string[];
  gifUrl?: string;
  triage?: BugTriage;
}

export interface Tip {
  id: string;
  cat: string;
  title: string;
  desc: string;
  scenario: string;
  author: string;
  authorId?: string;
  time: string;
  date?: string;
  createdAt?: any;
  highlight?: boolean;
  reactions?: Record<string, number>;
  reactedBy?: Record<string, string[]>;
}


export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'system' | 'meeting';
  title: string;
  desc: string;
  time: string;
  isRead: boolean;
  targetId?: string; // ID of the post/tip/etc.
  targetScreen?: Screen;
  recipientId: string;
}

export interface ProposalMeeting {
  scheduledFor: string;
  link?: string;
  agenda?: string;
  scheduledBy?: string;
  scheduledById?: string;
  updatedAt?: any;
}

export interface Proposal {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  authorId?: string;
  authorPhotoURL?: string;
  date: string;
  createdAt?: any;
  type?: 'Session' | 'Resource';
  tags?: string[];
  status?: 'idea' | 'scheduled' | 'presented';
  scope?: string;
  meeting?: ProposalMeeting | null;
  presenterId?: string | null;
  presenterName?: string | null;
  presentedAt?: any;
  presentedById?: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  category: 'Work' | 'Personal';
  story: string;
  impact: string;
  achievementDate?: string;
  author: string;
  authorId?: string;
  authorPhotoURL?: string;
  date: string;
  createdAt?: any;
}
