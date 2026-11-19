import type { DeliveryMode } from '../types';

// Two ways to get an order: Express (about 30 minutes, paid) and Normal
// (60–90 minutes, free above the threshold). 'sunday_morning' is no longer
// offered; it is kept in the type for old orders and treated as Normal.

export interface SlotInfo {
  /** Short title for the picker ("Express", "Normal"). */
  title: string;
  /** Time range for the picker ("30 mins", "60–90 mins"). */
  time: string;
  /** Saved on the order and shown on tracking/admin (max 80 chars). */
  label: string;
  /** Saved on the order; shown after "Arriving " (max 40 chars). */
  eta: string;
}

export function slotInfo(mode: DeliveryMode): SlotInfo {
  if (mode === 'instant') {
    return { title: 'Express', time: '30 mins', label: 'Express · about 30 mins', eta: '30 mins' };
  }
  return { title: 'Normal', time: '60–90 mins', label: 'Normal · 60–90 mins', eta: 'in 60–90 mins' };
}
