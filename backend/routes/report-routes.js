import express from 'express';

import { getCompanySettings } from '../lib/context.js';
import { INVOICE_STATUSES, markOverdueInvoices } from '../lib/invoice.js';
import { toCurrencyNumber } from '../lib/utils.js';

export function createReportRoutes({ readStore, withStore, authMiddleware }) {
  const router = express.Router();

  router.get('/revenue-by-month', authMiddleware, (req, res) => {
    const store = readStore();
    const map = new Map();

    for (const invoice of store.invoices) {
      if (invoice.companyId !== req.user.companyId) continue;
      if (invoice.status !== INVOICE_STATUSES.PAID) continue;

      const monthKey = new Date(invoice.paidAt || invoice.updatedAt).toISOString().slice(0, 7);
      const existing = map.get(monthKey) || 0;
      map.set(monthKey, toCurrencyNumber(existing + invoice.total));
    }

    const data = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, revenue]) => ({ month, revenue }));

    return res.json({ currency: getCompanySettings(store, req.user.companyId)?.currency || 'INR', data });
  });

  router.get('/outstanding', authMiddleware, (req, res) => {
    return withStore((store) => {
      markOverdueInvoices(store.invoices);
      const invoices = store.invoices.filter(
        (invoice) =>
          invoice.companyId === req.user.companyId &&
          [INVOICE_STATUSES.SENT, INVOICE_STATUSES.OVERDUE].includes(invoice.status)
      );

      const totalOutstanding = toCurrencyNumber(
        invoices.reduce((sum, invoice) => sum + invoice.total, 0)
      );

      return res.json({
        count: invoices.length,
        totalOutstanding,
        invoices
      });
    });
  });

  router.get('/top-clients', authMiddleware, (req, res) => {
    const limit = Number(req.query.limit || 5);
    const store = readStore();
    const clientTotals = new Map();

    for (const invoice of store.invoices) {
      if (invoice.companyId !== req.user.companyId) continue;
      if (invoice.status !== INVOICE_STATUSES.PAID) continue;

      const key = invoice.clientId || invoice.clientSnapshot?.id || 'unknown';
      const current = clientTotals.get(key) || {
        clientId: key,
        name: invoice.clientSnapshot?.name || 'Unknown client',
        revenue: 0,
        invoiceCount: 0
      };
      current.revenue = toCurrencyNumber(current.revenue + invoice.total);
      current.invoiceCount += 1;
      clientTotals.set(key, current);
    }

    const data = Array.from(clientTotals.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return res.json({ data });
  });

  return router;
}
