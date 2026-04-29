import { notoSansRegular } from './notoSansRegular.js';
import { notoSansBold } from './notoSansBold.js';
function registerNotoSansFont(doc) {
  doc.addFileToVFS('NotoSans-Regular.ttf', notoSansRegular);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', notoSansBold);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
  doc.setFont('NotoSans', 'normal');
}

// Convert number to words (for amount in words)
export function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  }
  if (num < 1000) {
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + numberToWords(num % 100) : '');
  }
  if (num < 100000) {
    return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '');
  }
  return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + numberToWords(num % 100000) : '');
}

function getCurrencyWord(currency = 'INR') {
const mapping = {
    INR: 'Indian Rupees',
    AUD: 'Australian Dollar',
    USD: 'US Dollar',
    EUR: 'Euro'
  };
  return mapping[String(currency || 'INR').toUpperCase()] || String(currency || 'INR').toUpperCase();
}

function buildAmountInWords(amount = 0, currency = 'INR') {
  const rounded = Math.round(Number(amount) || 0);
  return `${numberToWords(rounded)} ${getCurrencyWord(currency)}`.trim();
}

function getDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

function buildInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const suffix = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `INV-${year}${month}${day}-${suffix}`;
}

const TABLE_HEADERS = ['S.No', 'Description', 'HSN CODE', 'Qty', 'Unit', 'Price', 'Total'];
const DEFAULT_TABLE_COLUMN_WIDTHS = [12, 72, 24, 12, 10, 26, 26];
const STRUCTURED_TABLE_COLUMN_RATIOS = [0.05, 0.58, 0.06, 0.06, 0.06, 0.10, 0.09];

// Spacing and layout constants for PDF
const PDF_SPACING = {
  headerBoxHeight: 40,      // Height for company info section
  spaceAfterHeader: 3,      // Space after header
  invoiceHeadingY: 50,      // Y position for invoice heading
  detailsStartY: 60,        // Y position for invoice details
  partyBoxY: 70,            // Y position for Bill To/Ship To boxes
  partyBoxHeight: 25,       // Height of party boxes (increased)
  spaceAfterParty: 2,       // Space after party boxes
  tableStartY: 118,         // Y position for items table
  marginLeft: 20,
  marginRight: 20,
  pageWidth: 210,
  pageHeight: 297,
}

const DEFAULT_CIN = 'U51909JH2022PTC019020';
const DEFAULT_GST = '20AAPCM9939C1ZB';
const DEFAULT_IEC = 'AAPCM9939C';
const LAST_BILL_TO_KEY = 'invoiceLastBillTo';
const LAST_SHIP_TO_KEY = 'invoiceLastShipTo';
const DEFAULT_BANK_DETAILS = {
  accountName:'MMHS-PHOTON PRIVATE LIMITED',
  accountNumber: '10097836979',
  bankName: 'IDFC FIRST BANK, Main Road, Ranchi, Jharkhand,India',
  ifscCode: 'IDFB0060341',
  swiftCode: 'IDFBINBBMUM',
  adCode: '2010222',
  locationCode: 'INDEL4'
};

function getDefaultLogoDataUrl() {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('defaultInvoiceLogoDataUrl') || '';
  } catch (error) {
    return '';
  }
}

function fitTextToCell(doc, value, maxWidth) {
  const text = value === null || value === undefined ? '' : String(value);
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidth) return text;

  let trimmed = text;
  while (trimmed.length > 0 && doc.getTextWidth(`${trimmed}...`) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed ? `${trimmed}...` : '';
}

function getDefaultPartyData(storageKey) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return {
      name: parsed.name || '',
      address: parsed.address || '',
      postcode: parsed.postcode || '',
      phone: parsed.phone || '',
      email: parsed.email || '',
      web: parsed.web || ''
    };
  } catch (error) {
    return {};
  }
}

