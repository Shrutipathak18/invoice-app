import fs from 'fs';
import multer from 'multer';
import path from 'path';

import { buildAuthResponse, generateRefreshToken, hashToken, signJwt, verifyJwt } from './auth.js';
import { applyTemplate, createId, nowIso } from './utils.js';

export const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900);
export const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14);
export const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_in_production';

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function createUploadMiddleware(rootDir) {
  const uploadsDir = path.join(rootDir, 'uploads');
  const companyFilesDir = path.join(uploadsDir, 'company');
  const importDir = path.join(uploadsDir, 'imports');

  for (const directory of [uploadsDir, companyFilesDir, importDir]) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (req.path.includes('/clients/import-csv')) {
        cb(null, importDir);
        return;
      }
      if (req.path.includes('/company/logo') || req.path.includes('/company/signature')) {
        cb(null, companyFilesDir);
        return;
      }
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  });

  return {
    upload: multer({
      storage,
      limits: {
        fileSize: 50 * 1024 * 1024
      }
    }),
    uploadsDir
  };
}

export function getCompany(store, companyId) {
  return store.companies.find((company) => company.id === companyId);
}

export function getCompanySettings(store, companyId) {
  return store.settings.find((settings) => settings.companyId === companyId);
}

export function getUserById(store, userId) {
  return store.users.find((user) => user.id === userId);
}

export function sanitizeUser(user) {
  return {
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

export function issueTokens(store, user, requestMeta = {}) {
  const accessToken = signJwt(
    {
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    ACCESS_TOKEN_TTL_SECONDS
  );

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const refreshExpiresAt = addDays(REFRESH_TOKEN_TTL_DAYS);

  store.refreshTokens.push({
    id: createId('rt'),
    tokenHash: refreshTokenHash,
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    ip: requestMeta.ip || '',
    userAgent: requestMeta.userAgent || '',
    createdAt: nowIso(),
    expiresAt: refreshExpiresAt,
    revokedAt: null
  });

  return buildAuthResponse(user, accessToken, refreshToken, refreshExpiresAt);
}

export function revokeRefreshToken(store, plainToken) {
  const tokenHash = hashToken(plainToken);
  const tokenRecord = store.refreshTokens.find((token) => token.tokenHash === tokenHash);
  if (!tokenRecord) return false;
  tokenRecord.revokedAt = nowIso();
  return true;
}

export function buildPublicInvoice(store, invoice) {
  const company = getCompany(store, invoice.companyId);
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    type: invoice.type,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    items: invoice.items,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    currency: invoice.currency,
    notes: invoice.notes,
    terms: invoice.terms,
    paymentDetails: invoice.paymentDetails,
    client: invoice.clientSnapshot,
    company: company
      ? {
        businessName: company.businessName,
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        logoUrl: company.logoUrl
      }
      : null
  };
}

export function ensureInvoiceCompanySnapshot(invoice, company) {
  if (!invoice.paymentDetails || Object.keys(invoice.paymentDetails).length === 0) {
    invoice.paymentDetails = company.bankDetails || {};
  }
}

export function sendInvoiceByTemplate(store, invoice, company) {
  const template = store.emailTemplates.find(
    (tmpl) => tmpl.companyId === company.id && tmpl.key === 'invoice_send'
  );

  const subjectTemplate = template?.subject || 'Invoice {{invoiceNumber}} from {{companyName}}';
  const bodyTemplate = template?.body || 'Hi {{clientName}}, please find invoice {{invoiceNumber}}.';

  const variables = {
    invoiceNumber: invoice.invoiceNumber,
    companyName: company.businessName || company.name,
    clientName: invoice.clientSnapshot?.name || 'Customer',
    total: `${invoice.currency} ${invoice.total.toFixed(2)}`
  };

  return {
    delivered: true,
    opened: false,
    bccOwner: template?.bccOwner ?? true,
    sentAt: nowIso(),
    subject: applyTemplate(subjectTemplate, variables),
    body: applyTemplate(bodyTemplate, variables)
  };
}

export function createAuthMiddleware(readStoreFn) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    try {
      const payload = verifyJwt(token, JWT_SECRET);
      const store = readStoreFn();
      const user = getUserById(store, payload.sub);
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.user = sanitizeUser(user);
      return next();
    } catch (error) {
      return res.status(401).json({ error: error.message || 'Invalid token' });
    }
  };
}
