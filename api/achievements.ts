import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import firebaseConfig from '../firebase-applet-config.json';

type JsonBody = {
  achievement?: {
    title?: string;
    category?: 'Work' | 'Personal';
    story?: string;
    impact?: string;
    achievementDate?: string;
  };
  auth?: {
    idToken?: string;
    uid?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  };
};

function readBody(req: IncomingMessage) {
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

function stringField(value: string) {
  return { stringValue: value };
}

function nullableStringField(value?: string | null) {
  if (value == null || value === '') {
    return { nullValue: null };
  }
  return { stringValue: value };
}

function timestampField(value: string) {
  return { timestampValue: value };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const rawBody = await readBody(req);
    const body = JSON.parse(rawBody || '{}') as JsonBody;
    const achievement = body.achievement;
    const auth = body.auth;

    if (!achievement || !auth?.idToken) {
      return json(res, 400, { error: 'Missing achievement payload or auth token' });
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
    const nowIso = new Date().toISOString();
    const endpoint =
      `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}` +
      `/databases/${firebaseConfig.firestoreDatabaseId}/documents/achievements?documentId=${docId}`;

    const fields: Record<string, unknown> = {
      id: stringField(docId),
      title: stringField(achievement.title),
      category: stringField(achievement.category),
      story: stringField(achievement.story),
      impact: stringField(achievement.impact),
      author: stringField(auth.displayName || 'Anonymous'),
      authorId: nullableStringField(auth.uid),
      authorPhotoURL: nullableStringField(auth.photoURL),
      date: stringField('Just now'),
      createdAt: timestampField(nowIso),
    };

    if (achievement.achievementDate) {
      fields.achievementDate = stringField(achievement.achievementDate);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    const text = await response.text();
    let data: unknown = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      return json(res, response.status, {
        error: 'Firestore proxy write failed',
        firestore: data,
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId,
        path: `achievements/${docId}`,
      });
    }

    return json(res, 200, {
      id: docId,
      firestore: data,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
    });
  } catch (error) {
    return json(res, 500, {
      error: error instanceof Error ? error.message : String(error),
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
    });
  }
}