function getWebsiteHref(website = '') {
  if (!website) return '';
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

function getMailtoHref(email = '') {
  return email ? `mailto:${email}` : '';
}

function drawLinkText(doc, text, x, y, url) {
  if (!url) {
    doc.text(text, x, y);
    return;
  }
  doc.setTextColor(0, 0, 255);
  doc.textWithLink(text, x, y, { url });

  // Draw underline manually
  const textWidth = doc.getTextWidth(text);
  const lineY = y + 0.8;     // just below baseline
  doc.setDrawColor(0, 0, 255);
  doc.setLineWidth(0.2);
  doc.line(x, lineY, x + textWidth, lineY);
  doc.setDrawColor(80);      // reset
  doc.setLineWidth(0.25);    // reset

  doc.setTextColor(0, 0, 0);
}
function getDetailLines(value = '') {
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeDetailToken(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getSanitizedDetailRows(header = '', detailItems = '') {
  const rows = getDetailLines(detailItems);
  if (rows.length === 0) return rows;

  const normalizedHeader = normalizeDetailToken(header);
  if (!normalizedHeader) return rows;

  if (normalizeDetailToken(rows[0]) === normalizedHeader) {
    return rows.slice(1);
  }

  return rows;
}

function resolveTableColumnWidths(baseColumnWidths = DEFAULT_TABLE_COLUMN_WIDTHS, rows = []) {
  const safeBase = Array.isArray(baseColumnWidths) && baseColumnWidths.length === 7
    ? baseColumnWidths.map((width) => Number(width) || 0)
    : [...DEFAULT_TABLE_COLUMN_WIDTHS];

  const totalWidth = safeBase.reduce((sum, width) => sum + width, 0);
  if (totalWidth <= 0) return [...DEFAULT_TABLE_COLUMN_WIDTHS];

  const hasStructuredRows = rows.some((item) => (item?.descriptionMode || 'simple') === 'detailed');
  if (!hasStructuredRows) {
    return safeBase;
  }

  const rebalanced = STRUCTURED_TABLE_COLUMN_RATIOS.map((ratio) => Number((ratio * totalWidth).toFixed(2)));
  const widthDiff = Number((totalWidth - rebalanced.reduce((sum, width) => sum + width, 0)).toFixed(2));
  rebalanced[1] = Number((rebalanced[1] + widthDiff).toFixed(2));

  return rebalanced;
}

function drawItemsTable(doc, items = [], startY = 160, options = {}) {
  const startX = options.startX ?? 20;
  const minRowHeight = options.rowHeight ?? 8;
  const headerHeight = options.headerHeight ?? 7;
  const baseColumnWidths = Array.isArray(options.columnWidths) && options.columnWidths.length === 7
    ? options.columnWidths
    : DEFAULT_TABLE_COLUMN_WIDTHS;
  const rows = Array.isArray(items) && items.length > 0
    ? items
    : [{ description: '', hsnCode: '', quantity: '', unit: '', price: '', total: '' }];
    
  const columnWidths = resolveTableColumnWidths(baseColumnWidths, rows);

  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const descriptionColWidth = columnWidths[1];
  const descriptionTextWidth = descriptionColWidth - 4;
  const detailLineHeight = 3.8;
  const detailItemRowMinHeight = 5.5;

  const rowRenderMeta = rows.map((item) => {
    const isDetailed = (item?.descriptionMode || 'simple') === 'detailed';
    if (!isDetailed) {
      const simpleLines = doc.splitTextToSize(item?.description || '', descriptionTextWidth);
      const simpleHeight = Math.max(minRowHeight, Math.max(1, simpleLines.length) * 3.8 + 2);
      return {
        isDetailed: false,
        simpleLines,
        rowHeight: simpleHeight
      };
    }

    const titleLines = doc.splitTextToSize(item?.detailTitle || item?.description || '-', descriptionTextWidth);
    const detailHeader = String(item?.detailHeader || 'Consist of:-').trim() || 'Consist of:-';
    const detailItems = getSanitizedDetailRows(detailHeader, item?.detailItems);
    const noteLines = doc.splitTextToSize(item?.detailNote || '', descriptionTextWidth);
    const detailRows = (detailItems.length > 0 ? detailItems : ['']).map((line) => {
      const wrappedLines = doc.splitTextToSize(line, descriptionTextWidth - 2);
      const lines = wrappedLines.length > 0 ? wrappedLines : [''];
      const rowHeight = Math.max(detailItemRowMinHeight, lines.length * detailLineHeight + 2);
      return { lines, rowHeight };
    });
    const tableBlockHeight = detailRows.reduce((sum, row) => sum + row.rowHeight, 0);
    const rowHeight = Math.max(
      minRowHeight,
      6 +
        Math.max(1, titleLines.length) * detailLineHeight +
        2 +
        detailLineHeight +
        2 +
        tableBlockHeight +
        (noteLines.length > 0 ? 5 + noteLines.length * detailLineHeight : 0) +
        3
    );

    return {
      isDetailed: true,
      titleLines,
      detailHeader,
      detailRows,
      noteLines,
      rowHeight
    };
  });

  const rowsHeight = rowRenderMeta.reduce((sum, meta) => sum + meta.rowHeight, 0);
  const additionalDescription = String(options.additionalDescription || '').trim();
  const descriptionLineHeight = 4.5;
  const hasAdditionalDescription = additionalDescription.length > 0;
  const descriptionLines = hasAdditionalDescription ? doc.splitTextToSize(additionalDescription, tableWidth - 4) : [];
  const descriptionAreaHeight = hasAdditionalDescription
    ? Math.max(10, (descriptionLines.length * descriptionLineHeight) + 6)
    : 0;
  const tableHeight = headerHeight + rowsHeight + descriptionAreaHeight;
  const descriptionStartY = startY + headerHeight + rowsHeight;
  const tableBottomY = startY + tableHeight;

  doc.setDrawColor(80);
  doc.setLineWidth(0.25);
  doc.rect(startX, startY, tableWidth, tableHeight);

  doc.line(startX, startY + headerHeight, startX + tableWidth, startY + headerHeight);
  let runningRowY = startY + headerHeight;
  rowRenderMeta.forEach((meta) => {
    runningRowY += meta.rowHeight;
    const lineY = runningRowY;
    doc.line(startX, lineY, startX + tableWidth, lineY);
  });

  let separatorX = startX;
  columnWidths.slice(0, -1).forEach((width) => {
    separatorX += width;
    doc.line(separatorX, startY, separatorX, descriptionStartY);
  });

  doc.setFont('NotoSans', 'bold');
doc.setFontSize(7);
let headerX = startX;

const currency = options.currency || 'INR';
const dynamicHeaders = ['S.No', 'Description', 'HSN CODE', 'Qty', 'Unit', `Price (${currency})`, `Total (${currency})`];

dynamicHeaders.forEach((header, columnIndex) => {
  const width = columnWidths[columnIndex];
  const textX = headerX + (width / 2);
  doc.text(header, textX, startY + 4, { align: 'center' });
  headerX += width;
});
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);

  let rowTopY = startY + headerHeight;
  rows.forEach((item, rowIndex) => {
    const rowMeta = rowRenderMeta[rowIndex];
    const rowHeight = rowMeta.rowHeight;
    const quantityText = item?.quantity === '' || item?.quantity === null || item?.quantity === undefined
      ? ''
      : String(Number(item.quantity) || 0);
    const priceText = item?.price === '' || item?.price === null || item?.price === undefined
      ? ''
      : formatCurrency(Number(item.price) || 0, options.currency || 'INR');
    const totalText = item?.total === '' || item?.total === null || item?.total === undefined
      ? ''
      : formatCurrency(Number(item.total) || 0, options.currency || 'INR');

    const values = [
      String(rowIndex + 1),
      '',
      item?.hsnCode || '',
      quantityText,
      item?.unit || '',
      priceText,
      totalText
    ];

    let cellX = startX;
    values.forEach((value, columnIndex) => {
      const width = columnWidths[columnIndex];
      const isNumericColumn = [0, 3, 5, 6].includes(columnIndex);
      if (columnIndex === 1) {
        cellX += width;
        return;
      }
      const paddedText = fitTextToCell(doc, value, width - 4);
const rowY = rowTopY + 5;

// alignment fix
let align = 'left';
let textX = cellX + 2;

if (isNumericColumn) {
  align = 'right';
  textX = cellX + width - 2;
}

doc.text(paddedText, textX, rowY, { align });
      cellX += width;
    });

    const descCellX = startX + columnWidths[0];
    const descTextX = descCellX + 2;
    if (rowMeta.isDetailed) {
      let detailY = rowTopY + 4;
      doc.setFont('NotoSans', 'bold');
      doc.setFontSize(9);
      doc.text(rowMeta.titleLines, descCellX + (descriptionColWidth / 2), detailY, { align: 'center' });
      detailY += Math.max(1, rowMeta.titleLines.length) * detailLineHeight + 2;

      doc.setFontSize(9);
      doc.text(rowMeta.detailHeader, descTextX, detailY);
      detailY += detailLineHeight + 2;

      const detailBoxX = descTextX;
      const detailBoxY = detailY;
      const detailBoxWidth = descriptionColWidth - 4;
      const detailBoxHeight = rowMeta.detailRows.reduce((sum, row) => sum + row.rowHeight, 0);
      doc.rect(detailBoxX, detailBoxY, detailBoxWidth, detailBoxHeight);

      let detailRowCursorY = detailBoxY;
      rowMeta.detailRows.forEach((row, detailIndex) => {
        if (detailIndex > 0) {
          const separatorY = detailRowCursorY;
          doc.line(detailBoxX, separatorY, detailBoxX + detailBoxWidth, separatorY);
        }
        doc.setFontSize(7);
        doc.text(row.lines, detailBoxX + (detailBoxWidth / 2), detailRowCursorY + 3, { align: 'center' });
        detailRowCursorY += row.rowHeight;
      });

      detailY = detailBoxY + detailBoxHeight + 5;
      if (rowMeta.noteLines.length > 0) {
        doc.setFontSize(8);
        doc.setFont('NotoSans', 'bold');
        doc.setFontSize(7);
        doc.text(rowMeta.noteLines, descTextX, detailY);
      }
      doc.setFont('NotoSans', 'normal');
    } else {
      const simpleLines = rowMeta.simpleLines.length > 0 ? rowMeta.simpleLines : ['-'];
      doc.setFontSize(8);
      doc.text(simpleLines, descTextX, rowTopY + 5);
    }

    rowTopY += rowHeight;
  });

  if (hasAdditionalDescription) {
    doc.setDrawColor(220);
    for (let lineY = descriptionStartY + 6; lineY < tableBottomY - 1; lineY += 4.5) {
      doc.line(startX + 2, lineY, startX + tableWidth - 2, lineY);
    }
    doc.setDrawColor(80);
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(8);
    doc.text(descriptionLines, startX + 2, descriptionStartY + 3.5);
  }

  return tableBottomY;
}

function drawTotalsAndWordsBox(doc, invoiceData, yPos) {
  const boxY = yPos + 4;
  const boxHeight = 22;
  const tableStartX = 20;
  const tableWidth = DEFAULT_TABLE_COLUMN_WIDTHS.reduce((sum, w) => sum + w, 0);
  const dividerX = tableStartX + tableWidth - 70; // right portion for totals

  doc.setDrawColor(80);
  doc.rect(tableStartX, boxY, tableWidth, boxHeight);
  doc.line(dividerX, boxY, dividerX, boxY + boxHeight);

  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.text('Amount in Words:', tableStartX + 4, boxY + 5);
  doc.setFont('NotoSans', 'normal');
  const words = doc.splitTextToSize(invoiceData.amountInWords || '-', dividerX - tableStartX - 8);
  doc.text(words, tableStartX + 4, boxY + 10);

  const rightTextX = dividerX + 4;
  const rightValueX = tableStartX + tableWidth - 2;

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.text('Sub Total:', rightTextX, boxY + 4);
  doc.text(formatCurrency(invoiceData.subtotal, invoiceData.currency), rightValueX, boxY + 4, { align: 'right' });

  const rows = [];
  const isTaxInvoice = invoiceData.invoiceHeading === 'TAX INVOICE';
  const gstType = invoiceData.gstType || 'IGST';
  const showAdvancePaidLine = !(isTaxInvoice && gstType === 'Advanced Payment');

  if (isTaxInvoice) {
    if (gstType === 'IGST') {
      const igstAmount = (invoiceData.subtotal * (invoiceData.igstRate || 0)) / 100;
      rows.push({ label: `IGST (${invoiceData.igstRate || 0}%):`, value: invoiceData.igstRate > 0 ? formatCurrency(igstAmount, invoiceData.currency) : 'N/A' });
    } else if (gstType === 'CGST+SGST') {
      const cgstAmount = (invoiceData.subtotal * (invoiceData.cgstRate || 0)) / 100;
      const sgstAmount = (invoiceData.subtotal * (invoiceData.sgstRate || 0)) / 100;
      rows.push({ label: `CGST (${invoiceData.cgstRate || 0}%):`, value: invoiceData.cgstRate > 0 ? formatCurrency(cgstAmount, invoiceData.currency) : 'N/A' });
      rows.push({ label: `SGST (${invoiceData.sgstRate || 0}%):`, value: invoiceData.sgstRate > 0 ? formatCurrency(sgstAmount, invoiceData.currency) : 'N/A' });
    } else if (gstType === 'ALL') {
      const igstAmount = (invoiceData.subtotal * (invoiceData.igstRate || 0)) / 100;
      const cgstAmount = (invoiceData.subtotal * (invoiceData.cgstRate || 0)) / 100;
      const sgstAmount = (invoiceData.subtotal * (invoiceData.sgstRate || 0)) / 100;
      rows.push({ label: `IGST (${invoiceData.igstRate || 0}%):`, value: invoiceData.igstRate > 0 ? formatCurrency(igstAmount, invoiceData.currency) : 'N/A' });
      rows.push({ label: `CGST (${invoiceData.cgstRate || 0}%):`, value: invoiceData.cgstRate > 0 ? formatCurrency(cgstAmount, invoiceData.currency) : 'N/A' });
      rows.push({ label: `SGST (${invoiceData.sgstRate || 0}%):`, value: invoiceData.sgstRate > 0 ? formatCurrency(sgstAmount, invoiceData.currency) : 'N/A' });
    } else if (gstType === 'N/A') {
      rows.push({ label: 'Tax:', value: 'N/A' });
    } else if (gstType === 'Advanced Payment') {
      rows.push({ label: 'Advanced Payment:', value: formatCurrency(invoiceData.advancePayment || 0, invoiceData.currency) });
    }
  } else if (invoiceData.invoiceHeading !== 'INVOICE UNDER LUT') {
    rows.push({ label: `Tax (${invoiceData.taxRate || 0}%):`, value: formatCurrency(invoiceData.taxAmount || 0, invoiceData.currency) });
  }

  rows.push({ label: 'Total:', value: formatCurrency(invoiceData.total, invoiceData.currency) });
  if (showAdvancePaidLine) {
    rows.push({ label: 'Advance Paid:', value: formatCurrency(invoiceData.advancePayment || 0, invoiceData.currency) });
  }
  rows.push({ label: 'Total Balance:', value: formatCurrency(invoiceData.totalBalance || 0, invoiceData.currency) });

 let yOffset = 8;
  rows.forEach((row) => {
    const isTotalBalance = row.label === 'Total Balance:';
    doc.setFont('NotoSans', isTotalBalance ? 'bold' : 'normal');
    doc.text(row.label, rightTextX, boxY + yOffset);
    doc.text(row.value, rightValueX, boxY + yOffset, { align: 'right' });
    yOffset += 4;
  });
  doc.setFont('NotoSans', 'normal'); // reset after loop

  return boxY + boxHeight;
}

function drawBankAndSignatureBoxes(doc, invoiceData, yPos) {
  const topY = yPos + 4;
  const tableStartX = 20;
  const tableWidth = DEFAULT_TABLE_COLUMN_WIDTHS.reduce((sum, w) => sum + w, 0);
  const leftBoxWidth = Math.round(tableWidth * 0.55);
  const rightBoxWidth = tableWidth - leftBoxWidth;
  const rightX = tableStartX + leftBoxWidth;
  const padding = 3;

  doc.setDrawColor(80);

  const bankLines = [
    ...(invoiceData.bankDetails?.accountName ? [{ label: 'Account Name', value: invoiceData.bankDetails.accountName }] : []),
    ...(invoiceData.bankDetails?.bankName ? [{ label: 'Bank', value: invoiceData.bankDetails.bankName }] : []),
    ...(invoiceData.bankDetails?.accountNumber ? [{ label: 'Account', value: invoiceData.bankDetails.accountNumber }] : []),
    ...(invoiceData.bankDetails?.ifscCode ? [{ label: 'IFSC', value: invoiceData.bankDetails.ifscCode }] : []),
    ...(invoiceData.bankDetails?.swiftCode ? [{ label: 'Swift Code', value: invoiceData.bankDetails.swiftCode }] : []),
    ...(invoiceData.bankDetails?.adCode ? [{ label: 'AD Code', value: invoiceData.bankDetails.adCode }] : []),
    ...(invoiceData.notes ? [{ label: 'Note', value: invoiceData.notes }] : [])
  ];

  // Pre-calculate total height
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(8.5);
  let totalLines = 0;
  bankLines.forEach((item) => {
    // measure label width at bold 8.5
    const labelPrefix = `${item.label}: `;
    const labelW = doc.getTextWidth(labelPrefix);
    const valueMaxWidth = leftBoxWidth - padding * 2 - labelW;
    doc.setFont('NotoSans', 'normal');
    const valueWrapped = doc.splitTextToSize(item.value, Math.max(valueMaxWidth, 20));
    doc.setFont('NotoSans', 'bold');
    totalLines += valueWrapped.length;
  });

  const leftHeight = 12 + totalLines * 4.8 + bankLines.length * 1.2;
  const rightHeight = 32;
  const boxHeight = Math.max(leftHeight, rightHeight);

  doc.rect(tableStartX, topY, leftBoxWidth, boxHeight);
  doc.rect(rightX, topY, rightBoxWidth, boxHeight);

  // --- Heading
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.text('Bank Details', tableStartX + padding, topY + 5);

  // --- Bank lines
  let lineY = topY + 12;
  doc.setFontSize(8.5);

  bankLines.forEach((item) => {
    const labelPrefix = `${item.label}: `;

    // Measure label width at bold
    doc.setFont('NotoSans', 'bold');
    const labelW = doc.getTextWidth(labelPrefix);

    // Wrap value at remaining width
    doc.setFont('NotoSans', 'normal');
    const valueMaxWidth = leftBoxWidth - padding * 2 - labelW;
    const valueLines = doc.splitTextToSize(item.value, Math.max(valueMaxWidth, 20));

    // Draw bold label
    doc.setFont('NotoSans', 'bold');
    doc.text(labelPrefix, tableStartX + padding, lineY);

    // Draw normal value — first line on same Y, rest indented below
    doc.setFont('NotoSans', 'normal');
    valueLines.forEach((vLine, i) => {
      doc.text(vLine, tableStartX + padding + labelW, lineY + i * 4.8);
    });

    lineY += valueLines.length * 4.8 + 1.2; // line height + gap between fields
  });

  // --- Right box
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9.5);
  doc.text(`For ${invoiceData.companyName}`, rightX + padding, topY + 6);

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9);
  doc.text(
    invoiceData.authorizedSignatory || 'Authorised Signatory',
    rightX + rightBoxWidth / 2,
    topY + boxHeight - 5,
    { align: 'center' }
  );

  return topY + boxHeight;
}
function getImageFormatFromDataUrl(dataUrl = '') {
  if (!dataUrl.startsWith('data:image/')) return 'PNG';
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return 'JPEG';
  if (dataUrl.includes('image/webp')) return 'WEBP';
  return 'PNG';
}

