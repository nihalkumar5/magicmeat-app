import type { OrderStatus } from '../types';

// What the customer sees: three simple stages (as Zomato, sweetgreen and
// Wonder do). The store's detailed statuses fold into them.
export const CUSTOMER_STAGES = [
  { key: 'preparing', title: 'Preparing', sub: 'Being cleaned, cut and packed cold' },
  { key: 'on_the_way', title: 'On the way', sub: 'Your rider is heading to you' },
  { key: 'delivered', title: 'Delivered', sub: 'Enjoy your meal' },
] as const;

export function customerStage(status: OrderStatus | string): number {
  switch (status) {
    case 'rider_assigned':
    case 'out_for_delivery':
      return 1;
    case 'delivered':
      return 2;
    default:
      return 0;
  }
}
