/**
 * Common Data Validation and Input Sanitization Utilities
 */

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function sanitizeText(text?: string | null): string {
  if (!text) return '';
  return text.trim();
}

export function isValidPassport(passport: string): boolean {
  if (!passport || typeof passport !== 'string') return false;
  const clean = passport.trim().toUpperCase();
  return /^[A-Z][0-9]{7,8}$/.test(clean);
}