function drawInvoiceHeader(doc, invoiceData) {
  
  const leftX = PDF_SPACING.marginLeft;
  const rightX = 155;
  const logoWidth = 38;
  const logoHeight = 13;
  const imgWidth = 38;
  const imgHeight = 13;
  const contentWidth = 110;
   const topMargin = 15;
  let currentY = topMargin;
  // ===== COMPANY INFO (LEFT) =====
  doc.setTextColor(14, 165, 233);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(16);
  doc.text(invoiceData.companyName || '-', leftX, currentY);

  currentY += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  
  const addressLines = doc.splitTextToSize(invoiceData.companyAddress || '-', contentWidth);
  doc.text(addressLines, leftX, currentY);
  currentY += addressLines.length * 4;
  
  doc.text(`Phone: ${invoiceData.companyPhone || '-'}`, leftX, currentY);
  currentY += 4;
  doc.text(`Mobile: ${invoiceData.companyMobile || '-'}`, leftX, currentY);
  currentY += 4;
  
  const emailText = `Email: ${invoiceData.companyEmail || '-'}`;
drawLinkText(doc, emailText, leftX, currentY, getMailtoHref(invoiceData.companyEmail));
currentY += 4;

if (invoiceData.companyWeb) {
  const webText = `Web: ${invoiceData.companyWeb}`;
  drawLinkText(doc, webText, leftX, currentY, getWebsiteHref(invoiceData.companyWeb));
  currentY += 4;

  }

  // ===== LOGO (RIGHT) - NO BOX =====
  // Logo image only, no border box - aligned with company name
  if (invoiceData.logoDataUrl) {
    try {
      doc.addImage(invoiceData.logoDataUrl, getImageFormatFromDataUrl(invoiceData.logoDataUrl), rightX, 8, imgWidth, imgHeight);
    } catch (error) {
      console.error('Could not render logo image:', error);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text('Logo', rightX + logoWidth / 2, 14, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
  } else {
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text('Logo', rightX + logoWidth / 2, 14, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // CIN/GST/IEC box - positioned below logo
 const cinBoxX = rightX;
  const cinBoxY = 22;
  const cinBoxWidth = imgWidth;
  const cinBoxHeight = 16;

  doc.setDrawColor(80);
  doc.setLineWidth(0.25);
  doc.rect(cinBoxX, cinBoxY, cinBoxWidth, cinBoxHeight);

  // Text styling for CIN box
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7);
if (invoiceData.cin) doc.text(`CIN: ${invoiceData.cin}`, cinBoxX + 1.5, cinBoxY + 3.5);
  if (invoiceData.gst) doc.text(`GST: ${invoiceData.gst}`, cinBoxX + 1.5, cinBoxY + 8);
  if (invoiceData.iec) doc.text(`IEC: ${invoiceData.iec}`, cinBoxX + 1.5, cinBoxY + 12.5);

  // ===== INVOICE HEADING (CENTERED) - NO DIVIDER =====
  // Position heading with gap below logo and CIN box
  currentY = 45;
  doc.setTextColor(14, 165, 233);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(12);
  doc.text(invoiceData.invoiceHeading || 'INVOICING UNDER LUT', 100, currentY, { align: 'center' });
  
  currentY += 4;
  if (invoiceData.invoiceSubheading) {
    doc.setFontSize(9);
    doc.text(invoiceData.invoiceSubheading, 100, currentY, { align: 'center' });
    currentY += 4;
  }

  // ===== INVOICE DETAILS GRID (2 COLUMNS) =====
  currentY += 1;
  doc.setTextColor(0, 0, 0);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);

  const detailsLeftX = leftX;
  const detailsRightX = 110;
  let rowY = currentY;

  // Unified date formatter → DD/MM/YYYY
function formatDate(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

const details = [
  { label: 'Invoice No.', value: invoiceData.invoiceNumber || '' },
  { label: 'Buyer Order No.', value: invoiceData.buyerOrderNo || '' },
  { label: 'Invoice Date', value: invoiceData.date ? formatDate(invoiceData.date) : '' },
  { label: 'Buyer PO Date', value: invoiceData.buyerPoDate ? formatDate(invoiceData.buyerPoDate) : '' },
  { label: 'State Code', value: invoiceData.stateCode || '' },
  { label: 'Payment Terms', value: invoiceData.paymentTerms || '' },
];
  for (let i = 0; i < details.length; i += 2) {
    const leftDetail = details[i];
    const rightDetail = details[i + 1];

    doc.setFont('NotoSans', 'bold');
    doc.text(`${leftDetail.label}:`, detailsLeftX, rowY);
    doc.setFont('NotoSans', 'normal');
    doc.text(leftDetail.value, detailsLeftX + 28, rowY);

    if (rightDetail) {
      doc.setFont('NotoSans', 'bold');
      doc.text(`${rightDetail.label}:`, detailsRightX, rowY);
      doc.setFont('NotoSans', 'normal');
      doc.text(rightDetail.value, detailsRightX + 28, rowY);
    }

    rowY += 3.5;
  }

  return rowY + 2;
}

function drawPartyBoxes(doc, invoiceData, startY) {
  const boxWidth = 87;
  const leftX = PDF_SPACING.marginLeft;
  const rightX = leftX + boxWidth + 8;
  const maxTextWidth = boxWidth - 4;
  const lineHeight = 4.2;

  // Helper: split "COMPANY NAME (ABN xx xxx xxx xxx)" into name + abn
  const splitNameAbn = (fullName = '') => {
    const match = fullName.match(/^(.*?)\s*(\(ABN[\s\d]+\))$/i)
    return match
      ? { name: match[1].trim(), abn: match[2].trim() }
      : { name: fullName.trim(), abn: '' }
  }

  const billParsed = splitNameAbn(invoiceData.billTo?.name || '')
  const shipParsed = splitNameAbn(invoiceData.shipTo?.name || '')

  // Bill To lines
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(10)
  const billNameLines = billParsed.name ? doc.splitTextToSize(billParsed.name, maxTextWidth) : []
  doc.setFontSize(8)
  const billAbnLines = billParsed.abn ? doc.splitTextToSize(billParsed.abn, maxTextWidth) : []

  doc.setFontSize(8)
  doc.setFont('NotoSans', 'normal')
  const billAddressLines = invoiceData.billTo?.address
    ? doc.splitTextToSize(invoiceData.billTo.address, maxTextWidth).slice(0, 3)
    : []
  const billEmailLines = invoiceData.billTo?.email
    ? doc.splitTextToSize(`Email: ${invoiceData.billTo.email}`, maxTextWidth)
    : []
  const billWebLines = invoiceData.billTo?.web
    ? doc.splitTextToSize(`Web: ${invoiceData.billTo.web}`, maxTextWidth)
    : []
  const billPhoneLines = invoiceData.billTo?.phone
    ? doc.splitTextToSize(`Tel: ${invoiceData.billTo.phone}`, maxTextWidth)
    : []

  // Ship To lines
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(10)
  const shipNameLines = shipParsed.name ? doc.splitTextToSize(shipParsed.name, maxTextWidth) : []
  doc.setFontSize(8)
  const shipAbnLines = shipParsed.abn ? doc.splitTextToSize(shipParsed.abn, maxTextWidth) : []

  doc.setFontSize(8)
  doc.setFont('NotoSans', 'normal')
  const shipAddressLines = invoiceData.shipTo?.address
    ? doc.splitTextToSize(invoiceData.shipTo.address, maxTextWidth).slice(0, 3)
    : []
  const shipEmailLines = invoiceData.shipTo?.email
    ? doc.splitTextToSize(`Email: ${invoiceData.shipTo.email}`, maxTextWidth)
    : []
  const shipWebLines = invoiceData.shipTo?.web
    ? doc.splitTextToSize(`Web: ${invoiceData.shipTo.web}`, maxTextWidth)
    : []
  const shipPhoneLines = invoiceData.shipTo?.phone
    ? doc.splitTextToSize(`Tel: ${invoiceData.shipTo.phone}`, maxTextWidth)
    : []

  const boxHeight = Math.max(32,
    8 + billNameLines.length * lineHeight +
    billAbnLines.length * lineHeight +
    billAddressLines.length * lineHeight +
    billEmailLines.length * lineHeight +
    billWebLines.length * lineHeight +
    billPhoneLines.length * lineHeight + 6,

    8 + shipNameLines.length * lineHeight +
    shipAbnLines.length * lineHeight +
    shipAddressLines.length * lineHeight +
    shipEmailLines.length * lineHeight +
    shipWebLines.length * lineHeight +
    shipPhoneLines.length * lineHeight + 6
  )

  // ===== BILL TO =====
  doc.setDrawColor(80)
  doc.setLineWidth(0.25)
  doc.rect(leftX, startY, boxWidth, boxHeight)

  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(8)
  doc.text('BILL TO', leftX + 2, startY + 4)

  let billY = startY + 9

  // Large bold company name
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(10)
  if (billNameLines.length) {
    doc.text(billNameLines, leftX + 2, billY)
    billY += billNameLines.length * lineHeight
  }

  // Smaller ABN line below
  if (billAbnLines.length) {
    doc.setFontSize(8)
    doc.text(billAbnLines, leftX + 2, billY)
    billY += billAbnLines.length * lineHeight
  }

  doc.setFont('NotoSans', 'normal')
  doc.setFontSize(8)

  if (billAddressLines.length) {
    doc.text(billAddressLines, leftX + 2, billY)
    billY += billAddressLines.length * lineHeight
  }

  if (invoiceData.billTo?.postcode) {
    doc.text(`Postal Code: ${invoiceData.billTo.postcode}`, leftX + 2, billY)
    billY += lineHeight
  }

  if (billEmailLines.length) {
    billEmailLines.forEach((line, i) => {
      drawLinkText(doc, line, leftX + 2, billY + i * lineHeight, getMailtoHref(invoiceData.billTo?.email))
    })
    billY += billEmailLines.length * lineHeight
  }

  if (billWebLines.length) {
    billWebLines.forEach((line, i) => {
      drawLinkText(doc, line, leftX + 2, billY + i * lineHeight, getWebsiteHref(invoiceData.billTo?.web))
    })
    billY += billWebLines.length * lineHeight
  }

  if (billPhoneLines.length) {
    doc.text(billPhoneLines, leftX + 2, billY)
  }

  // ===== SHIP TO =====
  doc.rect(rightX, startY, boxWidth, boxHeight)

  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(8)
  doc.text('SHIP TO', rightX + 2, startY + 4)

  let shipY = startY + 9

  // Large bold company name
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(10)
  if (shipNameLines.length) {
    doc.text(shipNameLines, rightX + 2, shipY)
    shipY += shipNameLines.length * lineHeight
  }

  // Smaller ABN line below
  if (shipAbnLines.length) {
    doc.setFontSize(8)
    doc.text(shipAbnLines, rightX + 2, shipY)
    shipY += shipAbnLines.length * lineHeight
  }

  doc.setFont('NotoSans', 'normal')
  doc.setFontSize(8)

  if (shipAddressLines.length) {
    doc.text(shipAddressLines, rightX + 2, shipY)
    shipY += shipAddressLines.length * lineHeight
  }

  if (invoiceData.shipTo?.postcode) {
    doc.text(`Postal Code: ${invoiceData.shipTo.postcode}`, rightX + 2, shipY)
    shipY += lineHeight
  }

  if (shipEmailLines.length) {
    shipEmailLines.forEach((line, i) => {
      drawLinkText(doc, line, rightX + 2, shipY + i * lineHeight, getMailtoHref(invoiceData.shipTo?.email))
    })
    shipY += shipEmailLines.length * lineHeight
  }

  if (shipWebLines.length) {
    shipWebLines.forEach((line, i) => {
      drawLinkText(doc, line, rightX + 2, shipY + i * lineHeight, getWebsiteHref(invoiceData.shipTo?.web))
    })
    shipY += shipWebLines.length * lineHeight
  }

  if (shipPhoneLines.length) {
    doc.text(shipPhoneLines, rightX + 2, shipY)
  }

  return startY + boxHeight + 4
}
// Calculate totals for invoice items
export function calculateTotals(items = [], taxRates = { igst: 0, cgst: 0, sgst: 0 }) {
  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item?.quantity) || 0;
    const price = Number(item?.price) || 0;
    return sum + quantity * price;
  }, 0);
  
  // Support both old format (number) and new format (object)
  let taxAmount = 0;
  if (typeof taxRates === 'number') {
    // Legacy support for simple tax rate
    const safeTaxRate = Number(taxRates) || 0;
    taxAmount = (subtotal * safeTaxRate) / 100;
  } else {
    // New format: sum of all applicable tax rates
    const igstAmount = (subtotal * (Number(taxRates?.igst) || 0)) / 100;
    const cgstAmount = (subtotal * (Number(taxRates?.cgst) || 0)) / 100;
    const sgstAmount = (subtotal * (Number(taxRates?.sgst) || 0)) / 100;
    taxAmount = igstAmount + cgstAmount + sgstAmount;
  }
  
  const total = subtotal + taxAmount;
  
  return { subtotal, taxAmount, total };
}

