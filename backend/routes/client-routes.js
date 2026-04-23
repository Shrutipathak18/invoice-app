import express from 'express';
import fs from 'fs';

import { parseCsv, toCsv } from '../lib/csv.js';
import { createId, normalizeEmail, nowIso } from '../lib/utils.js';

export function createClientRoutes({ readStore, withStore, authMiddleware, upload }) {
  const router = express.Router();

  router.get('/', authMiddleware, (req, res) => {
    const tag = String(req.query.tag || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();
    const store = readStore();

    const clients = store.clients
      .filter((client) => client.companyId === req.user.companyId)
      .filter((client) => !tag || (Array.isArray(client.tags) && client.tags.includes(tag)))
      .filter((client) => {
        if (!search) return true;
        return [client.name, client.email, client.phone, client.companyName]
          .join(' ')
          .toLowerCase()
          .includes(search);
      });

    return res.json({ clients });
  });

  router.post('/', authMiddleware, (req, res) => {
    const input = req.body || {};
    if (!input.name || !input.email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    return withStore((store) => {
      const client = {
        id: createId('client'),
        companyId: req.user.companyId,
        name: input.name,
        companyName: input.companyName || '',
        email: normalizeEmail(input.email),
        phone: input.phone || '',
        address: input.address || '',
        tags: Array.isArray(input.tags) ? input.tags.filter(Boolean) : [],
        notes: input.notes || '',
        createdAt: nowIso(),
        updatedAt: nowIso()
      };

      store.clients.push(client);
      return res.status(201).json({ client });
    });
  });

  router.put('/:id', authMiddleware, (req, res) => {
    return withStore((store) => {
      const client = store.clients.find(
        (candidate) => candidate.id === req.params.id && candidate.companyId === req.user.companyId
      );

      if (!client) return res.status(404).json({ error: 'Client not found' });

      const input = req.body || {};
      client.name = input.name ?? client.name;
      client.companyName = input.companyName ?? client.companyName;
      client.email = input.email ? normalizeEmail(input.email) : client.email;
      client.phone = input.phone ?? client.phone;
      client.address = input.address ?? client.address;
      client.notes = input.notes ?? client.notes;
      client.tags = Array.isArray(input.tags) ? input.tags.filter(Boolean) : client.tags;
      client.updatedAt = nowIso();

      return res.json({ client });
    });
  });

  router.delete('/:id', authMiddleware, (req, res) => {
    return withStore((store) => {
      const initialLength = store.clients.length;
      store.clients = store.clients.filter(
        (client) => !(client.id === req.params.id && client.companyId === req.user.companyId)
      );
      return res.json({ deleted: store.clients.length !== initialLength });
    });
  });

  router.get('/tags/all', authMiddleware, (req, res) => {
    const store = readStore();
    const tags = new Set();
    for (const client of store.clients) {
      if (client.companyId !== req.user.companyId) continue;
      for (const tag of client.tags || []) tags.add(tag);
    }
    return res.json({ tags: Array.from(tags).sort() });
  });

  router.post('/import-csv', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'CSV file is required' });

    try {
      const csv = fs.readFileSync(req.file.path, 'utf8');
      const rows = parseCsv(csv);

      const importedClients = withStore((store) => {
        const created = [];
        for (const row of rows) {
          if (!row.name && !row.Name) continue;
          const client = {
            id: createId('client'),
            companyId: req.user.companyId,
            name: row.name || row.Name || '',
            companyName: row.companyName || row.CompanyName || '',
            email: normalizeEmail(row.email || row.Email || ''),
            phone: row.phone || row.Phone || '',
            address: row.address || row.Address || '',
            tags: String(row.tags || row.Tags || '')
              .split('|')
              .map((x) => x.trim())
              .filter(Boolean),
            notes: row.notes || row.Notes || '',
            createdAt: nowIso(),
            updatedAt: nowIso()
          };
          store.clients.push(client);
          created.push(client);
        }
        return created;
      });

      return res.json({ imported: importedClients.length, clients: importedClients });
    } catch (error) {
      return res.status(400).json({ error: 'Unable to parse CSV' });
    }
  });

  router.get('/export-csv', authMiddleware, (req, res) => {
    const store = readStore();
    const clients = store.clients
      .filter((client) => client.companyId === req.user.companyId)
      .map((client) => ({
        ...client,
        tags: (client.tags || []).join('|')
      }));

    const csv = toCsv(clients, [
      { key: 'name', label: 'name' },
      { key: 'companyName', label: 'companyName' },
      { key: 'email', label: 'email' },
      { key: 'phone', label: 'phone' },
      { key: 'address', label: 'address' },
      { key: 'tags', label: 'tags' },
      { key: 'notes', label: 'notes' }
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
    return res.send(csv);
  });

  return router;
}
