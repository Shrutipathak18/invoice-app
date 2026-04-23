import fs from 'fs';
import path from 'path';
import { hashPassword } from './password.js';
import { createId, nowIso } from './utils.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

function defaultCompany() {
  return {
    id: 'company_default',
    name: 'Your Company',
    businessName: 'Your Company Pvt Ltd',
    taxId: '',
    gstNumber: '',
    vatNumber: '',
    email: 'owner@example.com',
    phone: '',
    address: '',
    logoUrl: '',
    signatureUrl: '',
    bankDetails: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      ifscCode: '',
      swiftCode: '',
      branch: ''
    },
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function defaultSettings(companyId = 'company_default') {
  return {
    id: createId('settings'),
    companyId,
    currency: 'INR',
    exchangeRates: {
      INR: 1
    },
    dateFormat: 'DD-MM-YYYY',
    numberFormat: 'en-IN',
    tax: {
      mode: 'GST',
      defaultRate: 18,
      inclusive: false
    },
    invoiceNumbering: {
      prefix: 'INV',
      suffix: '',
      padding: 4,
      reset: 'yearly'
    },
    updatedAt: nowIso()
  };
}

function defaultEmailTemplates(companyId = 'company_default') {
  return [
    {
      id: createId('tmpl'),
      companyId,
      key: 'invoice_send',
      subject: 'Invoice {{invoiceNumber}} from {{companyName}}',
      body: 'Hi {{clientName}},\n\nPlease find your invoice {{invoiceNumber}} for {{total}}.\n\nThanks,\n{{companyName}}',
      bccOwner: true,
      updatedAt: nowIso()
    }
  ];
}

function createDefaultStore() {
  const company = defaultCompany();

  return {
    meta: {
      createdAt: nowIso(),
      updatedAt: nowIso(),
      version: 1
    },
    companies: [company],
    users: [
      {
        id: 'user_admin',
        companyId: company.id,
        name: 'Owner',
        email: 'owner@example.com',
        role: 'admin',
        passwordHash: hashPassword('admin123'),
        createdAt: nowIso(),
        updatedAt: nowIso()
      }
    ],
    clients: [],
    invoices: [],
    refreshTokens: [],
    shareLinks: [],
    files: [],
    jobs: [],
    emailTemplates: defaultEmailTemplates(company.id),
    settings: [defaultSettings(company.id)]
  };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function applyMigrations(store) {
  const normalized = store || {};

  normalized.meta = normalized.meta || {
    createdAt: nowIso(),
    updatedAt: nowIso(),
    version: 1
  };
  normalized.companies = Array.isArray(normalized.companies) ? normalized.companies : [defaultCompany()];
  normalized.users = Array.isArray(normalized.users) ? normalized.users : [];
  normalized.clients = Array.isArray(normalized.clients) ? normalized.clients : [];
  normalized.invoices = Array.isArray(normalized.invoices) ? normalized.invoices : [];
  normalized.refreshTokens = Array.isArray(normalized.refreshTokens) ? normalized.refreshTokens : [];
  normalized.shareLinks = Array.isArray(normalized.shareLinks) ? normalized.shareLinks : [];
  normalized.files = Array.isArray(normalized.files) ? normalized.files : [];
  normalized.jobs = Array.isArray(normalized.jobs) ? normalized.jobs : [];
  normalized.emailTemplates = Array.isArray(normalized.emailTemplates)
    ? normalized.emailTemplates
    : defaultEmailTemplates(normalized.companies[0].id);
  normalized.settings = Array.isArray(normalized.settings)
    ? normalized.settings
    : [defaultSettings(normalized.companies[0].id)];

  if (normalized.users.length === 0) {
    normalized.users.push({
      id: 'user_admin',
      companyId: normalized.companies[0].id,
      name: 'Owner',
      email: 'owner@example.com',
      role: 'admin',
      passwordHash: hashPassword('admin123'),
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  }

  normalized.meta.updatedAt = nowIso();
  return normalized;
}

function ensureStoreFile() {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) {
    const seed = createDefaultStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(seed, null, 2), 'utf8');
  }
}

export function readStore() {
  ensureStoreFile();
  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const migrated = applyMigrations(parsed);
  fs.writeFileSync(STORE_PATH, JSON.stringify(migrated, null, 2), 'utf8');
  return migrated;
}

export function writeStore(store) {
  ensureDataDir();
  const next = applyMigrations(store);
  next.meta.updatedAt = nowIso();
  fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2), 'utf8');
}

export function withStore(mutator) {
  const store = readStore();
  const result = mutator(store);
  writeStore(store);
  return result;
}

export function getStorePath() {
  return STORE_PATH;
}