// Generate unique ID for invoice items
export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createInvoiceItem(overrides = {}) {
  return {
    id: generateId(),
    descriptionMode: 'simple',
    description: '',
    detailTitle: '',
    detailHeader: 'Consist of:-',
    detailItems: '',
    detailNote: '',
    hsnCode: '',
    quantity: 1,
    unit: '',
    price: 0,
    total: 0,
    ...overrides
  };
}

export function createDefaultInvoiceData() {
  const storedBillTo = getDefaultPartyData(LAST_BILL_TO_KEY);
  const storedShipTo = getDefaultPartyData(LAST_SHIP_TO_KEY);
  const items = [createInvoiceItem()];
  const { subtotal, taxAmount, total } = calculateTotals(items, { igst: 0, cgst: 0, sgst: 0 });

  return {
    invoiceNumber: buildInvoiceNumber(),
    date: getDateString(0),
    dueDate: getDateString(30),
    invoiceHeading: 'INVOICE UNDER LUT',
    invoiceSubheading: '',
    gstType: 'IGST',
    igstRate: 18,
    cgstRate: 9,
    sgstRate: 9,
    currency: 'INR',
    companyName: 'MMHS-PHOTON PRIVATE LIMITED',
    companyAddress: '407, 4th Floor, Le-Desire Complex\n304, Circular Road, Lalpur, Ranchi 834001',
    companyPhone: '0651-3524363',
    companyMobile: '+91 9153935491, +919431706935',
    companyEmail: 'ashok.pathak@photonoffshore.com',
    companyWeb: 'www.mmhs-photon.com',
    logoDataUrl: getDefaultLogoDataUrl(),
    cin: DEFAULT_CIN,
    gst: DEFAULT_GST,
    iec: DEFAULT_IEC,
    signatureDataUrl: '',
    authorizedSignatory: 'Authorised Signatory',
    buyerOrderNo: '',
    buyerPoDate: '',
    stateCode: '20',
    paymentTerms: 'within 15 days',
    billTo: {
      name: '',
      address: '',
      postcode: '',
      phone: '',
      email: '',
      web: '',
      ...storedBillTo
    },
    shipTo: {
      name: '',
      address: '',
      postcode: '',
      phone: '',
      email: '',
      web: '',
      ...storedShipTo
    },
    items,
    subtotal,
    taxRate: 0,
    taxAmount,
    total,
    advancePayment: 0,
    totalBalance: total,
    amountInWords: buildAmountInWords(total, 'INR'),
    additionalDescription: '',
    bankDetails: {
      ...DEFAULT_BANK_DETAILS
    },
    notes: ''
  };
}

