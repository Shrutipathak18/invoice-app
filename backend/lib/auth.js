import crypto from 'crypto';
import { nowIso } from './utils.js';

function base64UrlEncode(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return input
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const withPadding = padding ? `${normalized}${'='.repeat(4 - padding)}` : normalized;
  return Buffer.from(withPadding, 'base64').toString('utf8');
}

function signHmac(content, secret) {
  return base64UrlEncode(
    crypto.createHmac('sha256', secret).update(content).digest()
  );
}

export function signJwt(payload, secret, expiresInSeconds = 900) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const fullPayload = { ...payload, iat, exp };

  const headerPart = base64UrlEncode(JSON.stringify(header));
  const payloadPart = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = signHmac(`${headerPart}.${payloadPart}`, secret);

  return `${headerPart}.${payloadPart}.${signature}`;
}

export function verifyJwt(token, secret) {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing token');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const expectedSig = signHmac(`${headerPart}.${payloadPart}`, secret);

  const a = Buffer.from(signaturePart);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(base64UrlDecode(payloadPart));
  if (!payload.exp || Math.floor(Date.now() / 1000) >= payload.exp) {
    throw new Error('Token expired');
  }

  return payload;
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function buildAuthResponse(user, accessToken, refreshToken, refreshExpiresAt) {
  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshExpiresAt,
    user: {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      role: user.role
    },
    issuedAt: nowIso()
  };
}
