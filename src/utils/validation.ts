// Indian mobile numbers: keep the last 10 digits (drops +91 / 0 prefixes).
export function cleanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function isValidPhone(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(cleanPhone(raw));
}
