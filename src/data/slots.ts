import type { DeliveryMode } from '../types';

// Last order time for the same-day evening slot (5-7 PM). After this the
// evening slot moves to tomorrow.
const EVENING_CUTOFF_HOUR = 16;
// Last order time on a Sunday for that morning's 7-9 AM slot.
const SUNDAY_CUTOFF_HOUR = 6;

export interface SlotInfo {
  /** Short title for the slot picker ("Express", "Today", "Sun 23 Nov"). */
  title: string;
  /** Time range for the slot picker ("30 Mins", "5 - 7 PM"). */
  time: string;
  /** Saved on the order and shown on tracking/admin (max 80 chars). */
  label: string;
  /** Saved on the order as the arrival text (max 40 chars). */
  eta: string;
}

function dayMonth(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function nextSunday(now: Date): Date {
  const d = new Date(now);
  const isSunday = d.getDay() === 0;
  if (isSunday && d.getHours() < SUNDAY_CUTOFF_HOUR) return d;
  const daysAhead = isSunday ? 7 : 7 - d.getDay();
  d.setDate(d.getDate() + daysAhead);
  return d;
}

export function slotInfo(mode: DeliveryMode, now: Date = new Date()): SlotInfo {
  if (mode === 'instant') {
    return {
      title: 'Express',
      time: '30 mins',
      label: 'Express · about 30 mins',
      eta: '30 mins',
    };
  }

  if (mode === 'sunday_morning') {
    const sunday = nextSunday(now);
    const isToday = sunday.toDateString() === now.toDateString();
    const day = isToday ? 'Today' : `Sun ${dayMonth(sunday)}`;
    return {
      title: isToday ? 'Today' : 'Sunday',
      time: '7 - 9 AM',
      label: `Sunday ${dayMonth(sunday)} · 7–9 AM`,
      eta: `${day}, 7–9 AM`,
    };
  }

  const tomorrow = now.getHours() >= EVENING_CUTOFF_HOUR;
  const date = new Date(now);
  if (tomorrow) date.setDate(date.getDate() + 1);
  const day = tomorrow ? 'Tomorrow' : 'Today';
  return {
    title: day,
    time: '5 - 7 PM',
    label: `${day}, ${dayMonth(date)} · 5–7 PM`,
    eta: `${day}, 5–7 PM`,
  };
}
