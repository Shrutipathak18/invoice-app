import express from 'express';

import { getCompanySettings } from '../lib/context.js';
import { requireRoles } from '../lib/rbac.js';
import { createId, nowIso } from '../lib/utils.js';

export function createSettingsRoutes({ readStore, withStore, authMiddleware }) {
  const router = express.Router();

  router.get('/', authMiddleware, (req, res) => {
    const store = readStore();
    const settings = getCompanySettings(store, req.user.companyId);
    if (!settings) return res.status(404).json({ error: 'Settings not found' });
    return res.json({ settings });
  });

  router.put('/', authMiddleware, requireRoles('admin'), (req, res) => {
    return withStore((store) => {
      const settings = getCompanySettings(store, req.user.companyId);
      if (!settings) return res.status(404).json({ error: 'Settings not found' });

      const input = req.body || {};
      settings.currency = input.currency ?? settings.currency;
      settings.exchangeRates = input.exchangeRates ?? settings.exchangeRates;
      settings.dateFormat = input.dateFormat ?? settings.dateFormat;
      settings.numberFormat = input.numberFormat ?? settings.numberFormat;
      settings.tax = {
        ...settings.tax,
        ...(input.tax || {})
      };
      settings.invoiceNumbering = {
        ...settings.invoiceNumbering,
        ...(input.invoiceNumbering || {})
      };
      settings.updatedAt = nowIso();

      return res.json({ settings });
    });
  });

  router.get('/email-templates/:key', authMiddleware, (req, res) => {
    const store = readStore();
    const template = store.emailTemplates.find(
      (tmpl) => tmpl.companyId === req.user.companyId && tmpl.key === req.params.key
    );

    if (!template) return res.status(404).json({ error: 'Template not found' });
    return res.json({ template });
  });

  router.put('/email-templates/:key', authMiddleware, requireRoles('admin'), (req, res) => {
    const { subject, body, bccOwner } = req.body || {};

    return withStore((store) => {
      let template = store.emailTemplates.find(
        (tmpl) => tmpl.companyId === req.user.companyId && tmpl.key === req.params.key
      );

      if (!template) {
        template = {
          id: createId('tmpl'),
          companyId: req.user.companyId,
          key: req.params.key,
          subject: subject || '',
          body: body || '',
          bccOwner: Boolean(bccOwner),
          updatedAt: nowIso()
        };
        store.emailTemplates.push(template);
      } else {
        template.subject = subject ?? template.subject;
        template.body = body ?? template.body;
        template.bccOwner = bccOwner ?? template.bccOwner;
        template.updatedAt = nowIso();
      }

      return res.json({ template });
    });
  });

  return router;
}
