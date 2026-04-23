import express from 'express';

import { getCompany } from '../lib/context.js';
import { requireRoles } from '../lib/rbac.js';
import { nowIso } from '../lib/utils.js';

export function createCompanyRoutes({ withStore, readStore, authMiddleware, upload, baseUrl }) {
  const router = express.Router();

  router.get('/profile', authMiddleware, (req, res) => {
    const store = readStore();
    const company = getCompany(store, req.user.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    return res.json({ company });
  });

  router.put('/profile', authMiddleware, requireRoles('admin'), (req, res) => {
    return withStore((store) => {
      const company = getCompany(store, req.user.companyId);
      if (!company) return res.status(404).json({ error: 'Company not found' });

      const input = req.body || {};
      company.name = input.name ?? company.name;
      company.businessName = input.businessName ?? company.businessName;
      company.taxId = input.taxId ?? company.taxId;
      company.gstNumber = input.gstNumber ?? company.gstNumber;
      company.vatNumber = input.vatNumber ?? company.vatNumber;
      company.email = input.email ?? company.email;
      company.phone = input.phone ?? company.phone;
      company.address = input.address ?? company.address;
      company.bankDetails = {
        ...company.bankDetails,
        ...(input.bankDetails || {})
      };
      company.updatedAt = nowIso();

      return res.json({ company });
    });
  });

  router.post('/logo', authMiddleware, requireRoles('admin'), upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    return withStore((store) => {
      const company = getCompany(store, req.user.companyId);
      if (!company) return res.status(404).json({ error: 'Company not found' });

      company.logoUrl = `${baseUrl}/uploads/company/${req.file.filename}`;
      company.updatedAt = nowIso();

      return res.json({ logoUrl: company.logoUrl });
    });
  });

  router.post('/signature', authMiddleware, requireRoles('admin'), upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    return withStore((store) => {
      const company = getCompany(store, req.user.companyId);
      if (!company) return res.status(404).json({ error: 'Company not found' });

      company.signatureUrl = `${baseUrl}/uploads/company/${req.file.filename}`;
      company.updatedAt = nowIso();

      return res.json({ signatureUrl: company.signatureUrl });
    });
  });

  return router;
}
