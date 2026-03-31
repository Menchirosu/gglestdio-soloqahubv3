import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

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

type ServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

const firebaseConfig = JSON.parse(
  readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8')
) as {
  firestoreDatabaseId: string;
};

function readServiceAccount(): ServiceAccountJson {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!base64) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON_BASE64');
  }

  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as ServiceAccountJson;
}

function getAdminApp(): App {
  const serviceAccount = readServiceAccount();
  const appName = `achievements-proxy-${serviceAccount.project_id}`;

  return (
    getApps().find((app) => app.name === appName) ||
    initializeApp(
      {
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
        }),
        projectId: serviceAccount.project_id,
      },
      appName
    )
  );
}

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
  try {
    const adminApp = getAdminApp();
    const firestore = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

    if (req.method === 'GET') {
      const snapshot = await firestore
        .collection('achievements')
        .orderBy('createdAt', 'desc')
        .get();

      const achievements = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          category: data.category,
          story: data.story,
          impact: data.impact,
          achievementDate: data.achievementDate ?? null,
          author: data.author,
          authorId: data.authorId ?? null,
          authorPhotoURL: data.authorPhotoURL ?? null,
          date: data.date ?? 'Just now',
          createdAt:
            typeof data.createdAt?.toDate === 'function'
              ? data.createdAt.toDate().toISOString()
              : null,
        };
      });

      return json(res, 200, { achievements });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return json(res, 405, { error: 'Method not allowed' });
    }

    const rawBody = await readBody(req as IncomingMessage & { body?: unknown });
    const body = JSON.parse(rawBody || '{}') as JsonBody;
    const achievement = body.achievement;

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

    const decodedToken = await getAuth(adminApp).verifyIdToken(idToken);

    const docId = crypto.randomUUID();
    const authorName =
      decodedToken.name || body.auth?.displayName || decodedToken.email || 'Anonymous';
    const authorPhotoURL =
      typeof decodedToken.picture === 'string'
        ? decodedToken.picture
        : body.auth?.photoURL || null;

    await firestore.collection('achievements').doc(docId).set({
      id: docId,
      title: achievement.title,
      category: achievement.category,
      story: achievement.story,
      impact: achievement.impact,
      author: authorName,
      authorId: decodedToken.uid,
      authorPhotoURL,
      date: 'Just now',
      createdAt: FieldValue.serverTimestamp(),
      ...(achievement.achievementDate
        ? { achievementDate: achievement.achievementDate }
        : {}),
    });

    return json(res, 200, {
      id: docId,
      uid: decodedToken.uid,
    });
  } catch (error) {
    console.error('Achievement API failure', error);

    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : typeof error === 'object' &&
            error !== null &&
            'codePrefix' in error &&
            error.codePrefix === 'auth'
          ? 401
          : 500;

    const message =
      typeof error === 'object' &&
      error !== null &&
      'codePrefix' in error &&
      error.codePrefix === 'auth'
        ? 'Invalid or expired Firebase ID token'
        : error instanceof Error
          ? error.message
          : String(error);

    return json(res, statusCode, {
      error: message,
      path: 'api/achievements',
    });
  }
}
