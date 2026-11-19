import type { DeliveryMode } from '../types';

// Two ways to get an order: Express (15–20 minutes, paid) and Normal
// (45–60 minutes, free above the threshold). 'sunday_morning' is no longer
// offered; it is kept in the type for old orders and treated as Normal.

export interface SlotInfo {
  /** Short title for the picker ("Express", "Normal"). */
  title: string;
  /** Time range for the picker ("15–20 mins", "45–60 mins"). */
  time: string;
  /** Saved on the order and shown on tracking/admin (max 80 chars). */
  label: string;
  /** Saved on the order; shown after "Arriving " (max 40 chars). */
  eta: string;
}

export function slotInfo(mode: DeliveryMode): SlotInfo {
  if (mode === 'instant') {
    return { title: 'Express', time: '15–20 mins', label: 'Express · 15–20 mins', eta: '15–20 mins' };
  }
  return { title: 'Normal', time: '45–60 mins', label: 'Normal · 45–60 mins', eta: 'in 45–60 mins' };
}
