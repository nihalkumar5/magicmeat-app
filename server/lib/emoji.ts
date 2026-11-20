// Same rules as src/utils/notifyEmoji.ts (that copy drives the admin preview).
const RULES: [RegExp, string][] = [
  [/free delivery|delivery|deliver/i, '🛵'],
  [/fruit|apple|banana|mango|orange|grape/i, '🍎'],
  [/vegetable|veggie|sabzi|onion|tomato|potato/i, '🥬'],
  [/fish|prawn|seafood|rohu|surmai/i, '🐟'],
  [/egg/i, '🥚'],
  [/mutton|goat|lamb|keema/i, '🥩'],
  [/chicken|wings|drumstick|leg piece/i, '🍗'],
  [/off|offer|deal|discount|sale|save|coupon|%|₹/i, '🎉'],
  [/weekend|sunday|feast|party|festival|dinner|lunch/i, '🍽️'],
  [/back in stock|restock|new|launch/i, '✨'],
  [/fresh|cut|today/i, '🔪'],
];

const HAS_EMOJI = /^\s*\p{Extended_Pictographic}/u;

export function withEmoji(title: string): string {
  const t = title.trim();
  if (!t || HAS_EMOJI.test(t)) return t;
  const hit = RULES.find(([re]) => re.test(t));
  return `${hit ? hit[1] : '🔥'} ${t}`;
}
