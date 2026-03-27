import emailjs from '@emailjs/browser';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  as string | undefined;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string | undefined;

/** Returns true only if all three EmailJS env vars are configured. */
export function isEmailConfigured(): boolean {
  return Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
}

/**
 * Send a single notification email to one recipient.
 * Silently no-ops if EmailJS is not configured.
 */
export async function sendNotificationEmail(
  toEmail: string,
  toName: string,
  subject: string,
  actor: string,
  message: string,
): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    await emailjs.send(
      SERVICE_ID!,
      TEMPLATE_ID!,
      {
        to_name:    toName,
        to_email:   toEmail,
        subject,
        actor,
        message,
        action_url: 'https://qawall.vercel.app',
      },
      { publicKey: PUBLIC_KEY! },
    );
  } catch (err) {
    // Email is best-effort — never block the main action
    console.warn('[emailNotifier] Failed to send email:', err);
  }
}

/** Fetch emails of all approved users from Firestore. */
async function getApprovedUsers(): Promise<{ email: string; displayName: string; uid: string; emailNotifications?: boolean }[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), where('status', '==', 'approved')),
    );
    return snap.docs.map(d => {
      const data = d.data() as { email: string; displayName: string; uid: string; emailNotifications?: boolean };
      return { email: data.email, displayName: data.displayName, uid: data.uid, emailNotifications: data.emailNotifications };
    });
  } catch {
    return [];
  }
}

/**
 * Send a notification email to every approved user,
 * optionally skipping the user who triggered the action (excludeUid).
 */
export async function sendBroadcastEmail(
  subject: string,
  actor: string,
  message: string,
  excludeUid?: string,
): Promise<void> {
  if (!isEmailConfigured()) return;
  const users = await getApprovedUsers();
  await Promise.allSettled(
    users
      .filter(u => u.uid !== excludeUid && u.email && u.emailNotifications !== false)
      .map(u => sendNotificationEmail(u.email, u.displayName, subject, actor, message)),
  );
}

/**
 * Send a notification email to a single user identified by UID.
 * Looks up their email from Firestore.
 * Skips silently if recipientUid === senderUid.
 */
export async function sendUserEmail(
  recipientUid: string,
  senderUid: string,
  subject: string,
  actor: string,
  message: string,
): Promise<void> {
  if (!isEmailConfigured()) return;
  if (recipientUid === senderUid) return; // never email yourself
  const users = await getApprovedUsers();
  const recipient = users.find(u => u.uid === recipientUid);
  if (!recipient?.email || recipient.emailNotifications === false) return;
  await sendNotificationEmail(recipient.email, recipient.displayName, subject, actor, message);
}
