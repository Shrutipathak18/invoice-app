import express from 'express';

import { hashToken } from '../lib/auth.js';
import { issueTokens, revokeRefreshToken, sanitizeUser } from '../lib/context.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { requireRoles } from '../lib/rbac.js';
import { createId, normalizeEmail, nowIso } from '../lib/utils.js';

export function createAuthRoutes({ readStore, withStore, authMiddleware }) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    return withStore((store) => {
      const user = store.users.find((candidate) => normalizeEmail(candidate.email) === email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const authResponse = issueTokens(store, user, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.json(authResponse);
    });
  });

  router.post('/refresh', (req, res) => {
    const refreshToken = String(req.body?.refreshToken || '');
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    return withStore((store) => {
      const tokenHash = hashToken(refreshToken);
      const record = store.refreshTokens.find((token) => token.tokenHash === tokenHash);

      if (!record || record.revokedAt) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      if (new Date(record.expiresAt).getTime() <= Date.now()) {
        record.revokedAt = nowIso();
        return res.status(401).json({ error: 'Refresh token expired' });
      }

      const user = store.users.find((candidate) => candidate.id === record.userId);
      if (!user) {
        record.revokedAt = nowIso();
        return res.status(401).json({ error: 'User not found for token' });
      }

      record.revokedAt = nowIso();
      const authResponse = issueTokens(store, user, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.json(authResponse);
    });
  });

  router.post('/logout', (req, res) => {
    const refreshToken = String(req.body?.refreshToken || '');
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    const revoked = withStore((store) => revokeRefreshToken(store, refreshToken));
    return res.json({ success: revoked });
  });

  router.get('/me', authMiddleware, (req, res) => {
    return res.json({ user: req.user });
  });

  router.post('/users', authMiddleware, requireRoles('admin'), (req, res) => {
    const { name, email, role, password } = req.body || {};
    const allowedRoles = ['admin', 'employee'];

    if (!name || !email || !password || !allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'name, email, role(admin|employee), password are required' });
    }

    return withStore((store) => {
      const exists = store.users.some((user) => normalizeEmail(user.email) === normalizeEmail(email));
      if (exists) {
        return res.status(409).json({ error: 'User email already exists' });
      }

      const user = {
        id: createId('user'),
        companyId: req.user.companyId,
        name: String(name),
        email: normalizeEmail(email),
        role,
        passwordHash: hashPassword(String(password)),
        createdAt: nowIso(),
        updatedAt: nowIso()
      };

      store.users.push(user);
      return res.status(201).json({ user: sanitizeUser(user) });
    });
  });

  return router;
}
