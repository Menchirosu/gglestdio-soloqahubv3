/**
 * Converts any date value to a relative "time ago" string.
 * Handles Firestore Timestamps, Date objects, ISO strings, and fallback strings.
 */
export function timeAgo(value: any): string {
  if (!value) return '';

  let ms: number;

  if (typeof value?.toMillis === 'function') {
    // Firestore Timestamp
    ms = value.toMillis();
  } else if (value?.seconds != null) {
    // Firestore Timestamp plain object
    ms = value.seconds * 1000;
  } else if (value instanceof Date) {
    ms = value.getTime();
  } else if (typeof value === 'string') {
    if (value === 'Just now' || value === 'just now') return 'just now';
    const parsed = Date.parse(value);
    if (!parsed || isNaN(parsed)) return value; // unparseable — show as-is
    ms = parsed;
  } else {
    return String(value);
  }

  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}yr ago`;
}
