import crypto from 'crypto';

const ITERATIONS = 120_000;
const KEYLEN = 64;
const DIGEST = 'sha512';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST)
    .toString('hex');

  return `${ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password, storedValue) {
  if (!storedValue || typeof storedValue !== 'string') return false;

  const parts = storedValue.split(':');
  if (parts.length !== 3) return false;

  const [iterationsRaw, salt, originalHash] = parts;
  const iterations = Number(iterationsRaw);

  if (!iterations || !salt || !originalHash) return false;

  const candidateHash = crypto
    .pbkdf2Sync(password, salt, iterations, KEYLEN, DIGEST)
    .toString('hex');

  const originalBuffer = Buffer.from(originalHash, 'hex');
  const candidateBuffer = Buffer.from(candidateHash, 'hex');

  if (originalBuffer.length !== candidateBuffer.length) return false;
  return crypto.timingSafeEqual(originalBuffer, candidateBuffer);
}
