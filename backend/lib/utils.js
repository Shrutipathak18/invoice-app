import crypto from 'crypto';

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

export function addDays(dateLike, days) {
  const base = dateLike ? new Date(dateLike) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString();
}

export function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

export function toCurrencyNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function applyTemplate(input, variables = {}) {
  return String(input || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value === undefined || value === null ? '' : String(value);
  });
}
