import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { readFileSync } from 'fs';

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

type FirestoreDocument = {
  name?: string;
};

const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;

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

function extractBearerToken(req: IncomingMessage) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim() || null;
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

    const idToken = extractBearerToken(req);
    if (!idToken) {
      return json(res, 401, {
        error: 'Missing Firebase ID token',
        path: 'api/achievements',
      });
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
    const payload = {
      fields: {
        id: { stringValue: docId },
        title: { stringValue: achievement.title },
        category: { stringValue: achievement.category },
        story: { stringValue: achievement.story },
        impact: { stringValue: achievement.impact },
        author: { stringValue: auth?.displayName || 'Anonymous' },
        authorId: auth?.uid ? { stringValue: auth.uid } : { nullValue: null },
        authorPhotoURL: auth?.photoURL ? { stringValue: auth.photoURL } : { nullValue: null },
        date: { stringValue: 'Just now' },
        createdAt: { timestampValue: new Date().toISOString() },
        ...(achievement.achievementDate
          ? {
              achievementDate: {
                stringValue: achievement.achievementDate,
              },
            }
          : {}),
      },
    };

    const firestoreResponse = await fetch(`${firestoreBaseUrl}/achievements/${docId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        'X-Goog-Api-Key': firebaseConfig.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!firestoreResponse.ok) {
      const errorText = await firestoreResponse.text();
      console.error('Achievement API failure', errorText);
      return json(res, firestoreResponse.status, {
        error: 'Achievement proxy write failed',
        details: errorText,
        path: 'achievements',
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId,
      });
    }

    const created = (await firestoreResponse.json()) as FirestoreDocument;

    return json(res, 200, {
      id: docId,
      name: created.name,
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
