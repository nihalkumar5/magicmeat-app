// 450 -> "450g", 1000 -> "1kg", 1500 -> "1.5kg"
export function formatGrams(grams: number): string {
  if (grams < 1000) return `${grams}g`;
  const kg = grams / 1000;
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1)}kg`;
}
