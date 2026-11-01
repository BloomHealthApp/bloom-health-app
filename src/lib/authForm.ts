// Validation + error copy shared by the sign-up / sign-in / code screens.
import { ApiError, NetworkError } from '@/api/errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(name: string): string | null {
  const n = name.trim();
  if (n.length < 1) return 'Please enter your name.';
  if (n.length > 40) return 'Name can be at most 40 characters.';
  return null;
}

/** 8-15 digits; only digits, spaces, dashes and a leading + are allowed. */
export function validatePhone(phone: string): string | null {
  const p = phone.trim();
  if (!/^\+?[\d\s-]+$/.test(p)) return 'Use digits only (you can start with + and use spaces or dashes).';
  const digits = p.replace(/\D/g, '').length;
  if (digits < 8 || digits > 15) return 'Phone number must have 8 to 15 digits.';
  return null;
}

export const DEFAULT_COUNTRY_CODE = '+91';
export const COUNTRY_CODES = [
  { code: '+91', name: 'India' },
  { code: '+1', name: 'USA and Canada' },
  { code: '+44', name: 'United Kingdom' },
  { code: '+971', name: 'United Arab Emirates' },
  { code: '+65', name: 'Singapore' },
  { code: '+61', name: 'Australia' },
];

/** Combines a country code and a typed number into E.164, tolerating a leading 0 or the country code typed again. */
export function composePhone(countryCode: string, number: string): string {
  const raw = number.trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return `+${digits}`;
  const cc = countryCode.replace(/\D/g, '');
  const national = digits.replace(/^0+/, '');
  const repeated = national.startsWith(cc) && national.length > 10 && national.length - cc.length >= 8;
  return `${countryCode}${repeated ? national.slice(cc.length) : national}`;
}

/** Splits a saved E.164 number for `PhoneField`. An unknown country code stays in the number, which `composePhone` keeps as it is. */
export function splitPhone(phone: string | null | undefined): { countryCode: string; number: string } {
  if (!phone) return { countryCode: DEFAULT_COUNTRY_CODE, number: '' };
  const known = COUNTRY_CODES.find((c) => phone.startsWith(c.code));
  return known ? { countryCode: known.code, number: phone.slice(known.code.length) } : { countryCode: DEFAULT_COUNTRY_CODE, number: phone };
}

/** Checks a country code and number together. An Indian mobile number must have exactly 10 digits. */
export function validatePhoneParts(countryCode: string, number: string): string | null {
  if (!number.trim()) return 'Enter your phone number.';
  if (!/^\+?[\d\s()-]+$/.test(number.trim())) return 'Use digits only.';
  const e164 = composePhone(countryCode, number);
  if (e164.startsWith('+91') && e164.length !== 13) return 'Enter your 10-digit mobile number.';
  const digits = e164.length - 1;
  if (digits < 8 || digits > 15) return 'Phone number must have 8 to 15 digits.';
  return null;
}

export function validateEmail(email: string): string | null {
  const e = email.trim();
  if (e.length > 254 || !EMAIL_RE.test(e)) return 'Enter a valid email address.';
  return null;
}

export function validateIdentifier(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter your phone number or email.';
  return v.includes('@') ? validateEmail(v) : validatePhone(v);
}

/** Maps request/verify failures to user-facing copy. */
export function authErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof NetworkError) return 'No connection. Check your internet and try again.';
  if (e instanceof ApiError) {
    if (e.code === 'rate_limited' || e.status === 429) {
      return e.retryAfterSeconds
        ? `Too many requests. Please wait ${Math.ceil(e.retryAfterSeconds / 60)} min and try again.`
        : 'Too many requests. Please wait a moment and try again.';
    }
    if (e.code === 'already_registered') return 'An account with this email or phone already exists.';
    if (e.status === 400 && e.message && !/^HTTP \d+$/.test(e.message)) return e.message;
  }
  return fallback;
}

export const isAlreadyRegistered = (e: unknown) => e instanceof ApiError && (e.code === 'already_registered');
