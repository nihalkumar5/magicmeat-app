import type { CutOption, Product } from '../types';

// One place that decides what every sellable variant of a product costs.
// The app uses it to price the cart, and scripts/seed-products.mjs uses it to
// write products/{id}.prices to Firestore, where the security rules check
// every order line against it. Change a price here, then re-run the seed.

export interface PackVariant {
  id: string;
  label: string;
  netWeight: string;
  pieces: string;
  serves: string;
  price: number;
  originalPrice: number;
}

// Only loose 500g SKUs get bigger packs. Products already sold as 1kg, a pack
// or a piece count keep their own single size.
export function packVariantsFor(product: Product): PackVariant[] {
  const baseP = product.basePrice;
  const origP = product.originalPrice || Math.round(baseP * 1.25);
  if (product.netWeight !== '500g') {
    return [
      {
        id: 'pack-default',
        label: product.netWeight,
        netWeight: product.netWeight,
        pieces: product.availableCuts?.[0]?.pieces || product.pieces || '',
        serves: product.serves || '2–3 people',
        price: baseP,
        originalPrice: origP,
      },
    ];
  }
  return [
    { id: 'pack-500g', label: '500 g', netWeight: '500g', pieces: '12-14 pieces', serves: '2–3 people', price: baseP, originalPrice: origP },
    { id: 'pack-1kg', label: '1 kg', netWeight: '1000g', pieces: '24-28 pieces', serves: '4–6 people', price: Math.round(baseP * 1.9), originalPrice: Math.round(origP * 1.95) },
    { id: 'pack-1500g', label: '1.5 kg', netWeight: '1500g', pieces: '36-40 pieces', serves: '6–8 people', price: Math.round(baseP * 2.8), originalPrice: Math.round(origP * 2.85) },
  ];
}

// The cut that represents a pack in the cart. The first pack is the product's
// own first cut; bigger packs get a derived id like "curry-medium__pack-1kg".
export function cutForPack(product: Product, base: CutOption, pack: PackVariant, isFirst: boolean): CutOption {
  if (isFirst) return base;
  const grams = parseInt(pack.netWeight, 10) || 0;
  return {
    ...base,
    id: `${base.id}__${pack.id}`,
    name: `${base.name} · ${pack.label}`,
    netWeight: pack.netWeight,
    grossWeight: `${Math.round(grams * 1.2)}g`,
    pieces: pack.pieces,
    priceDelta: pack.price - product.basePrice,
  };
}

export function unitPriceFor(product: Product, cut: CutOption): number {
  return product.basePrice + (cut.priceDelta || 0);
}

// cutId -> unit price, for every cut and every bigger pack of the first cut.
export function priceTableFor(product: Product): Record<string, number> {
  const table: Record<string, number> = {};
  for (const cut of product.availableCuts || []) {
    table[cut.id] = unitPriceFor(product, cut);
  }
  const base = product.availableCuts?.[0];
  if (base) {
    const packs = packVariantsFor(product);
    packs.forEach((pack, i) => {
      const cut = cutForPack(product, base, pack, i === 0);
      table[cut.id] = unitPriceFor(product, cut);
    });
  }
  return table;
}

// MRP of one unit of a cart line, for the "you save" line. Bigger packs carry
// their own MRP; other cuts use the product's MRP plus the cut's price delta.
export function mrpFor(product: Product, cut: CutOption): number {
  const packId = cut.id.includes('__') ? cut.id.split('__')[1] : null;
  if (packId) {
    const pack = packVariantsFor(product).find((p) => p.id === packId);
    if (pack) return pack.originalPrice;
  }
  const mrp = (product.originalPrice || product.basePrice) + (cut.priceDelta || 0);
  return Math.max(mrp, unitPriceFor(product, cut));
}

// Fees. Firestore rules check the same numbers (firestore.rules totalsOk).
export const FREE_DELIVERY_ABOVE = 499;
export const DELIVERY_FEE = 35;
export const COLD_PACK_FEE = 15;

export function feesFor(subtotal: number, fulfillment: 'delivery' | 'takeaway', coldPack: boolean) {
  const deliveryFee = fulfillment === 'delivery' && subtotal > 0 && subtotal < FREE_DELIVERY_ABOVE ? DELIVERY_FEE : 0;
  const packagingFee = coldPack && subtotal > 0 ? COLD_PACK_FEE : 0;
  return { deliveryFee, packagingFee, total: subtotal + deliveryFee + packagingFee };
}
