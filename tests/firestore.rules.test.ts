import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const describeIfEmulator = emulatorHost ? describe : describe.skip;
const rulesPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../firestore.rules');

describeIfEmulator('firestore rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, portText] = (emulatorHost as string).split(':');
    testEnv = await initializeTestEnvironment({
      projectId: `gglestdio-soloqahubv3-${Date.now()}`,
      firestore: {
        host,
        port: Number(portText),
        rules: fs.readFileSync(rulesPath, 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('allows an approved user to create their own achievement', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', 'user-1'), {
        uid: 'user-1',
        email: 'user-1@example.com',
        displayName: 'User One',
        photoURL: '',
        status: 'approved',
        role: 'user',
        createdAt: serverTimestamp(),
      });
    });

    const userDb = testEnv.authenticatedContext('user-1', { email: 'user-1@example.com', email_verified: true }).firestore();

    await assertSucceeds(
      setDoc(doc(userDb, 'achievements', 'achievement-1'), {
        id: 'achievement-1',
        title: 'Found a release blocker early',
        category: 'Work',
        story: 'Caught the issue during regression instead of after release.',
        impact: 'Saved the team a rollback and kept support quiet.',
        author: 'User One',
        authorId: 'user-1',
        authorPhotoURL: '',
        date: 'Mar 30, 2026',
        createdAt: serverTimestamp(),
      })
    );
  });

  it('blocks a different approved user from editing someone else’s achievement', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', 'owner'), {
        uid: 'owner',
        email: 'owner@example.com',
        displayName: 'Owner',
        photoURL: '',
        status: 'approved',
        role: 'user',
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(context.firestore(), 'users', 'other-user'), {
        uid: 'other-user',
        email: 'other@example.com',
        displayName: 'Other User',
        photoURL: '',
        status: 'approved',
        role: 'user',
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(context.firestore(), 'achievements', 'achievement-2'), {
        id: 'achievement-2',
        title: 'Owner entry',
        category: 'Work',
        story: 'Owner story',
        impact: 'Owner impact',
        author: 'Owner',
        authorId: 'owner',
        date: 'Mar 30, 2026',
        createdAt: serverTimestamp(),
      });
    });

    const otherUserDb = testEnv.authenticatedContext('other-user', { email: 'other@example.com', email_verified: true }).firestore();

    await assertFails(
      updateDoc(doc(otherUserDb, 'achievements', 'achievement-2'), {
        impact: 'Trying to overwrite someone else',
      })
    );
  });

  it('allows an admin to delete another user achievement', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', 'admin-1'), {
        uid: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Admin',
        photoURL: '',
        status: 'approved',
        role: 'admin',
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(context.firestore(), 'users', 'author-1'), {
        uid: 'author-1',
        email: 'author@example.com',
        displayName: 'Author',
        photoURL: '',
        status: 'approved',
        role: 'user',
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(context.firestore(), 'achievements', 'achievement-3'), {
        id: 'achievement-3',
        title: 'Author entry',
        category: 'Work',
        story: 'Author story',
        impact: 'Author impact',
        author: 'Author',
        authorId: 'author-1',
        date: 'Mar 30, 2026',
        createdAt: serverTimestamp(),
      });
    });

    const adminDb = testEnv.authenticatedContext('admin-1', {
      email: 'admin@example.com',
      email_verified: true,
    }).firestore();

    await assertSucceeds(deleteDoc(doc(adminDb, 'achievements', 'achievement-3')));
  });

  it('allows authenticated users to read achievements', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'achievements', 'achievement-4'), {
        id: 'achievement-4',
        title: 'Readable entry',
        category: 'Personal',
        story: 'Readable story',
        impact: 'Readable impact',
        author: 'Reader',
        authorId: 'reader-1',
        date: 'Mar 30, 2026',
        createdAt: serverTimestamp(),
      });
    });

    const readerDb = testEnv.authenticatedContext('reader-1', {
      email: 'reader@example.com',
      email_verified: true,
    }).firestore();

    const snapshot = await assertSucceeds(getDoc(doc(readerDb, 'achievements', 'achievement-4')));
    expect(snapshot.exists()).toBe(true);
  });
});
