import express from 'express';

import { buildOpenApiSpec } from '../lib/openapi.js';
import { requireRoles } from '../lib/rbac.js';
import { createId, nowIso } from '../lib/utils.js';

export function createPlatformRoutes({
  authMiddleware,
  upload,
  withStore,
  jobQueue,
  baseUrl
}) {
  const router = express.Router();

  router.get('/docs/openapi.json', (req, res) => {
    res.json(buildOpenApiSpec(baseUrl));
  });

  router.get('/docs', (req, res) => {
    const html = `
    <html>
      <head><title>Smart Invoice API Docs</title></head>
      <body style="font-family: Arial, sans-serif; margin: 2rem;">
        <h1>Smart Invoice API</h1>
        <p>OpenAPI spec available at <a href="/api/docs/openapi.json">/api/docs/openapi.json</a></p>
        <p>Default admin credentials:</p>
        <pre>email: owner@example.com
password: admin123</pre>
      </body>
    </html>
    `;
    res.type('html').send(html);
  });

  router.post('/files/upload-cloud', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const provider = process.env.CLOUD_PROVIDER || 'local_stub';
    const fileUrl = provider === 'local_stub'
      ? `${baseUrl}/uploads/${req.file.filename}`
      : `https://${provider}.example.com/${req.file.filename}`;

    return withStore((store) => {
      const metadata = {
        id: createId('file'),
        companyId: req.user.companyId,
        provider,
        name: req.file.originalname,
        storedAs: req.file.filename,
        url: fileUrl,
        size: req.file.size,
        mimeType: req.file.mimetype,
        createdAt: nowIso()
      };
      store.files.push(metadata);
      return res.status(201).json({ file: metadata });
    });
  });

  router.get('/jobs', authMiddleware, requireRoles('admin'), (req, res) => {
    return res.json({ jobs: jobQueue.list() });
  });

  return router;
}
