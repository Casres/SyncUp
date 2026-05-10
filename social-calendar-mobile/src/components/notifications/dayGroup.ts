/**
 * Day-group helpers for the NotifSheet feed (R6-7).
 *
 *   TODAY  · YESTERDAY · "TUE MAY 06"  · EARLIER
 *
 * Items older than 30 days (R7-4) are filtered before grouping.
 */

import type { Notif } from '../../../../TYPES';

const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_DAYS = 30;
const NAMED_DAY_WINDOW = 7;

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.floor((startOfDay(later).getTime() - startOfDay(earlier).getTime()) / DAY_MS);
}

function namedDay(d: Date): string {
  // Avoid undefined-array-access lint by indexing into typed locals first.
  const wd = WEEKDAYS[d.getDay()] ?? '';
  const mo = MONTHS[d.getMonth()] ?? '';
  const dd = String(d.getDate()).padStart(2, '0');
  return `${wd} ${mo} ${dd}`;
}

export interface NotifGroup {
  label: string;
  items: Notif[];
}

/**
 * Bucket a notif list into ordered day groups.
 * Items older than 30 days are dropped (R7-4 silent purge).
 */
export function groupByDay(notifs: Notif[], now: Date = new Date()): NotifGroup[] {
  const cutoff = now.getTime() - PURGE_DAYS * DAY_MS;
  const buckets = new Map<string, Notif[]>();
  const order: string[] = [];

  for (const n of notifs) {
    const ts = new Date(n.createdAt);
    if (ts.getTime() < cutoff) continue;
    const days = daysBetween(now, ts);

    let label: string;
    if (days <= 0) label = 'TODAY';
    else if (days === 1) label = 'YESTERDAY';
    else if (days <= NAMED_DAY_WINDOW) label = namedDay(ts);
    else label = 'EARLIER';

    if (!buckets.has(label)) {
      buckets.set(label, []);
      order.push(label);
    }
    buckets.get(label)!.push(n);
  }

  // Sort items inside each bucket by createdAt desc (most recent first).
  for (const label of order) {
    buckets.get(label)!.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return order.map((label) => ({ label, items: buckets.get(label)! }));
}
