import { PDFDocument } from 'pdf-lib'

const RUPEE_SYMBOL = '\u20B9'
const TABLE_HEADERS = ['S.No', 'Description', 'HSN Code', 'Qty', 'Unit', 'Price', 'Total']
const DEFAULT_TABLE_COLUMN_WIDTHS = [14, 44, 28, 12, 14, 31, 32]
const STRUCTURED_TABLE_COLUMN_RATIOS = [0.05, 0.48, 0.08, 0.08, 0.08, 0.11, 0.10]

function getWebsiteHref(website = '') {
  if (!website) return ''
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

function getMailtoHref(email = '') {
  return email ? `mailto:${email}` : ''
}

function drawLinkText(doc, text, x, y, url) {
  if (!url) {
    doc.text(text, x, y)
    return
  }

  doc.setTextColor(0, 0, 255)
  doc.textWithLink(text, x, y, { url })
  doc.setTextColor(0, 0, 0)
}

function fitTextToCell(doc, value, maxWidth) {
  const text = value === null || value === undefined ? '' : String(value)
  if (!text) return ''
  if (doc.getTextWidth(text) <= maxWidth) return text

  let trimmed = text
  while (trimmed.length > 0 && doc.getTextWidth(`${trimmed}...`) > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }

  return trimmed ? `${trimmed}...` : ''
}

function getDetailLines(value = '') {
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function normalizeDetailToken(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function getSanitizedDetailRows(header = '', detailItems = '') {
  const rows = getDetailLines(detailItems)
  if (rows.length === 0) return rows

  const normalizedHeader = normalizeDetailToken(header)
  if (!normalizedHeader) return rows

  if (normalizeDetailToken(rows[0]) === normalizedHeader) {
    return rows.slice(1)
  }

  return rows
}

function resolveTableColumnWidths(baseColumnWidths = DEFAULT_TABLE_COLUMN_WIDTHS, rows = []) {
  const safeBase = Array.isArray(baseColumnWidths) && baseColumnWidths.length === 7
    ? baseColumnWidths.map((width) => Number(width) || 0)
    : [...DEFAULT_TABLE_COLUMN_WIDTHS]

  const totalWidth = safeBase.reduce((sum, width) => sum + width, 0)
  if (totalWidth <= 0) return [...DEFAULT_TABLE_COLUMN_WIDTHS]

  const hasStructuredRows = rows.some((item) => (item?.descriptionMode || 'simple') === 'detailed')
  if (!hasStructuredRows) {
    return safeBase
  }

  const rebalanced = STRUCTURED_TABLE_COLUMN_RATIOS.map((ratio) => Number((ratio * totalWidth).toFixed(2)))
  const widthDiff = Number((totalWidth - rebalanced.reduce((sum, width) => sum + width, 0)).toFixed(2))
  rebalanced[1] = Number((rebalanced[1] + widthDiff).toFixed(2))

  return rebalanced
}

function drawItemsTableWithGrid(doc, items = [], options = {}) {
  const startX = options.startX ?? 20
  const startY = options.startY ?? 160
  const minRowHeight = options.rowHeight ?? 8
  const headerHeight = options.headerHeight ?? 8
  const baseColumnWidths = Array.isArray(options.columnWidths) && options.columnWidths.length === 7
    ? options.columnWidths
    : DEFAULT_TABLE_COLUMN_WIDTHS
  const rows = Array.isArray(items) && items.length > 0
    ? items
    : [{ description: '', hsnCode: '', quantity: '', unit: '', price: '', total: '' }]
  const columnWidths = resolveTableColumnWidths(baseColumnWidths, rows)
  const hasStructuredRows = rows.some((item) => (item?.descriptionMode || 'simple') === 'detailed')

  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0)
  const descriptionColWidth = columnWidths[1]
  const descriptionTextWidth = descriptionColWidth - 4
  const detailLineHeight = hasStructuredRows ? 3.6 : 4
  const detailItemRowMinHeight = hasStructuredRows ? 4.2 : 4.5
  const headerFontSize = hasStructuredRows ? 9.2 : 10
  const bodyFontSize = hasStructuredRows ? 9 : 9.5
  const rowRenderMeta = rows.map((item) => {
    const isDetailed = (item?.descriptionMode || 'simple') === 'detailed'
    if (!isDetailed) {
      const simpleLines = doc.splitTextToSize(item?.description || '', descriptionTextWidth)
      const rowHeight = Math.max(minRowHeight, Math.max(1, simpleLines.length) * detailLineHeight + 3)
      return {
        isDetailed: false,
        simpleLines,
        rowHeight
      }
    }

    const titleLines = doc.splitTextToSize(item?.detailTitle || item?.description || '-', descriptionTextWidth)
    const detailHeader = String(item?.detailHeader || 'Consist of:-').trim() || 'Consist of:-'
    const detailItems = getSanitizedDetailRows(detailHeader, item?.detailItems)
    const noteLines = doc.splitTextToSize(item?.detailNote || '', descriptionTextWidth)
    const detailRows = (detailItems.length > 0 ? detailItems : ['']).map((line) => {
      const wrappedLines = doc.splitTextToSize(line, descriptionTextWidth - 2)
      const lines = wrappedLines.length > 0 ? wrappedLines : ['']
      const rowHeight = Math.max(detailItemRowMinHeight, lines.length * detailLineHeight + 1.2)
      return { lines, rowHeight }
    })
    const tableBlockHeight = detailRows.reduce((sum, row) => sum + row.rowHeight, 0)
    const rowHeight = Math.max(
      minRowHeight,
      4 +
        Math.max(1, titleLines.length) * detailLineHeight +
        1.5 +
        detailLineHeight +
        1.5 +
        tableBlockHeight +
        (noteLines.length > 0 ? 2 + noteLines.length * detailLineHeight : 0) +
        2
    )

    return {
      isDetailed: true,
      titleLines,
      detailHeader,
      detailRows,
      noteLines,
      rowHeight
    }
  })

  const rowsHeight = rowRenderMeta.reduce((sum, meta) => sum + meta.rowHeight, 0)
  const additionalDescription = String(options.additionalDescription || '').trim()
  const descriptionLineHeight = 4
  const hasAdditionalDescription = additionalDescription.length > 0
  const descriptionLines = hasAdditionalDescription ? doc.splitTextToSize(additionalDescription, tableWidth - 4) : []
  const descriptionAreaHeight = hasAdditionalDescription ? Math.max(8, (descriptionLines.length * descriptionLineHeight) + 4) : 0
  const tableHeight = headerHeight + rowsHeight + descriptionAreaHeight
  const descriptionStartY = startY + headerHeight + rowsHeight
  const tableBottomY = startY + tableHeight

  doc.setDrawColor(80)
  doc.setLineWidth(0.25)
  doc.rect(startX, startY, tableWidth, tableHeight)

  doc.line(startX, startY + headerHeight, startX + tableWidth, startY + headerHeight)
  let runningRowY = startY + headerHeight
  rowRenderMeta.forEach((meta) => {
    runningRowY += meta.rowHeight
    const lineY = runningRowY
    doc.line(startX, lineY, startX + tableWidth, lineY)
  })

  let separatorX = startX
  columnWidths.slice(0, -1).forEach((width) => {
    separatorX += width
    doc.line(separatorX, startY, separatorX, descriptionStartY)
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(headerFontSize)
  let headerX = startX
  TABLE_HEADERS.forEach((header, columnIndex) => {
    const width = columnWidths[columnIndex]
    const isNumericColumn = [0, 3, 5, 6].includes(columnIndex)
    const textX = isNumericColumn ? headerX + width - 2 : headerX + 2
    doc.text(header, textX, startY + 5.5, { align: isNumericColumn ? 'right' : 'left' })
    headerX += width
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(bodyFontSize)

  let rowTopY = startY + headerHeight
  rows.forEach((item, rowIndex) => {
    const rowMeta = rowRenderMeta[rowIndex]
    const rowHeight = rowMeta.rowHeight
    const quantityText = item?.quantity === '' || item?.quantity === null || item?.quantity === undefined
      ? ''
      : String(Number(item.quantity) || 0)
    const priceText = item?.price === '' || item?.price === null || item?.price === undefined
      ? ''
      : `${RUPEE_SYMBOL}${(Number(item.price) || 0).toFixed(2)}`
    const totalText = item?.total === '' || item?.total === null || item?.total === undefined
      ? ''
      : `${RUPEE_SYMBOL}${(Number(item.total) || 0).toFixed(2)}`

    const values = [
      String(rowIndex + 1),
      '',
      item?.hsnCode || '',
      quantityText,
      item?.unit || '',
      priceText,
      totalText
    ]

    let cellX = startX
    values.forEach((value, columnIndex) => {
      const width = columnWidths[columnIndex]
      const isNumericColumn = [0, 3, 5, 6].includes(columnIndex)
      if (columnIndex === 1) {
        cellX += width
        return
      }
      const paddedText = fitTextToCell(doc, value, width - 4)
      const textX = isNumericColumn ? cellX + width - 2 : cellX + 2
      const rowY = rowTopY + 5.5
      doc.text(paddedText, textX, rowY, { align: isNumericColumn ? 'right' : 'left' })
      cellX += width
    })

    const descCellX = startX + columnWidths[0]
    const descTextX = descCellX + 2
    if (rowMeta.isDetailed) {
      let detailY = rowTopY + 5.5
      doc.setFont('helvetica', 'bold')
      doc.text(rowMeta.titleLines, descCellX + (descriptionColWidth / 2), detailY, { align: 'center' })
      detailY += Math.max(1, rowMeta.titleLines.length) * detailLineHeight + 1.5
      doc.text(rowMeta.detailHeader, descTextX, detailY)
      detailY += detailLineHeight + 1

      const detailBoxX = descTextX
      const detailBoxY = detailY
      const detailBoxWidth = descriptionColWidth - 4
      const detailBoxHeight = rowMeta.detailRows.reduce((sum, row) => sum + row.rowHeight, 0)
      doc.rect(detailBoxX, detailBoxY, detailBoxWidth, detailBoxHeight)

      let detailRowCursorY = detailBoxY
      rowMeta.detailRows.forEach((row, detailIndex) => {
        if (detailIndex > 0) {
          const separatorY = detailRowCursorY
          doc.line(detailBoxX, separatorY, detailBoxX + detailBoxWidth, separatorY)
        }
        doc.text(row.lines, detailBoxX + (detailBoxWidth / 2), detailRowCursorY + 2.8, { align: 'center' })
        detailRowCursorY += row.rowHeight
      })

      detailY = detailBoxY + detailBoxHeight + 5
      if (rowMeta.noteLines.length > 0) {
        doc.text(rowMeta.noteLines, descTextX, detailY)
      }
      doc.setFont('helvetica', 'normal')
    } else {
      const simpleLines = rowMeta.simpleLines.length > 0 ? rowMeta.simpleLines : ['-']
      doc.text(simpleLines, descTextX, rowTopY + 5.5)
    }

    rowTopY += rowHeight
  })

  if (hasAdditionalDescription) {
    doc.setDrawColor(220)
    for (let lineY = descriptionStartY + 5; lineY < tableBottomY - 1; lineY += 5) {
      doc.line(startX + 2, lineY, startX + tableWidth - 2, lineY)
    }
    doc.setDrawColor(80)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(descriptionLines, startX + 2, descriptionStartY + 4)
  }

  return tableBottomY
}

// Extract template layout information from PDF
export async function extractTemplateLayout(pdfFile) {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const pages = pdfDoc.getPages()
    
    if (pages.length === 0) {
      throw new Error('No pages found in PDF')
    }
    
    const firstPage = pages[0]
    const { width, height } = firstPage.getSize()
    
    // Extract text content and positions
    const textContent = await extractTextWithPositions(pdfFile)
    
    // Analyze layout structure
    const layout = analyzeLayout(textContent, width, height)
    
    return {
      pageSize: { width, height },
      layout,
      textContent,
      originalPdf: pdfFile
    }
  } catch (error) {
    console.error('Error extracting template layout:', error)
    return null
  }
}

// Extract text content with positions from PDF
async function extractTextWithPositions(pdfFile) {
  try {
    // This is a simplified version - in a real implementation, you would use pdfjs-dist
    // to extract text with precise positioning information
    // eslint-disable-next-line no-unused-vars
    const arrayBuffer = await pdfFile.arrayBuffer()
    
    // For now, we'll return a basic structure
    // In a real implementation, you would parse the PDF and extract:
    // - Text content
    // - Font information
    // - Position coordinates
    // - Color information
    // - Layout structure
    
    return {
      header: {
        text: 'INVOICE',
        x: 105,
        y: 20,
        fontSize: 20,
        fontFamily: 'helvetica',
        alignment: 'center'
      },
      companyInfo: {
        x: 20,
        y: 40,
        fontSize: 12,
        fontFamily: 'helvetica'
      },
      invoiceDetails: {
        x: 120,
        y: 40,
        fontSize: 10,
        fontFamily: 'helvetica'
      },
      billTo: {
        x: 20,
        y: 90,
        fontSize: 12,
        fontFamily: 'helvetica'
      },
      itemsTable: {
        x: 20,
        y: 160,
        fontSize: 12,
        fontFamily: 'helvetica',
        columnWidths: [14, 44, 28, 12, 14, 31, 32] // S.No, Description, HSN, Qty, Unit, Price, Total
      },
      totals: {
        x: 140,
        y: 160,
        fontSize: 12,
        fontFamily: 'helvetica'
      },
      footer: {
        x: 20,
        y: 250,
        fontSize: 10,
        fontFamily: 'helvetica'
      }
    }
  } catch (error) {
    console.error('Error extracting text with positions:', error)
    return null
  }
}

// Analyze layout structure from text content
function analyzeLayout(textContent, pageWidth, pageHeight) {
  if (!textContent) {
    return getDefaultLayout(pageWidth, pageHeight)
  }
  
  // Analyze the extracted text content to determine layout
  // This would include:
  // - Header positioning and styling
  // - Company information layout
  // - Invoice details positioning
  // - Items table structure
  // - Footer layout
  
  return {
    header: textContent.header || getDefaultLayout(pageWidth, pageHeight).header,
    companyInfo: textContent.companyInfo || getDefaultLayout(pageWidth, pageHeight).companyInfo,
    invoiceDetails: textContent.invoiceDetails || getDefaultLayout(pageWidth, pageHeight).invoiceDetails,
    billTo: textContent.billTo || getDefaultLayout(pageWidth, pageHeight).billTo,
    itemsTable: textContent.itemsTable || getDefaultLayout(pageWidth, pageHeight).itemsTable,
    totals: textContent.totals || getDefaultLayout(pageWidth, pageHeight).totals,
    footer: textContent.footer || getDefaultLayout(pageWidth, pageHeight).footer
  }
}

// Get default layout structure
function getDefaultLayout(pageWidth, pageHeight) {
  return {
    header: {
      x: pageWidth / 2,
      y: 20,
      fontSize: 20,
      fontFamily: 'helvetica',
      alignment: 'center'
    },
    companyInfo: {
      x: 20,
      y: 40,
      fontSize: 12,
      fontFamily: 'helvetica'
    },
    invoiceDetails: {
      x: pageWidth - 80,
      y: 40,
      fontSize: 10,
      fontFamily: 'helvetica'
    },
    billTo: {
      x: 20,
      y: 90,
      fontSize: 12,
      fontFamily: 'helvetica'
    },
    itemsTable: {
      x: 20,
      y: 160,
      fontSize: 12,
      fontFamily: 'helvetica',
      columnWidths: [14, 44, 28, 12, 14, 31, 32]
    },
    totals: {
      x: pageWidth - 80,
      y: 160,
      fontSize: 12,
      fontFamily: 'helvetica'
    },
    footer: {
      x: 20,
      y: pageHeight - 50,
      fontSize: 10,
      fontFamily: 'helvetica'
    }
  }
}

// Generate PDF using template layout
export async function generatePDFWithTemplate(invoiceData, templateLayout) {
  try {
    const { jsPDF } = await import('jspdf')
    
    // Create PDF with template page size
    const pageSize = templateLayout.pageSize || { width: 210, height: 297 } // A4 default
    const doc = new jsPDF({
      unit: 'mm',
      format: [pageSize.width, pageSize.height]
    })
    
    const layout = templateLayout.layout
    
    // Apply template styling and positioning
    doc.setFont(layout.header.fontFamily || 'helvetica')
    doc.setFontSize(layout.header.fontSize || 20)
    doc.text('INVOICE', layout.header.x, layout.header.y, { 
      align: layout.header.alignment || 'center' 
    })
    
    // Company information
    doc.setFontSize(layout.companyInfo.fontSize || 12)
    doc.text(invoiceData.companyName, layout.companyInfo.x, layout.companyInfo.y)
    doc.setFontSize(10)
    doc.text(invoiceData.companyAddress, layout.companyInfo.x, layout.companyInfo.y + 10)
    doc.text(`Phone: ${invoiceData.companyPhone}`, layout.companyInfo.x, layout.companyInfo.y + 20)
    drawLinkText(
      doc,
      `Email: ${invoiceData.companyEmail || '-'}`,
      layout.companyInfo.x,
      layout.companyInfo.y + 30,
      getMailtoHref(invoiceData.companyEmail)
    )
    if (invoiceData.companyWeb) {
      drawLinkText(
        doc,
        `Web: ${invoiceData.companyWeb}`,
        layout.companyInfo.x,
        layout.companyInfo.y + 40,
        getWebsiteHref(invoiceData.companyWeb)
      )
    }
    
    // Invoice details
    doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, layout.invoiceDetails.x, layout.invoiceDetails.y)
    doc.text(`Date: ${new Date(invoiceData.date).toLocaleDateString()}`, layout.invoiceDetails.x, layout.invoiceDetails.y + 10)
    doc.text(`Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, layout.invoiceDetails.x, layout.invoiceDetails.y + 20)
    
    // Bill to section
    doc.setFontSize(layout.billTo.fontSize || 12)
    doc.text('Bill To:', layout.billTo.x, layout.billTo.y)
    doc.setFontSize(10)
    doc.text(invoiceData.billTo.name, layout.billTo.x, layout.billTo.y + 10)
    doc.text(invoiceData.billTo.address, layout.billTo.x, layout.billTo.y + 20)
    doc.text(`Phone: ${invoiceData.billTo.phone}`, layout.billTo.x, layout.billTo.y + 30)
    drawLinkText(
      doc,
      `Email: ${invoiceData.billTo.email || '-'}`,
      layout.billTo.x,
      layout.billTo.y + 40,
      getMailtoHref(invoiceData.billTo.email)
    )
    
    // Items table with visible rows and columns
    const tableBottomY = drawItemsTableWithGrid(doc, invoiceData.items, {
      startX: layout.itemsTable.x,
      startY: layout.itemsTable.y,
      columnWidths: layout.itemsTable.columnWidths,
      additionalDescription: invoiceData.additionalDescription
    })

    // Totals
    let yPos = tableBottomY + 10
    doc.setFontSize(layout.totals.fontSize || 12)
    doc.text('Subtotal:', layout.totals.x, yPos)
    doc.text(`${RUPEE_SYMBOL}${invoiceData.subtotal.toFixed(2)}`, layout.totals.x + 30, yPos)

    if (invoiceData.invoiceHeading === 'TAX INVOICE') {
      yPos += 8
      doc.text(`Tax (${invoiceData.taxRate}%):`, layout.totals.x, yPos)
      doc.text(`${RUPEE_SYMBOL}${invoiceData.taxAmount.toFixed(2)}`, layout.totals.x + 30, yPos)
    } else if (invoiceData.invoiceHeading !== 'INVOICE UNDER LUT') {
      yPos += 8
      doc.text(`Tax (${invoiceData.taxRate}%):`, layout.totals.x, yPos)
      doc.text(`${RUPEE_SYMBOL}${invoiceData.taxAmount.toFixed(2)}`, layout.totals.x + 30, yPos)
    }
    
    yPos += 8
    doc.setFontSize(14)
    doc.text('Total:', layout.totals.x, yPos)
    doc.text(`${RUPEE_SYMBOL}${invoiceData.total.toFixed(2)}`, layout.totals.x + 30, yPos)

    yPos += 8
    doc.setFontSize(layout.totals.fontSize || 12)
    doc.text('Advance Paid:', layout.totals.x, yPos)
    doc.text(`${RUPEE_SYMBOL}${(Number(invoiceData.advancePayment) || 0).toFixed(2)}`, layout.totals.x + 30, yPos)

    yPos += 8
    doc.setFontSize(14)
    doc.text('Total Balance:', layout.totals.x, yPos)
    doc.text(`${RUPEE_SYMBOL}${(Number(invoiceData.totalBalance) || 0).toFixed(2)}`, layout.totals.x + 30, yPos)
    
    // Amount in words
    yPos += 15
    doc.setFontSize(10)
    doc.text(`Amount in Words: ${invoiceData.amountInWords}`, layout.companyInfo.x, yPos)
    
    // Bank details
    yPos += 20
    doc.setFontSize(12)
    doc.text('Bank Details:', layout.companyInfo.x, yPos)
    doc.setFontSize(10)
    yPos += 8
    doc.text(`Bank: ${invoiceData.bankDetails.bankName}`, layout.companyInfo.x, yPos)
    yPos += 6
    doc.text(`Account: ${invoiceData.bankDetails.accountNumber}`, layout.companyInfo.x, yPos)
    yPos += 6
    doc.text(`IFSC: ${invoiceData.bankDetails.ifscCode}`, layout.companyInfo.x, yPos)
    
    // Optional note text (without heading)
    if (invoiceData.notes) {
      yPos += 12
      doc.setFontSize(10)
      const noteLines = doc.splitTextToSize(invoiceData.notes, 90)
      doc.text(noteLines, layout.companyInfo.x, yPos)
    }

    return doc
  } catch (error) {
    console.error('Error generating PDF with template:', error)
    throw new Error('Failed to generate PDF with template')
  }
}
// Store template layout in localStorage
export function saveTemplateLayout(templateId, layout) {
  try {
    const savedTemplates = getSavedTemplateLayouts()
    savedTemplates[templateId] = {
      ...layout,
      savedAt: new Date().toISOString()
    }
    localStorage.setItem('savedTemplateLayouts', JSON.stringify(savedTemplates))
    return { success: true, message: 'Template layout saved successfully!' }
  } catch (error) {
    return { success: false, message: 'Failed to save template layout: ' + error.message }
  }
}

// Get saved template layouts
export function getSavedTemplateLayouts() {
  try {
    const saved = localStorage.getItem('savedTemplateLayouts')
    return saved ? JSON.parse(saved) : {}
  } catch (error) {
    console.error('Error loading saved template layouts:', error)
    return {}
  }
}

// Load template layout by ID
export function loadTemplateLayout(templateId) {
  const savedTemplates = getSavedTemplateLayouts()
  return savedTemplates[templateId]
} 

