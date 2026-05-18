import type { User } from 'firebase/auth';
import type { UserProfile } from './firebase';
import type { BugStory, Comment } from './types';

const GIF_DATA_URI = 'data:image/gif;base64,R0lGODlhAQABAPAAAPXq2P///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';

function svgDataUri(label: string, bg: string, fg: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="100%" stop-color="${fg}" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" rx="28" fill="url(#g)" />
      <circle cx="112" cy="92" r="34" fill="rgba(255,255,255,0.18)" />
      <circle cx="520" cy="256" r="58" fill="rgba(255,255,255,0.12)" />
      <text x="48" y="302" fill="white" font-family="Georgia, serif" font-size="42" font-weight="700">${label}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function makeTimestamp(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

export function isE2EMode(): boolean {
  if (import.meta.env.VITE_E2E_TEST_MODE === 'true') return true;
  if (typeof window === 'undefined') return false;

  try {
    if (window.localStorage.getItem('lumie-e2e') === 'on') return true;
  } catch {
    // Ignore storage access failures.
  }

  return new URLSearchParams(window.location.search).get('e2e') === '1';
}

export const e2ePresetGifs = [
  { id: 'calm-loop', label: 'Calm loop', url: GIF_DATA_URI },
  { id: 'signal-pulse', label: 'Signal pulse', url: GIF_DATA_URI },
  { id: 'ship-it', label: 'Ship it', url: GIF_DATA_URI },
];

export const e2eMockProfile: UserProfile = {
  uid: 'e2e-approved-user',
  email: 'e2e@example.com',
  displayName: 'E2E Reviewer',
  photoURL: svgDataUri('ER', '#d97706', '#7c2d12'),
  status: 'approved',
  role: 'admin',
  createdAt: new Date() as never,
};

export const e2eMockUser = {
  uid: e2eMockProfile.uid,
  email: e2eMockProfile.email,
  displayName: e2eMockProfile.displayName,
  photoURL: e2eMockProfile.photoURL,
  emailVerified: true,
  isAnonymous: false,
  tenantId: null,
  providerData: [],
  getIdToken: async () => 'e2e-token',
} as User;

function baseComment(overrides: Partial<Comment>): Comment {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    author: overrides.author ?? 'Unknown',
    text: overrides.text ?? '',
    date: overrides.date ?? 'Just now',
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    authorId: overrides.authorId,
    authorPhotoURL: overrides.authorPhotoURL,
    imageUrl: overrides.imageUrl,
    imageUrls: overrides.imageUrls,
    gifUrl: overrides.gifUrl,
    likes: overrides.likes ?? [],
    replies: overrides.replies ?? [],
    isAnonymous: overrides.isAnonymous,
    isBot: overrides.isBot,
  };
}

export function createE2ESeedBugs(): BugStory[] {
  const replyA = baseComment({
    id: 'reply-seed-1',
    author: 'Mina',
    authorId: 'user-mina',
    authorPhotoURL: svgDataUri('MN', '#2563eb', '#1d4ed8'),
    text: 'Reply path should preserve the media payload too. Right now the thread loses that context.',
    date: '8m ago',
    createdAt: makeTimestamp(8),
    imageUrl: svgDataUri('Reply', '#0f766e', '#14b8a6'),
    imageUrls: [svgDataUri('Reply', '#0f766e', '#14b8a6')],
  });

  const commentA = baseComment({
    id: 'comment-seed-1',
    author: 'Mina',
    authorId: 'user-mina',
    authorPhotoURL: svgDataUri('MN', '#2563eb', '#1d4ed8'),
    text: 'I can reproduce this on Safari. The spinner keeps running after the card appears in the feed.',
    date: '14m ago',
    createdAt: makeTimestamp(14),
    imageUrl: svgDataUri('Comment', '#7c3aed', '#312e81'),
    imageUrls: [svgDataUri('Comment', '#7c3aed', '#312e81')],
    replies: [replyA],
  });

  const commentB = baseComment({
    id: 'comment-seed-2',
    author: 'Noel',
    authorId: 'user-noel',
    authorPhotoURL: svgDataUri('NL', '#be123c', '#881337'),
    text: 'GIF send also fails in the thread. Preview renders, submit does nothing.',
    date: '11m ago',
    createdAt: makeTimestamp(11),
    gifUrl: GIF_DATA_URI,
  });

  return [
    {
      id: 'bug-seed-1',
      author: 'Rhea',
      authorId: 'user-rhea',
      authorPhotoURL: svgDataUri('RH', '#15803d', '#14532d'),
      isAnonymous: false,
      date: '32m ago',
      title: 'Spinner persists after successful post',
      impact: 'Shared Story',
      mood: 'Neutral',
      tags: ['wall', 'posting', 'async'],
      discovery: 'Posting to the wall succeeds, but the composer spinner sometimes keeps spinning long after the card lands in the feed.',
      lesson: 'Shared via Wall',
      reactions: { '❤️': 3 },
      reactedBy: { '❤️': ['user-mina', 'user-noel', 'e2e-approved-user'] },
      comments: [commentA, commentB],
      createdAt: { toMillis: () => Date.now() - 32 * 60_000 },
      imageUrl: svgDataUri('Post', '#9a3412', '#431407'),
      imageUrls: [svgDataUri('Post', '#9a3412', '#431407')],
    },
    {
      id: 'bug-seed-2',
      author: 'Kara',
      authorId: 'user-kara',
      authorPhotoURL: svgDataUri('KR', '#b45309', '#78350f'),
      isAnonymous: false,
      date: '19m ago',
      title: 'GIF attachment regression',
      impact: 'Shared Story',
      mood: 'Neutral',
      tags: ['gifs', 'composer'],
      discovery: 'Top-level post accepts GIF preview, but thread composers need the same capability for comments and replies.',
      lesson: 'Shared via Wall',
      reactions: { '❤️': 1 },
      reactedBy: { '❤️': ['user-rhea'] },
      comments: [],
      createdAt: { toMillis: () => Date.now() - 19 * 60_000 },
      gifUrl: GIF_DATA_URI,
    },
    {
      id: 'bug-seed-3',
      author: e2eMockProfile.displayName,
      authorId: e2eMockProfile.uid,
      authorPhotoURL: e2eMockProfile.photoURL,
      isAnonymous: false,
      date: '6m ago',
      title: 'Media parity for thread composer',
      impact: 'Shared Story',
      mood: 'Neutral',
      tags: ['comments', 'reply'],
      discovery: 'This seed exists so Playwright can validate owner actions, hover states, and thread expansion against a current-user post.',
      lesson: 'Shared via Wall',
      reactions: {},
      reactedBy: {},
      comments: [],
      createdAt: { toMillis: () => Date.now() - 6 * 60_000 },
      imageUrls: [
        svgDataUri('Grid A', '#0f766e', '#134e4a'),
        svgDataUri('Grid B', '#7e22ce', '#581c87'),
      ],
    },
  ];
}
