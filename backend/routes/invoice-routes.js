import express from 'express';

import {
  computeInvoiceTotals,
  createInvoiceEntity,
  INVOICE_STATUSES,
  INVOICE_TYPES,
  isValidStatusTransition,
  markOverdueInvoices
} from '../lib/invoice.js';
import { createId, nowIso } from '../lib/utils.js';
import {
  ensureInvoiceCompanySnapshot,
  getCompany,
  getCompanySettings,
  sendInvoiceByTemplate
} from '../lib/context.js';
import { requireRoles } from '../lib/rbac.js';

function getInvoiceForCompany(store, companyId, invoiceId) {
  return store.invoices.find(
    (invoice) => invoice.id === invoiceId && invoice.companyId === companyId
  );
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function createInvoiceRoutes({
  readStore,
  withStore,
  authMiddleware,
  baseUrl,
  jobQueue
}) {
  const router = express.Router();

  router.get('/', authMiddleware, (req, res) => {
    return withStore((store) => {
      markOverdueInvoices(store.invoices);
      const typeFilter = String(req.query.type || '').trim();
      const statusFilter = String(req.query.status || '').trim();

      const invoices = store.invoices
        .filter((invoice) => invoice.companyId === req.user.companyId)
        .filter((invoice) => !typeFilter || invoice.type === typeFilter)
        .filter((invoice) => !statusFilter || invoice.status === statusFilter)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return res.json({ invoices });
    });
  });

  router.post('/', authMiddleware, (req, res) => {
    return withStore((store) => {
      const company = getCompany(store, req.user.companyId);
      const settings = getCompanySettings(store, req.user.companyId);
      if (!company || !settings) return res.status(404).json({ error: 'Company setup missing' });

      const input = req.body || {};
      let clientSnapshot = null;
      if (input.clientId) {
        const client = store.clients.find(
          (candidate) => candidate.id === input.clientId && candidate.companyId === req.user.companyId
        );
        if (client) {
          clientSnapshot = {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            companyName: client.companyName
          };
        }
      }

      const invoice = createInvoiceEntity(
        {
          ...input,
          type: input.type || INVOICE_TYPES.INVOICE,
          clientSnapshot
        },
        company,
        settings,
        store.invoices
      );

      store.invoices.push(invoice);
      return res.status(201).json({ invoice });
    });
  });

  router.get('/:id', authMiddleware, (req, res) => {
    const store = readStore();
    const invoice = getInvoiceForCompany(store, req.user.companyId, req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return res.json({ invoice });
  });

  router.put('/:id', authMiddleware, (req, res) => {
    return withStore((store) => {
      const invoice = getInvoiceForCompany(store, req.user.companyId, req.params.id);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      const input = req.body || {};
      invoice.issueDate = input.issueDate ?? invoice.issueDate;
      invoice.dueDate = input.dueDate ?? invoice.dueDate;
      invoice.notes = input.notes ?? invoice.notes;
      invoice.terms = input.terms ?? invoice.terms;
      invoice.currency = input.currency ?? invoice.currency;
      invoice.taxRate = Number(input.taxRate ?? invoice.taxRate) || 0;
      invoice.type = input.type && Object.values(INVOICE_TYPES).includes(input.type)
        ? input.type
        : invoice.type;

      if (Array.isArray(input.items)) {
        const totals = computeInvoiceTotals(input.items, invoice.taxRate);
        invoice.items = totals.items;
        invoice.subtotal = totals.subtotal;
        invoice.taxAmount = totals.taxAmount;
        invoice.total = totals.total;
      }

      if (input.paymentDetails) {
        invoice.paymentDetails = {
          ...invoice.paymentDetails,
          ...input.paymentDetails
        };
      }

      invoice.updatedAt = nowIso();
      return res.json({ invoice });
    });
  });

  router.patch('/:id/status', authMiddleware, (req, res) => {
    const targetStatus = String(req.body?.status || '').toLowerCase();
    if (!Object.values(INVOICE_STATUSES).includes(targetStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    return withStore((store) => {
      const invoice = getInvoiceForCompany(store, req.user.companyId, req.params.id);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      if (!isValidStatusTransition(invoice.status, targetStatus)) {
        return res.status(400).json({
          error: `Invalid status transition from ${invoice.status} to ${targetStatus}`
        });
      }

      invoice.status = targetStatus;
      if (targetStatus === INVOICE_STATUSES.SENT) invoice.sentAt = nowIso();
      if (targetStatus === INVOICE_STATUSES.PAID) invoice.paidAt = nowIso();
      invoice.updatedAt = nowIso();

      return res.json({ invoice });
    });
  });

  router.post('/:id/send', authMiddleware, (req, res) => {
    return withStore((store) => {
      const invoice = getInvoiceForCompany(store, req.user.companyId, req.params.id);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      const company = getCompany(store, req.user.companyId);
      if (!company) return res.status(404).json({ error: 'Company not found' });

      if (invoice.status === INVOICE_STATUSES.DRAFT) {
        invoice.status = INVOICE_STATUSES.SENT;
        invoice.sentAt = nowIso();
      }

      ensureInvoiceCompanySnapshot(invoice, company);
      const emailResult = sendInvoiceByTemplate(store, invoice, company);
      invoice.emailEvents = Array.isArray(invoice.emailEvents) ? invoice.emailEvents : [];
      invoice.emailEvents.push(emailResult);
      invoice.updatedAt = nowIso();

      const shareToken = createId('share');
      store.shareLinks.push({
        id: createId('sl'),
        token: shareToken,
        companyId: req.user.companyId,
        invoiceId: invoice.id,
        createdAt: nowIso(),
        expiresAt: addDays(30),
        revokedAt: null
      });

      return res.json({
        success: true,
        invoice,
        email: emailResult,
        publicUrl: `${baseUrl}/api/public/invoices/${shareToken}`
      });
    });
  });

  router.post('/:id/share', authMiddleware, (req, res) => {
    return withStore((store) => {
      const invoice = getInvoiceForCompany(store, req.user.companyId, req.params.id);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      const expiresInDays = Number(req.body?.expiresInDays || 30);
      const shareLink = {
        id: createId('sl'),
        token: createId('share'),
        companyId: req.user.companyId,
        invoiceId: invoice.id,
        createdAt: nowIso(),
        expiresAt: addDays(expiresInDays),
        revokedAt: null
      };
      store.shareLinks.push(shareLink);

      return res.json({
        shareLink: `${baseUrl}/api/public/invoices/${shareLink.token}`,
        expiresAt: shareLink.expiresAt
      });
    });
  });

  router.post('/:id/credit-note', authMiddleware, (req, res) => {
    return withStore((store) => {
      const source = getInvoiceForCompany(store, req.user.companyId, req.params.id);
      if (!source) return res.status(404).json({ error: 'Invoice not found' });

      const company = getCompany(store, req.user.companyId);
      const settings = getCompanySettings(store, req.user.companyId);
      if (!company || !settings) return res.status(404).json({ error: 'Company setup missing' });

      const negativeItems = source.items.map((item) => ({
        ...item,
        quantity: item.quantity,
        unitPrice: -Math.abs(item.unitPrice)
      }));

      const creditNote = createInvoiceEntity(
        {
          type: INVOICE_TYPES.CREDIT_NOTE,
          clientId: source.clientId,
          clientSnapshot: source.clientSnapshot,
          issueDate: req.body?.issueDate || nowIso(),
          dueDate: req.body?.dueDate || nowIso(),
          currency: source.currency,
          taxRate: source.taxRate,
          items: negativeItems,
          notes: req.body?.notes || `Credit note for ${source.invoiceNumber}`,
          terms: source.terms
        },
        company,
        settings,
        store.invoices
      );

      creditNote.referenceInvoiceId = source.id;
      store.invoices.push(creditNote);
      return res.status(201).json({ invoice: creditNote });
    });
  });

  router.post('/bulk-send', authMiddleware, requireRoles('admin'), (req, res) => {
    const invoiceIds = Array.isArray(req.body?.invoiceIds) ? req.body.invoiceIds : [];
    if (invoiceIds.length === 0) return res.status(400).json({ error: 'invoiceIds array is required' });

    const jobs = [];
    for (const invoiceId of invoiceIds) {
      jobs.push(
        jobQueue.add('bulk_send_invoice', {
          companyId: req.user.companyId,
          invoiceId
        })
      );
    }

    return res.json({ queued: jobs.length, jobs });
  });

  return router;
}
