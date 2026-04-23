import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  buildPublicInvoice,
  createAuthMiddleware,
  createUploadMiddleware,
  ensureInvoiceCompanySnapshot,
  getCompany,
  sendInvoiceByTemplate
} from './backend/lib/context.js';
import { INVOICE_STATUSES } from './backend/lib/invoice.js';
import { logError, logInfo } from './backend/lib/logger.js';
import { InMemoryQueue } from './backend/lib/queue.js';
import { nowIso } from './backend/lib/utils.js';
import { createAuthRoutes } from './backend/routes/auth-routes.js';
import { createClientRoutes } from './backend/routes/client-routes.js';
import { createCompanyRoutes } from './backend/routes/company-routes.js';
import { createInvoiceRoutes } from './backend/routes/invoice-routes.js';
import { createPlatformRoutes } from './backend/routes/platform-routes.js';
import { createReportRoutes } from './backend/routes/report-routes.js';
import { createSettingsRoutes } from './backend/routes/settings-routes.js';
import { readStore, withStore } from './backend/lib/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3001);
const BASE_URL = `http://localhost:${PORT}`;

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', 'http://app-dev:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const { upload, uploadsDir } = createUploadMiddleware(__dirname);
app.use('/uploads', express.static(uploadsDir));

const authMiddleware = createAuthMiddleware(readStore);

const jobQueue = new InMemoryQueue({
  intervalMs: 800,
  worker: async (job) => {
    if (job.type !== 'bulk_send_invoice') return;

    const { companyId, invoiceId } = job.payload;
    withStore((store) => {
      const invoice = store.invoices.find(
        (candidate) => candidate.id === invoiceId && candidate.companyId === companyId
      );
      if (!invoice) return;

      const company = getCompany(store, companyId);
      if (!company) return;

      if (invoice.status === INVOICE_STATUSES.DRAFT) {
        invoice.status = INVOICE_STATUSES.SENT;
        invoice.sentAt = nowIso();
      }

      const result = sendInvoiceByTemplate(store, invoice, company);
      ensureInvoiceCompanySnapshot(invoice, company);
      invoice.emailEvents = Array.isArray(invoice.emailEvents) ? invoice.emailEvents : [];
      invoice.emailEvents.push(result);
      invoice.updatedAt = nowIso();
    });
  }
});
jobQueue.start();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: nowIso() });
});

app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `${BASE_URL}/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    logError('Upload endpoint failed', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/callback', (req, res) => {
  logInfo('OnlyOffice callback received', { body: req.body });
  res.json({ error: 0 });
});

app.use('/api/auth', createAuthRoutes({
  readStore,
  withStore,
  authMiddleware
}));

app.use('/api/company', createCompanyRoutes({
  withStore,
  readStore,
  authMiddleware,
  upload,
  baseUrl: BASE_URL
}));

app.use('/api/clients', createClientRoutes({
  readStore,
  withStore,
  authMiddleware,
  upload
}));

app.use('/api/settings', createSettingsRoutes({
  readStore,
  withStore,
  authMiddleware
}));

app.use('/api/invoices', createInvoiceRoutes({
  readStore,
  withStore,
  authMiddleware,
  baseUrl: BASE_URL,
  jobQueue
}));

app.use('/api/reports', createReportRoutes({
  readStore,
  withStore,
  authMiddleware
}));

app.use('/api', createPlatformRoutes({
  authMiddleware,
  upload,
  withStore,
  jobQueue,
  baseUrl: BASE_URL
}));

app.get('/api/public/invoices/:token', (req, res) => {
  const store = readStore();
  const link = store.shareLinks.find((candidate) => candidate.token === req.params.token);

  if (!link || link.revokedAt) return res.status(404).json({ error: 'Invalid link' });
  if (new Date(link.expiresAt).getTime() <= Date.now()) {
    return res.status(410).json({ error: 'Link expired' });
  }

  const invoice = store.invoices.find((candidate) => candidate.id === link.invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  return res.json({ invoice: buildPublicInvoice(store, invoice) });
});

app.use((error, req, res, next) => {
  logError('Unhandled API error', error, { path: req.path, method: req.method });
  res.status(500).json({ error: 'Internal server error' });
  next();
});

readStore();

const server = app.listen(PORT, () => {
  logInfo('Server started', { port: PORT });
  console.log(`Smart Invoice API running on ${BASE_URL}`);
  console.log(`API docs: ${BASE_URL}/api/docs`);
});

function shutdown(done = () => {}) {
  jobQueue.stop();
  server.close(() => {
    done();
  });
}

process.on('SIGINT', () => shutdown(() => process.exit(0)));
process.on('SIGTERM', () => shutdown(() => process.exit(0)));

export { app, server, shutdown };
