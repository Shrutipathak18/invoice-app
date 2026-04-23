import { formatCurrency, normalizeInvoiceData } from '../utils/pdfUtils'
import { downloadInvoiceAsDocx } from '../utils/docxUtils'
// ============================================================================
// SPACING & TYPOGRAPHY CONSTANTS
// ============================================================================
const SPACING = {
  xs: 4,      // 4px
  sm: 8,      // 8px
  md: 12,     // 12px
  lg: 16,     // 16px
  xl: 20,     // 20px
  xxl: 24,    // 24px
  xxxl: 32,   // 32px
}

const TYPOGRAPHY = {
  title: 'text-3xl font-extrabold',           // Company name
  heading: 'text-xl font-bold',               // Invoice heading
  subheading: 'text-sm font-semibold',        // Subheadings
  label: 'text-sm font-semibold',             // Section labels
  body: 'text-sm',                            // Body text
}

const COLORS = {
  primary: 'text-sky-500',
  text: 'text-gray-900',
  muted: 'text-gray-600',
  border: 'border-gray-400',
  light: 'bg-gray-50',
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-IN')
}

const getWebsiteHref = (website = '') => {
  if (!website) return ''
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

const LINK_CLASS_NAME = 'text-blue-600 hover:underline break-all'

const getDetailLines = (value = '') =>
  String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

const normalizeDetailToken = (value = '') =>
  String(value).toLowerCase().replace(/[^a-z0-9]/g, '')

const getSanitizedDetailRows = (header = '', detailItems = '') => {
  const rows = getDetailLines(detailItems)
  if (rows.length === 0) return rows

  const normalizedHeader = normalizeDetailToken(header)
  if (!normalizedHeader) return rows

  if (normalizeDetailToken(rows[0]) === normalizedHeader) {
    return rows.slice(1)
  }

  return rows
}

// ============================================================================
// SUB-COMPONENTS (REUSABLE LAYOUT BLOCKS)
// ============================================================================

const CompanyInfoSection = ({ data }) => (
  <div className="flex-1 min-w-0">
    <h1 className={`${TYPOGRAPHY.title} ${COLORS.primary} tracking-tight mb-2`}>
      {data.companyName || 'Your Company Name'}
    </h1>
    <div className={`${COLORS.muted} space-y-1`}>
      <p className="text-sm whitespace-pre-line leading-relaxed">{data.companyAddress || '-'}</p>
      <p className="text-sm leading-relaxed">Phone: {data.companyPhone || '-'}</p>
      <p className="text-sm leading-relaxed">Mobile: {data.companyMobile || '-'}</p>
      <p className="text-sm leading-relaxed">
        Email:{' '}
        {data.companyEmail ? (
          <a href={`mailto:${data.companyEmail}`} className={LINK_CLASS_NAME}>
            {data.companyEmail}
          </a>
        ) : (
          '-'
        )}
      </p>
      <p className="text-sm leading-relaxed">
        Web:{' '}
        {data.companyWeb ? (
          <a href={getWebsiteHref(data.companyWeb)} target="_blank" rel="noreferrer" className={LINK_CLASS_NAME}>
            {data.companyWeb}
          </a>
        ) : (
          '-'
        )}
      </p>
    </div>
  </div>
)

const LogoAndCinSection = ({ data }) => (
  <div className="flex flex-col items-end gap-3 flex-shrink-0 max-w-[180px]">
    <div className="flex justify-end">
      {data.logoDataUrl ? (
        <img
          src={data.logoDataUrl}
          alt="Company logo"
          className="h-24 max-w-[180px] object-contain"
        />
      ) : (
        <div className="h-24 w-44 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400">
          Logo
        </div>
      )}
    </div>
    <div className={`${COLORS.border} border rounded p-3 text-left text-sm ${COLORS.text} bg-white min-w-[170px]`}>
      <p className="leading-relaxed"><strong>CIN:</strong> {data.cin || '-'}</p>
      <p className="leading-relaxed"><strong>GST:</strong> {data.gst || '-'}</p>
      <p className="leading-relaxed"><strong>IEC:</strong> {data.iec || '-'}</p>
    </div>
  </div>
)

const InvoiceHeadingSection = ({ data }) => (
  <div className="text-center py-2">
    <h2 className={`${TYPOGRAPHY.heading} ${COLORS.primary} tracking-tight`}>
      {data.invoiceHeading || 'INVOICING UNDER LUT'}
    </h2>
    {data.invoiceSubheading && (
      <p className={`${TYPOGRAPHY.subheading} ${COLORS.primary} mt-1`}>
        {data.invoiceSubheading}
      </p>
    )}
  </div>
)

const InvoiceDetailsGrid = ({ data }) => (
  <div className="grid grid-cols-2 gap-4 text-sm">
    <div>
      <label className={`${TYPOGRAPHY.label} ${COLORS.muted} block`}>Invoice No.</label>
      <p className={`${COLORS.text} font-medium`}>{data.invoiceNumber || '-'}</p>
    </div>
    <div>
      <label className={`${TYPOGRAPHY.label} ${COLORS.muted} block`}>Buyer Order No.</label>
      <p className={`${COLORS.text} font-medium`}>{data.buyerOrderNo || '-'}</p>
    </div>
    <div>
      <label className={`${TYPOGRAPHY.label} ${COLORS.muted} block`}>Invoice Date</label>
      <p className={`${COLORS.text} font-medium`}>{formatDate(data.date)}</p>
    </div>
    <div>
      <label className={`${TYPOGRAPHY.label} ${COLORS.muted} block`}>Buyer PO Date</label>
      <p className={`${COLORS.text} font-medium`}>{formatDate(data.buyerPoDate)}</p>
    </div>
    <div>
      <label className={`${TYPOGRAPHY.label} ${COLORS.muted} block`}>State Code</label>
      <p className={`${COLORS.text} font-medium`}>{data.stateCode || '-'}</p>
    </div>
    <div>
      <label className={`${TYPOGRAPHY.label} ${COLORS.muted} block`}>Payment Terms</label>
      <p className={`${COLORS.text} font-medium`}>{data.paymentTerms || '-'}</p>
    </div>
  </div>
)

const PartyBox = ({ title, party }) => (
  <div className={`${COLORS.border} border rounded p-2 min-h-[110px] flex flex-col text-sm`}>
    <h4 className={`${TYPOGRAPHY.label} ${COLORS.text} uppercase tracking-wide mb-2`}>
      {title}
    </h4>
    <div className="space-y-1 flex-1">
      <p className={`font-semibold ${COLORS.text}`}>{party?.name || '-'}</p>
      <p className={`${COLORS.muted} whitespace-pre-line leading-relaxed`}>{party?.address || '-'}</p>
      {party?.postcode && <p className={COLORS.muted}>Postal Code: {party.postcode}</p>}
      {party?.phone && <p className={COLORS.muted}>Phone: {party.phone}</p>}
      {party?.email && (
        <p className={COLORS.muted}>
          Email:{' '}
          <a href={`mailto:${party.email}`} className={LINK_CLASS_NAME}>
            {party.email}
          </a>
        </p>
      )}
      {party?.web && (
        <p className={COLORS.muted}>
          Web:{' '}
          <a href={getWebsiteHref(party.web)} target="_blank" rel="noreferrer" className={LINK_CLASS_NAME}>
            {party.web}
          </a>
        </p>
      )}
    </div>
  </div>
)

const InvoicePreview = ({ invoiceData }) => {
  const data = normalizeInvoiceData(invoiceData)
  const visibleItems = data.items.filter(
    (item) =>
      item.description ||
      item.hsnCode ||
      item.detailTitle ||
      item.detailItems ||
      item.detailNote ||
      Number(item.price) > 0 ||
      Number(item.total) > 0 ||
      Number(item.quantity) > 1
  )
  const isStructuredDescription = visibleItems.some(
    (item) => (item.descriptionMode || 'simple') === 'detailed'
  )
  const showAdvancePaidRow =
    data.invoiceHeading === 'INVOICE UNDER LUT' ||
    (data.invoiceHeading === 'TAX INVOICE' && data.gstType !== 'Advanced Payment')
  const hasAdditionalDescription = String(data.additionalDescription || '').trim().length > 0

  return (
    <div id="invoice-preview" className="bg-white rounded-lg border shadow-sm p-6 space-y-6">
      {/* ===== HEADER SECTION (Company Info + Logo + CIN/GST) ===== */}
      <div className="flex justify-between gap-6 items-start">
        <CompanyInfoSection data={data} />
        <LogoAndCinSection data={data} />
      </div>

      <hr className="border-gray-300" />

      {/* ===== INVOICE HEADING ===== */}
      <InvoiceHeadingSection data={data} />

      {/* ===== INVOICE DETAILS GRID ===== */}
      <InvoiceDetailsGrid data={data} />

      <hr className="border-gray-300" />

      {/* ===== BILL TO & SHIP TO (Equal Height, Aligned) ===== */}
      <div className="grid md:grid-cols-2 gap-6">
        <PartyBox title="Bill To" party={data.billTo} />
        <PartyBox title="Ship To" party={data.shipTo} />
      </div>

      <hr className="border-gray-300" />

      {/* ===== ITEMS TABLE ===== */}

      <div className="overflow-x-auto">
        <table className="invoice-table w-full">
          <colgroup>
            {(isStructuredDescription
              ? ['8%', '48%', '8%', '8%', '8%', '10%', '10%']
              : ['8%', '32%', '14%', '8%', '10%', '14%', '14%']
            ).map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Description</th>
              <th>HSN / SAC</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Rate ({data.currency})</th>
              <th>Amount ({data.currency})</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length > 0 ? (
              <>
                {visibleItems.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td className="align-top">
                      {(item.descriptionMode || 'simple') === 'detailed' ? (
                        <div className="space-y-2">
                          <p className="font-semibold text-center">{item.detailTitle || item.description || '-'}</p>
                          <p className="font-semibold">{item.detailHeader || 'Consist of:-'}</p>
                          <div className="border border-gray-500">
                            {(getSanitizedDetailRows(item.detailHeader || 'Consist of:-', item.detailItems).length > 0
                              ? getSanitizedDetailRows(item.detailHeader || 'Consist of:-', item.detailItems)
                              : ['']).map((line, detailIndex) => (
                              <p
                                key={`${item.id}-detail-${detailIndex}`}
                                className={`text-center px-2 py-1 font-semibold ${detailIndex > 0 ? 'border-t border-gray-500' : ''}`}
                              >
                                {line || '\u00A0'}
                              </p>
                            ))}
                          </div>
                          {item.detailNote && <p className="font-semibold whitespace-pre-line text-xs">{item.detailNote}</p>}
                        </div>
                      ) : (
                        item.description || '-'
                      )}
                    </td>
                    <td>{item.hsnCode || '-'}</td>
                    <td className="invoice-num">{item.quantity}</td>
                    <td className="invoice-num">{item.unit}</td>
                    <td className="font-semibold invoice-num">{formatCurrency(item.price, data.currency)}</td>
                    <td className="font-semibold invoice-num">{formatCurrency(item.total, data.currency)}</td>
                  </tr>
                ))}
                {hasAdditionalDescription && (
                  <tr>
                    <td></td>
                    <td colSpan="6" className="p-0">
                      <div
                        className="min-h-[50px] px-2 py-2"
                        style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 20px, rgba(107,114,128,0.2) 20px, rgba(107,114,128,0.2) 21px)' }}
                      >
                        <p className="text-xs text-gray-700 whitespace-pre-line leading-tight">{data.additionalDescription || ''}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ) : (
              <>
                <tr>
                  <td>1</td>
                  <td>-</td>
                  <td>-</td>
                  <td className="invoice-num">0</td>
                  <td></td>
                  <td className="font-semibold invoice-num">{formatCurrency(0, data.currency)}</td>
                  <td className="font-semibold invoice-num">{formatCurrency(0, data.currency)}</td>
                </tr>
                {hasAdditionalDescription && (
                  <tr>
                    <td></td>
                    <td colSpan="6" className="p-0">
                      <div
                        className="min-h-[50px] px-2 py-2"
                        style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 20px, rgba(107,114,128,0.2) 20px, rgba(107,114,128,0.2) 21px)' }}
                      >
                        <p className="text-xs text-gray-700 whitespace-pre-line leading-tight">{data.additionalDescription || ''}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <hr className="border-gray-300" />

      {/* ===== TOTALS & AMOUNT IN WORDS ===== */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Amount in Words */}
        <div className="flex flex-col justify-center">
          <label className={`${TYPOGRAPHY.label} ${COLORS.muted} block mb-2`}>Amount in Words</label>
          <p className={`${TYPOGRAPHY.body} ${COLORS.text} leading-relaxed`}>{data.amountInWords}</p>
        </div>

        {/* Right: Totals */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className={COLORS.muted}>Sub Total:</span>
            <span className="font-semibold">{formatCurrency(data.subtotal, data.currency)}</span>
          </div>

          {data.invoiceHeading === 'TAX INVOICE' ? (
            <>
              {data.gstType === 'IGST' && (
                <div className="flex justify-between">
                  <span className={COLORS.muted}>IGST ({data.igstRate}%):</span>
                  <span className="font-semibold">
                    {data.igstRate > 0 ? formatCurrency((data.subtotal * data.igstRate) / 100, data.currency) : 'N/A'}
                  </span>
                </div>
              )}
              {data.gstType === 'CGST+SGST' && (
                <>
                  <div className="flex justify-between">
                    <span className={COLORS.muted}>CGST ({data.cgstRate}%):</span>
                    <span className="font-semibold">
                      {data.cgstRate > 0 ? formatCurrency((data.subtotal * data.cgstRate) / 100, data.currency) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={COLORS.muted}>SGST ({data.sgstRate}%):</span>
                    <span className="font-semibold">
                      {data.sgstRate > 0 ? formatCurrency((data.subtotal * data.sgstRate) / 100, data.currency) : 'N/A'}
                    </span>
                  </div>
                </>
              )}
              {data.gstType === 'ALL' && (
                <>
                  <div className="flex justify-between">
                    <span className={COLORS.muted}>IGST ({data.igstRate}%):</span>
                    <span className="font-semibold">
                      {data.igstRate > 0 ? formatCurrency((data.subtotal * data.igstRate) / 100, data.currency) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={COLORS.muted}>CGST ({data.cgstRate}%):</span>
                    <span className="font-semibold">
                      {data.cgstRate > 0 ? formatCurrency((data.subtotal * data.cgstRate) / 100, data.currency) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={COLORS.muted}>SGST ({data.sgstRate}%):</span>
                    <span className="font-semibold">
                      {data.sgstRate > 0 ? formatCurrency((data.subtotal * data.sgstRate) / 100, data.currency) : 'N/A'}
                    </span>
                  </div>
                </>
              )}
              {data.gstType === 'N/A' && (
                <div className="flex justify-between">
                  <span className={COLORS.muted}>Tax:</span>
                  <span className="font-semibold">N/A</span>
                </div>
              )}
              {data.gstType === 'Advanced Payment' && (
                <div className="flex justify-between">
                  <span className={COLORS.muted}>Advanced Payment:</span>
                  <span className="font-semibold">{formatCurrency(data.advancePayment || 0, data.currency)}</span>
                </div>
              )}
            </>
          ) : null}

          <div className="flex justify-between pt-1 border-t border-gray-300">
            <span className="font-semibold">Total:</span>
            <span className="font-bold">{formatCurrency(data.total, data.currency)}</span>
          </div>

          {showAdvancePaidRow && (
            <div className="flex justify-between">
              <span className={COLORS.muted}>Advance Paid:</span>
              <span className="font-semibold">{formatCurrency(data.advancePayment || 0, data.currency)}</span>
            </div>
          )}

          <div className="flex justify-between pt-1 border-t-2 border-gray-400">
            <span className="font-bold">Total Balance:</span>
            <span className="font-bold text-base">{formatCurrency(data.totalBalance || 0, data.currency)}</span>
          </div>
        </div>
      </div>

      <hr className="border-gray-300" />

      {/* ===== BANK DETAILS & SIGNATURE ===== */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bank Details */}
        <div className="space-y-1">
          <h4 className={`${TYPOGRAPHY.label} ${COLORS.text} uppercase mb-3`}>Bank Details</h4>
          <p className={`${TYPOGRAPHY.body} ${COLORS.text} leading-relaxed`}>
            <strong>Account Name:</strong> {data.bankDetails.accountName || '-'}
          </p>
          <p className={`${TYPOGRAPHY.body} ${COLORS.text} leading-relaxed`}>
            <strong>Bank:</strong> {data.bankDetails.bankName || '-'}
          </p>
          <p className={`${TYPOGRAPHY.body} ${COLORS.text} leading-relaxed`}>
            <strong>Account:</strong> {data.bankDetails.accountNumber || '-'}
          </p>
          <p className={`${TYPOGRAPHY.body} ${COLORS.text} leading-relaxed`}>
            <strong>IFSC:</strong> {data.bankDetails.ifscCode || '-'}
          </p>
          <p className={`${TYPOGRAPHY.body} ${COLORS.text} leading-relaxed`}>
            <strong>Swift Code:</strong> {data.bankDetails.swiftCode || '-'}
          </p>
          <p className={`${TYPOGRAPHY.body} ${COLORS.text} leading-relaxed`}>
            <strong>AD Code:</strong> {data.bankDetails.adCode || '-'}
          </p>
          {data.notes && (
            <p className={`${TYPOGRAPHY.body} ${COLORS.muted} leading-relaxed mt-3 whitespace-pre-line`}>
              <strong>Notes:</strong> {data.notes}
            </p>
          )}
        </div>

        {/* Signature Section */}
        <div className="flex flex-col items-center justify-center space-y-6 py-4">
          <p className={`${TYPOGRAPHY.label} ${COLORS.text} font-semibold`}>For {data.companyName || 'Company'}</p>
          <div className="flex-1 flex items-center justify-center w-full">
            {data.signatureDataUrl ? (
              <img
                src={data.signatureDataUrl}
                alt="Signature"
                className="h-16 max-w-[160px] object-contain"
              />
            ) : (
              <div className="h-16 w-40 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400">
                Signature
              </div>
            )}
          </div>
          <p className={`${TYPOGRAPHY.body} ${COLORS.text} text-center`}>
            {data.authorizedSignatory || 'Authorised Signatory'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default InvoicePreview
