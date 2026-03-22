import { 
  LayoutDashboard, 
  Bug, 
  Lightbulb, 
  BookOpen, 
  AlertTriangle, 
  Focus,
  LucideIcon
} from 'lucide-react';

export type Screen = 'dashboard' | 'bug-wall' | 'tips-tricks' | 'knowledge-sharing' | 'concerns' | 'focus-zone' | 'admin-dashboard';

export interface NavItem {
  id: Screen;
  label: string;
  icon: LucideIcon;
}

export interface Comment {
  id: string;
  author: string;
  authorId?: string;
  authorPhotoURL?: string;
  text: string;
  date: string;
  isAnonymous?: boolean;
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
  highlight?: boolean;
}

export interface Concern {
  id: string;
  author: string;
  authorId?: string;
  isAnonymous: boolean;
  date: string;
  category: string;
  content: string;
  status: 'Under Review' | 'Resolved' | 'In Progress';
  adminResponse?: string;
  helpfulCount: number;
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
  type?: 'Session' | 'Resource';
  tags?: string[];
}
