import { addComment } from '../firebase';

const URL_RE = /https?:\/\/\S+/;

export function shouldTriggerLumie(text: string, hasImage: boolean): boolean {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return wordCount >= 40 || URL_RE.test(text) || hasImage;
}

export async function triggerLumieBot(
  bugId: string,
  text: string,
  hasImage: boolean,
): Promise<void> {
  if (!shouldTriggerLumie(text, hasImage)) return;

  try {
    const res = await fetch('/api/lumie-bot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postText: text, hasImage, hasUrl: URL_RE.test(text) }),
    });
    if (!res.ok) return;
    const data = await res.json() as { reply?: string };
    if (!data.reply) return;

    await addComment(bugId, {
      author: 'Lumie',
      authorId: 'lumie-bot',
      text: data.reply,
      date: new Date().toISOString(),
      isBot: true,
      isAnonymous: false,
    });
  } catch {
    // Silent fallback - bot is non-essential
  }
}

