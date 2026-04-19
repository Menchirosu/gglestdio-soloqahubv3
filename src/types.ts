export type Screen = 'dashboard' | 'bug-wall' | 'tips-tricks' | 'knowledge-sharing' | 'achievements' | 'focus-zone' | 'admin-dashboard' | 'leaderboard';

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
}


export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'system';
  title: string;
  desc: string;
  time: string;
  isRead: boolean;
  targetId?: string; // ID of the post/tip/etc.
  targetScreen?: Screen;
  recipientId: string;
}

export interface Proposal {
  id: string;
  title: string;
  scope: string;
  author: string;
  authorId?: string;
  date: string;
  createdAt?: any;
  type?: 'Session' | 'Resource';
  tags?: string[];
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
