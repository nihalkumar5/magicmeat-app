import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const CODE_LENGTH = 4;
export const CODE_TTL_MS = 5 * 60 * 1000;
export const RESEND_AFTER_MS = 30 * 1000;
export const MAX_SENDS_PER_HOUR = 5;
export const MAX_SENDS_PER_IP_PER_HOUR = 20;
export const MAX_ATTEMPTS = 5;

/** 10-digit Indian mobile number (starts 6–9), or null. */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function newCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

function secret(): string {
  const s = process.env.OTP_SECRET;
  if (!s || s.length < 16) throw new Error('OTP_SECRET must be at least 16 characters');
  return s;
}

export function hashCode(phone: string, code: string): string {
  return createHmac('sha256', secret()).update(`${phone}:${code}`).digest('hex');
}

export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

export function hashIp(ip: string): string {
  return createHmac('sha256', secret()).update(`ip:${ip}`).digest('hex').slice(0, 32);
}

/** Fixed codes for store-review test numbers (OTP_TEST_NUMBERS). */
export function testCodeFor(phone: string): string | null {
  for (const pair of (process.env.OTP_TEST_NUMBERS || '').split(',')) {
    const [num, code] = pair.split(':').map((s) => s.trim());
    if (num === phone && code && /^\d+$/.test(code)) return code;
  }
  return null;
}

/** Customer's Firebase uid for a phone number. */
export const uidFor = (phone: string) => `phone_91${phone}`;
