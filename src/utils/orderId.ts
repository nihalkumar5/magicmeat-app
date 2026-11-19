// Short order number people can read out on the phone ("#4821").
// The Firestore document id stays the long unique one (MM-…); this is a
// stable 4-digit code derived from it, shown the same to customer and store.
export function orderCode(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1_000_003;
  return String(1000 + (h % 9000));
}

export const orderLabel = (id: string) => `#${orderCode(id)}`;
