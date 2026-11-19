import { router } from 'expo-router';
import { PRODUCTS } from '../data/mockData';
import { mrpFor } from '../data/pricing';
import { useStore } from '../store/useStore';
import { notify } from './dialogs';
import type { Order } from '../types';

// Put a past order back in the basket at today's prices. Items we no longer
// sell or that are out of stock are skipped, and the customer is told.
export function reorderToCart(order: Order) {
  const { addToCart, inventory } = useStore.getState();
  const skipped: string[] = [];
  let added = 0;
  for (const item of order.items) {
    const product = PRODUCTS.find((p) => p.id === item.product.id);
    const inv = inventory[item.product.id];
    const soldOut = inv ? !inv.inStock || inv.stockKg <= 0 : false;
    if (!product || soldOut) {
      skipped.push(item.product.name);
      continue;
    }
    addToCart(product, item.selectedCut, item.isSkinless, item.quantity);
    added += 1;
  }
  if (added === 0) {
    notify('Not available right now', 'Everything in this order is out of stock. Please try again later.');
    return;
  }
  if (skipped.length) {
    notify(
      'Added to your basket',
      `${skipped.join(', ')} ${skipped.length > 1 ? 'are' : 'is'} out of stock and was left out.`
    );
  }
  router.push('/(tabs)/cart');
}

// What the customer saved against MRP on an order (0 for cancelled ones).
export function savedOn(order: Order): number {
  if (order.status === 'cancelled') return 0;
  return order.items.reduce(
    (sum, item) => sum + Math.max(0, mrpFor(item.product, item.selectedCut) - item.unitPrice) * item.quantity,
    0
  );
}
