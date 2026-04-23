import { createId, nowIso, toCurrencyNumber } from './utils.js';

export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  VOID: 'void'
};

export const INVOICE_TYPES = {
  INVOICE: 'invoice',
  QUOTE: 'quote',
  CREDIT_NOTE: 'credit_note'
};

const allowedTransitions = {
  [INVOICE_STATUSES.DRAFT]: [INVOICE_STATUSES.SENT, INVOICE_STATUSES.VOID],
  [INVOICE_STATUSES.SENT]: [INVOICE_STATUSES.PAID, INVOICE_STATUSES.OVERDUE, INVOICE_STATUSES.VOID],
  [INVOICE_STATUSES.OVERDUE]: [INVOICE_STATUSES.PAID, INVOICE_STATUSES.VOID],
  [INVOICE_STATUSES.PAID]: [],
  [INVOICE_STATUSES.VOID]: []
};

export function isValidStatusTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  const allowed = allowedTransitions[fromStatus] || [];
  return allowed.includes(toStatus);
}

function getYear(dateLike) {
  return new Date(dateLike || Date.now()).getFullYear();
}

function getSequenceForCompanyYear(invoices, companyId, year) {
  const sameBucket = invoices.filter((invoice) =>
    invoice.companyId === companyId && invoice.sequenceYear === year
  );

  if (sameBucket.length === 0) return 1;
  return Math.max(...sameBucket.map((i) => Number(i.sequence) || 0)) + 1;
}

function formatInvoiceNumber(sequence, numberingRules, year) {
  const prefix = numberingRules?.prefix || 'INV';
  const suffix = numberingRules?.suffix || '';
  const padding = Number(numberingRules?.padding) || 4;
  const reset = numberingRules?.reset || 'yearly';

  const serial = String(sequence).padStart(padding, '0');
  if (reset === 'yearly') {
    return `${prefix}-${year}-${serial}${suffix ? `-${suffix}` : ''}`;
  }

  return `${prefix}-${serial}${suffix ? `-${suffix}` : ''}`;
}

export function computeInvoiceTotals(items, taxRate = 0) {
  const normalizedItems = (Array.isArray(items) ? items : []).map((item) => {
    const quantity = toCurrencyNumber(item.quantity);
    const unitPrice = toCurrencyNumber(item.unitPrice ?? item.price);
    const taxPercent = item.taxPercent === undefined ? taxRate : Number(item.taxPercent) || 0;
    const amount = toCurrencyNumber(quantity * unitPrice);
    const taxAmount = toCurrencyNumber((amount * taxPercent) / 100);
    const total = toCurrencyNumber(amount + taxAmount);

    return {
      id: item.id || createId('line'),
      description: item.description || '',
      hsnSac: item.hsnSac || item.hsnCode || '',
      quantity,
      unit: item.unit || '',
      unitPrice,
      taxPercent,
      amount,
      taxAmount,
      total
    };
  });

  const subtotal = toCurrencyNumber(normalizedItems.reduce((sum, i) => sum + i.amount, 0));
  const totalTax = toCurrencyNumber(normalizedItems.reduce((sum, i) => sum + i.taxAmount, 0));
  const grandTotal = toCurrencyNumber(subtotal + totalTax);

  return {
    items: normalizedItems,
    subtotal,
    taxAmount: totalTax,
    total: grandTotal
  };
}

export function createInvoiceEntity(payload, company, settings, existingInvoices) {
  const issueDate = payload.issueDate || nowIso();
  const dueDate = payload.dueDate || issueDate;
  const year = getYear(issueDate);
  const sequence = getSequenceForCompanyYear(existingInvoices, company.id, year);
  const numbering = settings?.invoiceNumbering || {};
  const invoiceNumber = payload.invoiceNumber || formatInvoiceNumber(sequence, numbering, year);
  const taxRate = Number(payload.taxRate ?? settings?.tax?.defaultRate ?? 0) || 0;
  const totals = computeInvoiceTotals(payload.items || [], taxRate);

  return {
    id: createId('inv'),
    companyId: company.id,
    type: payload.type && Object.values(INVOICE_TYPES).includes(payload.type)
      ? payload.type
      : INVOICE_TYPES.INVOICE,
    status: payload.status || INVOICE_STATUSES.DRAFT,
    invoiceNumber,
    sequence,
    sequenceYear: year,
    clientId: payload.clientId || null,
    clientSnapshot: payload.clientSnapshot || null,
    issueDate,
    dueDate,
    sentAt: null,
    paidAt: null,
    currency: payload.currency || settings?.currency || 'INR',
    taxRate,
    items: totals.items,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    total: totals.total,
    notes: payload.notes || '',
    terms: payload.terms || '',
    paymentDetails: payload.paymentDetails || company.bankDetails || {},
    publicNote: payload.publicNote || '',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function markOverdueInvoices(invoices) {
  const now = Date.now();
  for (const invoice of invoices) {
    if (
      invoice.status === INVOICE_STATUSES.SENT &&
      invoice.dueDate &&
      new Date(invoice.dueDate).getTime() < now
    ) {
      invoice.status = INVOICE_STATUSES.OVERDUE;
      invoice.updatedAt = nowIso();
    }
  }
}