export function recalculateInvoice(invoiceData) {
  const safeItems = Array.isArray(invoiceData?.items) && invoiceData.items.length > 0
    ? invoiceData.items.map((item) => {
      const quantity = Number(item?.quantity) || 0;
      const price = Number(item?.price) || 0;
      return {
        ...createInvoiceItem(),
        ...item,
        id: item?.id || generateId(),
        quantity,
        price,
        total: quantity * price
      };
    })
    : [createInvoiceItem()];

  // Determine tax rates based on GST type
  let taxRates = { igst: 0, cgst: 0, sgst: 0 };
  let effectiveTaxRate = 0;
  
  if (invoiceData?.invoiceHeading === 'TAX INVOICE') {
    const gstType = invoiceData?.gstType || 'IGST';
    
    if (gstType === 'IGST') {
      taxRates.igst = Number(invoiceData?.igstRate) || 0;
      effectiveTaxRate = taxRates.igst;
    } else if (gstType === 'CGST+SGST') {
      taxRates.cgst = Number(invoiceData?.cgstRate) || 0;
      taxRates.sgst = Number(invoiceData?.sgstRate) || 0;
      effectiveTaxRate = taxRates.cgst + taxRates.sgst;
    } else if (gstType === 'ALL') {
      taxRates.igst = Number(invoiceData?.igstRate) || 0;
      taxRates.cgst = Number(invoiceData?.cgstRate) || 0;
      taxRates.sgst = Number(invoiceData?.sgstRate) || 0;
      effectiveTaxRate = taxRates.igst + taxRates.cgst + taxRates.sgst;
    } else if (gstType === 'N/A' || gstType === 'Advanced Payment') {
      effectiveTaxRate = 0;
    }
  } else if (invoiceData?.invoiceHeading === 'INVOICE UNDER LUT') {
    taxRates = { igst: 0, cgst: 0, sgst: 0 };
    effectiveTaxRate = 0;
  } else {
    // For non-tax invoices, use the single taxRate if available
    const singleRate = Number(invoiceData?.taxRate) || 0;
    taxRates = { igst: singleRate, cgst: 0, sgst: 0 };
    effectiveTaxRate = singleRate;
  }

  const { subtotal, taxAmount, total } = calculateTotals(safeItems, taxRates);
  const advancePayment = Number(invoiceData?.advancePayment) || 0;
  const totalBalance = Math.max(total - advancePayment, 0);

  return {
    ...invoiceData,
    igstRate: Number(invoiceData?.igstRate) || 0,
    cgstRate: Number(invoiceData?.cgstRate) || 0,
    sgstRate: Number(invoiceData?.sgstRate) || 0,
    taxRate: effectiveTaxRate,
    items: safeItems,
    subtotal,
    taxAmount,
    total,
    advancePayment,
    totalBalance,
    amountInWords: buildAmountInWords(total, invoiceData?.currency || 'INR'),
    bankDetails: {
      ...DEFAULT_BANK_DETAILS,
      ...(invoiceData?.bankDetails || {})
    },
    gstType: invoiceData?.gstType || 'IGST',
    currency: invoiceData?.currency || 'INR',
    notes: typeof invoiceData?.notes === 'string' ? invoiceData.notes : ''
  };
}

