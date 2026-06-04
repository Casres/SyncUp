/**
 * Messaging time formatting (R17-6).
 *
 * Pure helpers — no React, no tokens. Inbox uses a compact relative stamp;
 * threads gate timestamps on a time gap between consecutive messages and
 * switch to date-aware labels across day boundaries.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function clockTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

/** Compact inbox stamp: "now", "12m", "3h", "Mon", or "Apr 3". */
export function formatInboxTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diff = now.getTime() - then.getTime();
  if (diff < MIN) return 'now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`;
  if (sameDay(then, now)) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) {
    return then.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Full thread timestamp: clock time, prefixed with the date on other days. */
export function formatThreadTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (sameDay(d, now)) return clockTime(d);
  return `${d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} · ${clockTime(d)}`;
}

/**
 * Gap-gating (R17-6): show a timestamp under a message only when ≥10 min
 * elapsed since the previous (older) message, or the previous message crosses
 * a day boundary. `prevIso` is the immediately-older message; undefined when
 * this is the oldest loaded message (always show).
 */
export function shouldShowTimestamp(
  iso: string,
  prevIso: string | undefined,
): boolean {
  if (!prevIso) return true;
  const cur = new Date(iso);
  const prev = new Date(prevIso);
  if (!sameDay(cur, prev)) return true;
  return cur.getTime() - prev.getTime() >= 10 * MIN;
}
