import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = JSON.parse(
  readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8')
) as {
  apiKey: string;
  projectId: string;
  appId: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
};

const firebaseApp =
  getApps().find((app) => app.options.projectId === firebaseConfig.projectId) ||
  initializeApp({
    apiKey: firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId,
    appId: firebaseConfig.appId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
  });

const firestore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

type JsonBody = {
  achievement?: {
    title?: string;
    category?: 'Work' | 'Personal';
    story?: string;
    impact?: string;
    achievementDate?: string;
  };
  auth?: {
    uid?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  };
};

async function readBody(req: IncomingMessage & { body?: unknown }) {
  if (typeof req.body === 'string') {
    return req.body;
  }

  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }

  return new Promise<string>((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const rawBody = await readBody(req as IncomingMessage & { body?: unknown });
    const body = JSON.parse(rawBody || '{}') as JsonBody;
    const achievement = body.achievement;
    const auth = body.auth;

    if (!achievement) {
      return json(res, 400, { error: 'Missing achievement payload' });
    }

    if (
      !achievement.title ||
      !achievement.category ||
      !achievement.story ||
      !achievement.impact
    ) {
      return json(res, 400, { error: 'Missing required achievement fields' });
    }

    const docId = crypto.randomUUID();
    const achievementRef = doc(collection(firestore, 'achievements'), docId);
    const payload: Record<string, unknown> = {
      id: docId,
      title: achievement.title,
      category: achievement.category,
      story: achievement.story,
      impact: achievement.impact,
      author: auth?.displayName || 'Anonymous',
      authorId: auth?.uid ?? null,
      authorPhotoURL: auth?.photoURL ?? null,
      date: 'Just now',
      createdAt: Timestamp.now(),
    };

    if (achievement.achievementDate) {
      payload.achievementDate = achievement.achievementDate;
    }

    await setDoc(achievementRef, payload);

    return json(res, 200, {
      id: docId,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
    });
  } catch (error) {
    console.error('Achievement API failure', error);
    return json(res, 500, {
      error: error instanceof Error ? error.message : String(error),
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
    });
  }
}