export function normalizeInvoiceData(rawData = {}) {
  const defaults = createDefaultInvoiceData();
  const mergedData = {
    ...defaults,
    ...rawData,
    billTo: {
      ...defaults.billTo,
      ...(rawData.billTo || {})
    },
    shipTo: {
      ...defaults.shipTo,
      ...(rawData.shipTo || {})
    },
    bankDetails: {
      ...defaults.bankDetails,
      ...(rawData.bankDetails || {})
    },
    items: Array.isArray(rawData.items) && rawData.items.length > 0
      ? rawData.items
      : defaults.items
  };

  return recalculateInvoice(mergedData);
}

// Save invoice to localStorage
export function saveInvoiceToStorage(invoiceData) {
  try {
    const savedInvoices = getSavedInvoices();
    const invoiceWithId = {
      ...invoiceData,
      id: invoiceData.id || generateId(),
      savedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    // Check if invoice already exists
    const existingIndex = savedInvoices.findIndex(inv => inv.id === invoiceWithId.id);
    if (existingIndex !== -1) {
      savedInvoices[existingIndex] = invoiceWithId;
    } else {
      savedInvoices.push(invoiceWithId);
    }
    
    localStorage.setItem('savedInvoices', JSON.stringify(savedInvoices));
    return { success: true, message: 'Invoice saved successfully!' };
  } catch (error) {
    return { success: false, message: 'Failed to save invoice: ' + error.message };
  }
}

// Get all saved invoices from localStorage
export function getSavedInvoices() {
  try {
    const saved = localStorage.getItem('savedInvoices');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading saved invoices:', error);
    return [];
  }
}

// Load a specific invoice by ID
export function loadInvoiceById(id) {
  const savedInvoices = getSavedInvoices();
  return savedInvoices.find(invoice => invoice.id === id);
}

// Delete a saved invoice
export function deleteSavedInvoice(id) {
  try {
    const savedInvoices = getSavedInvoices();
    const filteredInvoices = savedInvoices.filter(invoice => invoice.id !== id);
    localStorage.setItem('savedInvoices', JSON.stringify(filteredInvoices));
    return { success: true, message: 'Invoice deleted successfully!' };
  } catch (error) {
    return { success: false, message: 'Failed to delete invoice: ' + error.message };
  }
}

// Generate PDF from invoice data
export async function generatePDF(invoiceData) {
  try {
    // Import jsPDF dynamically to avoid SSR issues
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    registerNotoSansFont(doc);
    // Set font
    doc.setFont('NotoSans');
    doc.setFontSize(12);
    
    // Draw header with invoice heading and details
    let yPos = drawInvoiceHeader(doc, invoiceData);
    
    // Draw party boxes (Bill To and Ship To)
    yPos = drawPartyBoxes(doc, invoiceData, yPos);
    
    // Items table with visible rows and columns
    yPos = drawItemsTable(doc, invoiceData.items, yPos, {
      currency: invoiceData.currency,
      additionalDescription: invoiceData.additionalDescription
    });
    
    yPos = drawTotalsAndWordsBox(doc, invoiceData, yPos);
    yPos = drawBankAndSignatureBoxes(doc, invoiceData, yPos);
    
    return doc;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}
// Download invoice as PDF using template
export async function downloadInvoiceAsPDF(invoiceData, templateFile = null) {
  try {
    let doc;
    
    if (templateFile) {
      // Use template-based generation
      doc = await generatePDFFromTemplate(invoiceData, templateFile);
    } else {
      // Fallback to standard generation
      doc = await generatePDF(invoiceData);
    }
    
    const filename = `invoice-${invoiceData.invoiceNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    return { success: true, message: 'PDF downloaded successfully!' };
  } catch (error) {
    return { success: false, message: 'Failed to download PDF: ' + error.message };
  }
}

// Generate PDF using template structure
export async function generatePDFFromTemplate(invoiceData, templateFile) {
  // eslint-disable-next-line no-unused-vars
  const _templateFile = templateFile; // Suppress unused variable warning
  try {
    // Import jsPDF dynamically to avoid SSR issues
    const { jsPDF } = await import('jspdf');
    
    // For now, we'll use the standard generation but with template-aware logic
    // In a real implementation, you would:
    // 1. Parse the template PDF using pdf-lib
    // 2. Extract the layout and styling
    // 3. Apply the same layout with new data
    // 4. Generate new PDF with template structure
    
    const doc = new jsPDF();
    
    // Set font
    doc.setFont('NotoSans');
    doc.setFontSize(12);
    
    drawInvoiceHeader(doc, invoiceData);
    
    drawPartyBox(doc, 20, 132, 85, 32, 'Bill To', invoiceData.billTo);
    drawPartyBox(doc, 110, 132, 85, 32, 'Ship To', invoiceData.shipTo);
    
    // Items table with visible rows and columns
    let yPos = drawItemsTable(doc, invoiceData.items, 182, {
      currency: invoiceData.currency,
      additionalDescription: invoiceData.additionalDescription
    });
    yPos = drawTotalsAndWordsBox(doc, invoiceData, yPos);
    yPos = drawBankAndSignatureBoxes(doc, invoiceData, yPos);
    
    return doc;
  } catch (error) {
    console.error('Error generating PDF from template:', error);
    throw new Error('Failed to generate PDF from template');
  }
}
// Export invoice as JSON
export function exportInvoiceAsJSON(invoiceData) {
  try {
    const dataStr = JSON.stringify(invoiceData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoiceData.invoiceNumber}.json`;
    link.click();
    URL.revokeObjectURL(url);
    return { success: true, message: 'JSON exported successfully!' };
  } catch (error) {
    return { success: false, message: 'Failed to export JSON: ' + error.message };
  }
}

// Extract data from PDF (placeholder - will be implemented with actual PDF parsing)
export async function extractFromPDF(file) {
  try {
    // This is a placeholder implementation
    // In a real implementation, you would use pdf-lib or pdfjs-dist to parse the PDF
    // eslint-disable-next-line no-unused-vars
    const arrayBuffer = await file.arrayBuffer();
    
    // For now, we'll simulate extraction with mock data
    // In a real implementation, you would:
    // 1. Parse the PDF using pdfjs-dist
    // 2. Extract text content
    // 3. Use regex or AI to identify invoice fields
    // 4. Return structured data
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock extracted data based on common invoice fields
    const extractedData = {
      invoiceNumber: 'INV-2024-001',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      companyName: 'Your Company Name',
      companyAddress: '123 Business Street, City, State 12345',
      companyPhone: '+1 (555) 123-4567',
      companyMobile: '+1 (555) 765-4321',
      companyEmail: 'info@yourcompany.com',
      billTo: {
        name: 'Client Name',
        address: '456 Client Avenue, City, State 67890',
        phone: '+1 (555) 987-6543',
        email: 'client@email.com'
      },
      items: [
        {
          id: '1',
          descriptionMode: 'simple',
          description: 'Product/Service Description',
          detailTitle: '',
          detailHeader: 'Consist of:-',
          detailItems: '',
          detailNote: '',
          hsnCode: 'HSN123456',
          quantity: 1,
          unit: 'Unit',
          price: 100,
          total: 100
        }
      ],
      subtotal: 100,
      taxRate: 18,
      taxAmount: 18,
      total: 118,
      amountInWords: buildAmountInWords(118, 'INR'),
      currency: 'INR',
      bankDetails: {
        ...DEFAULT_BANK_DETAILS
      },
      notes: 'Thank you for your business!'
    };
    
    return normalizeInvoiceData(extractedData);
  } catch (error) {
    console.error('Error extracting data from PDF:', error);
    return null;
  }
}

// Extract data from any supported file type (PDF, DOC, DOCX)
export async function extractFromFile(file) {
  try {
    // Import document utilities
    const { extractFromDocument, isDocumentFile, isPDFFile } = await import('./documentUtils.js');
    
    if (isPDFFile(file)) {
      return await extractFromPDF(file);
    } else if (isDocumentFile(file)) {
      const extracted = await extractFromDocument(file);
      return extracted ? normalizeInvoiceData(extracted) : null;
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('Error extracting data from file:', error);
    return null;
  }
}

// Auto-align text based on content
export function autoAlignText(text, maxLength = 50) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Format currency
export function formatCurrency(amount, currency = 'INR') {
  const numericAmount = Number(amount) || 0;
  const safeCurrency = (currency || 'INR').toUpperCase();
  const symbols = {
    INR: '₹',
    USD: '$',
    AUD: '$',
    EUR: 'EUR '
  };
  const prefix = symbols[safeCurrency] || `${safeCurrency} `;
  return `${prefix}${numericAmount.toFixed(2)}`;
} 

