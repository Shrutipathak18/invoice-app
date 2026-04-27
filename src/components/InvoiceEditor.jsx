import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  createInvoiceItem,
  formatCurrency,
  normalizeInvoiceData
} from '../utils/pdfUtils'
import { downloadInvoiceAsDocx } from '../utils/docxUtils'
const LAST_BILL_TO_KEY = 'invoiceLastBillTo'
const LAST_SHIP_TO_KEY = 'invoiceLastShipTo'

const ADDRESS_PRESETS = {
  photon: {
    name: 'PHOTON INTERNATIONAL PTY LTD (ABN 39 624 325 202)',
    address: 'Level 27, 44 St. Georges Terrace\nPerth, Western Australia 6000',
    phone: '61(08) 9211 6132',
    email: 'Info@photonoffshore.com',
    web: 'photonoffshore.com',
    postcode: '6000'
  }
}

const InvoiceEditor = ({ invoiceData, onUpdate }) => {
  const [data, setData] = useState(() => normalizeInvoiceData(invoiceData))

  useEffect(() => {
    setData(normalizeInvoiceData(invoiceData))
  }, [invoiceData])

  const updateData = (newData) => {
    const normalized = normalizeInvoiceData(newData)
    setData(normalized)
    onUpdate(normalized)
  }

  const handleFieldChange = (field, value) => {
    updateData({ ...data, [field]: value })
  }

  const handleNestedFieldChange = (parent, field, value) => {
    updateData({
      ...data,
      [parent]: {
        ...(data[parent] || {}),
        [field]: value
      }
    })
  }

  const applyAddressPreset = (target, presetKey) => {
    const preset = ADDRESS_PRESETS[presetKey]
    if (!preset) return

    updateData({
      ...data,
      [target]: {
        ...(data[target] || {}),
        ...preset
      }
    })
  }

  const saveAddressToBrowser = (target) => {
    const candidate = data[target] || {}
    const entry = {
      name: candidate.name || '',
      address: candidate.address || '',
      phone: candidate.phone || '',
      email: candidate.email || '',
      web: candidate.web || '',
      postcode: candidate.postcode || '',
      updatedAt: new Date().toISOString()
    }

    const storageKey = target === 'billTo' ? LAST_BILL_TO_KEY : LAST_SHIP_TO_KEY
    try {
      localStorage.setItem(storageKey, JSON.stringify(entry))
    } catch (error) {
      console.error('Could not persist latest address:', error)
    }
  }

  const addAutoRowIfNeeded = (items, editedItemId, field, value) => {
    const autoAddFields = ['description', 'detailTitle', 'detailItems']
    if (!autoAddFields.includes(field)) return items

    const lastItem = items[items.length - 1]
    if (!lastItem || lastItem.id !== editedItemId) return items

    if (String(value).trim().length === 0) return items
    return [...items, createInvoiceItem()]
  }

  const handleItemChange = (itemId, field, value) => {
    const updatedItems = data.items.map((item) =>
      item.id === itemId ? { ...item, [field]: value } : item
    )

    const withAutoRow = addAutoRowIfNeeded(updatedItems, itemId, field, value)
    updateData({ ...data, items: withAutoRow })
  }

  const addItem = () => {
    updateData({
      ...data,
      items: [...data.items, createInvoiceItem()]
    })
  }

  const removeItem = (itemId) => {
    const filtered = data.items.filter((item) => item.id !== itemId)
    updateData({
      ...data,
      items: filtered.length > 0 ? filtered : [createInvoiceItem()]
    })
  }

  const handleTaxRateChange = (value) => {
    updateData({
      ...data,
      taxRate: parseFloat(value) || 0
    })
  }

  const handleLogoUpload = (file) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        localStorage.setItem('defaultInvoiceLogoDataUrl', reader.result)
      } catch (error) {
        console.error('Could not persist default logo:', error)
      }
      handleFieldChange('logoDataUrl', reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleImageUpload = (field, file) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      handleFieldChange(field, reader.result)
    }
    reader.readAsDataURL(file)
  }

  if (!data) return null

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={data.companyName}
              onChange={(e) => handleFieldChange('companyName', e.target.value)}
              className="editable-field w-full"
              placeholder="Your Company Pvt Ltd"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
            <input
              type="text"
              value={data.invoiceNumber}
              onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={data.date}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={data.dueDate}
              onChange={(e) => handleFieldChange('dueDate', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Heading</label>
            <select
              value={data.invoiceHeading}
              onChange={(e) => handleFieldChange('invoiceHeading', e.target.value)}
              className="editable-field w-full"
            >
              <option value="INVOICE UNDER LUT">INVOICE UNDER LUT</option>
              <option value="TAX INVOICE">TAX INVOICE</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={data.currency || 'INR'}
              onChange={(e) => handleFieldChange('currency', e.target.value)}
              className="editable-field w-full"
            >
              <option value="INR">Indian Rupee (INR)</option>
              <option value="AUD">Australian Dollar (AUD)</option>
            </select>
          </div>
          {data.invoiceHeading === 'TAX INVOICE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Type</label>
              <select
                value={data.gstType || 'IGST'}
                onChange={(e) => handleFieldChange('gstType', e.target.value)}
                className="editable-field w-full"
              >
                <option value="IGST">IGST</option>
                <option value="CGST+SGST">CGST + SGST</option>
                <option value="ALL">IGST, CGST, SGST (All)</option>
                <option value="N/A">N/A</option>
                <option value="Advanced Payment">Advanced Payment</option>
              </select>
            </div>
          )}
          <div className="md:col-span-2">
  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Subheading (Optional)</label>
  {data.invoiceHeading === 'INVOICE UNDER LUT' ? (
    <select
      value={data.invoiceSubheading || ''}
      onChange={(e) => handleFieldChange('invoiceSubheading', e.target.value)}
      className="editable-field w-full"
    >
      <option value="">-- Select Subheading --</option>
      <option value="EXPORT OF SERVICES UNDER LUT WITHOUT PAYING TAX">
        EXPORT OF SERVICES UNDER LUT WITHOUT PAYING TAX
      </option>
      <option value="EXPORT OF GOODS UNDER LUT WITHOUT PAYING TAX">
        EXPORT OF GOODS UNDER LUT WITHOUT PAYING TAX
      </option>
    </select>
  ) : (
    <input
      type="text"
      value={data.invoiceSubheading || ''}
      onChange={(e) => handleFieldChange('invoiceSubheading', e.target.value)}
      className="editable-field w-full"
      placeholder="Optional subheading"
    />
  )}
</div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
            <textarea
              value={data.companyAddress}
              onChange={(e) => handleFieldChange('companyAddress', e.target.value)}
              className="editable-field w-full"
              rows="2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={data.companyPhone}
              onChange={(e) => handleFieldChange('companyPhone', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={data.companyEmail}
              onChange={(e) => handleFieldChange('companyEmail', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
            <input
              type="text"
              value={data.companyMobile || ''}
              onChange={(e) => handleFieldChange('companyMobile', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="text"
              value={data.companyWeb || ''}
              onChange={(e) => handleFieldChange('companyWeb', e.target.value)}
              className="editable-field w-full"
              placeholder="www.example.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              className="editable-field w-full"
            />
            {data.logoDataUrl && (
              <img
                src={data.logoDataUrl}
                alt="Company logo preview"
                className="mt-3 h-20 w-auto object-contain border rounded p-2 bg-white"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
            <input
              type="text"
              value={data.cin}
              onChange={(e) => handleFieldChange('cin', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST</label>
            <input
              type="text"
              value={data.gst}
              onChange={(e) => handleFieldChange('gst', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">IEC</label>
            <input
              type="text"
              value={data.iec}
              onChange={(e) => handleFieldChange('iec', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Order No.</label>
            <input
              type="text"
              value={data.buyerOrderNo}
              onChange={(e) => handleFieldChange('buyerOrderNo', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buyer PO Date</label>
            <input
              type="date"
              value={data.buyerPoDate}
              onChange={(e) => handleFieldChange('buyerPoDate', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State Code</label>
            <input
              type="text"
              value={data.stateCode}
              onChange={(e) => handleFieldChange('stateCode', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
            <input
              type="text"
              value={data.paymentTerms}
              onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
              className="editable-field w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill To</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Quick Select Address</label>
          <select
            onChange={(e) => {
              applyAddressPreset('billTo', e.target.value)
              e.target.value = ''
            }}
            className="editable-field w-full"
            defaultValue=""
          >
            <option value="">-- Select Predefined Address --</option>
            <option value="photon">PHOTON INTERNATIONAL PTY LTD (ABN 39 624 325 202)</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
            <input
              type="text"
              value={data.billTo.name}
              onChange={(e) => handleNestedFieldChange('billTo', 'name', e.target.value)}
              onBlur={() => saveAddressToBrowser('billTo')}
              className="editable-field w-full"
              placeholder="Client Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={data.billTo.phone}
              onChange={(e) => handleNestedFieldChange('billTo', 'phone', e.target.value)}
              onBlur={() => saveAddressToBrowser('billTo')}
              className="editable-field w-full"
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={data.billTo.email}
              onChange={(e) => handleNestedFieldChange('billTo', 'email', e.target.value)}
              onBlur={() => saveAddressToBrowser('billTo')}
              className="editable-field w-full"
              placeholder="Email address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
            <input
              type="text"
              value={data.billTo.postcode || ''}
              onChange={(e) => handleNestedFieldChange('billTo', 'postcode', e.target.value)}
              onBlur={() => saveAddressToBrowser('billTo')}
              className="editable-field w-full"
              placeholder="Postal code"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
            <input
              type="text"
              value={data.billTo.web || ''}
              onChange={(e) => handleNestedFieldChange('billTo', 'web', e.target.value)}
              onBlur={() => saveAddressToBrowser('billTo')}
              className="editable-field w-full"
              placeholder="Website URL"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={data.billTo.address}
              onChange={(e) => handleNestedFieldChange('billTo', 'address', e.target.value)}
              onBlur={() => saveAddressToBrowser('billTo')}
              className="editable-field w-full"
              rows="2"
              placeholder="Street address"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ship To</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Quick Select Address</label>
          <select
            onChange={(e) => {
              applyAddressPreset('shipTo', e.target.value)
              e.target.value = ''
            }}
            className="editable-field w-full"
            defaultValue=""
          >
            <option value="">-- Select Predefined Address --</option>
            <option value="photon">PHOTON INTERNATIONAL PTY LTD (ABN 39 624 325 202)</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
            <input
              type="text"
              value={data.shipTo?.name || ''}
              onChange={(e) => handleNestedFieldChange('shipTo', 'name', e.target.value)}
              onBlur={() => saveAddressToBrowser('shipTo')}
              className="editable-field w-full"
              placeholder="Recipient Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={data.shipTo?.phone || ''}
              onChange={(e) => handleNestedFieldChange('shipTo', 'phone', e.target.value)}
              onBlur={() => saveAddressToBrowser('shipTo')}
              className="editable-field w-full"
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={data.shipTo?.email || ''}
              onChange={(e) => handleNestedFieldChange('shipTo', 'email', e.target.value)}
              onBlur={() => saveAddressToBrowser('shipTo')}
              className="editable-field w-full"
              placeholder="Email address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
            <input
              type="text"
              value={data.shipTo?.postcode || ''}
              onChange={(e) => handleNestedFieldChange('shipTo', 'postcode', e.target.value)}
              onBlur={() => saveAddressToBrowser('shipTo')}
              className="editable-field w-full"
              placeholder="Postal code"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
            <input
              type="text"
              value={data.shipTo?.web || ''}
              onChange={(e) => handleNestedFieldChange('shipTo', 'web', e.target.value)}
              onBlur={() => saveAddressToBrowser('shipTo')}
              className="editable-field w-full"
              placeholder="Website URL"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={data.shipTo?.address || ''}
              onChange={(e) => handleNestedFieldChange('shipTo', 'address', e.target.value)}
              onBlur={() => saveAddressToBrowser('shipTo')}
              className="editable-field w-full"
              rows="2"
              placeholder="Street address"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Invoice Items</h3>
            <p className="text-xs text-gray-500 mt-1">
              Rows are generated automatically when you fill the last description field.
            </p>
          </div>
          <button
            onClick={addItem}
            className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="invoice-table">
            <thead>
              <tr>
                <th className="w-12">S.No</th>
                <th>Description</th>
                <th>HSN / SAC</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Amount</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="text-sm text-gray-500 text-center">{index + 1}</td>
                  <td>
                    <div className="space-y-2">
                      <select
                        value={item.descriptionMode || 'simple'}
                        onChange={(e) => handleItemChange(item.id, 'descriptionMode', e.target.value)}
                        className="editable-field w-full text-xs"
                      >
                        <option value="simple">Description Option 1 (Simple)</option>
                        <option value="detailed">Description Option 2 (Structured)</option>
                      </select>
                      {(item.descriptionMode || 'simple') === 'detailed' ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={item.detailTitle || ''}
                            onChange={(e) => handleItemChange(item.id, 'detailTitle', e.target.value)}
                            className="editable-field w-full"
                            placeholder="Title (e.g., Festoon System)"
                          />
                          <input
                            type="text"
                            value={item.detailHeader || 'Consist of:-'}
                            onChange={(e) => handleItemChange(item.id, 'detailHeader', e.target.value)}
                            className="editable-field w-full"
                            placeholder="Header (e.g., Consist of:-)"
                          />
                          <textarea
                            value={item.detailItems || ''}
                            onChange={(e) => handleItemChange(item.id, 'detailItems', e.target.value)}
                            className="editable-field w-full"
                            rows="5"
                            placeholder={'One line per row, example:\nHanger Assy (Model CT40) -40 Nos.\nJoint Clamp Assy (Model CT 40) -20 Nos.'}
                          />
                          <textarea
                            value={item.detailNote || ''}
                            onChange={(e) => handleItemChange(item.id, 'detailNote', e.target.value)}
                            className="editable-field w-full"
                            rows="2"
                            placeholder="Optional note below list (e.g., 50% payment received...)"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          className="editable-field w-full"
                          placeholder="Item description"
                        />
                      )}
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.hsnCode}
                      onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)}
                      className="editable-field w-full"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="editable-field w-full"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.unit || ''}
                      onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                      className="editable-field w-full"
                      placeholder="Optional"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                      className="editable-field w-full"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="calculate-animation text-right font-medium">
                    {formatCurrency(item.total, data.currency)}
                  </td>
                  <td>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-800"
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Extra Description (shows inside item section)</label>
          <textarea
            value={data.additionalDescription || ''}
            onChange={(e) => handleFieldChange('additionalDescription', e.target.value)}
            className="editable-field w-full"
            rows="5"
            placeholder="Example: Note - 50% payment received in advance against Invoice..."
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Totals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(data.subtotal, data.currency)}</span>
            </div>
            {data.invoiceHeading === 'TAX INVOICE' && (
              <>
                {(data.gstType === 'IGST' || !data.gstType) && (
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-gray-600">IGST Rate (%):</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={data.igstRate ?? 0}
                        onChange={(e) => handleFieldChange('igstRate', parseFloat(e.target.value) || 0)}
                        className="editable-field w-20"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      {(data.igstRate ?? 0) === 0 && <span className="text-gray-500 text-sm">N/A</span>}
                    </div>
                  </div>
                )}
                {data.gstType === 'CGST+SGST' && (
                  <>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-gray-600">CGST Rate (%):</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={data.cgstRate ?? 0}
                          onChange={(e) => handleFieldChange('cgstRate', parseFloat(e.target.value) || 0)}
                          className="editable-field w-20"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                        {(data.cgstRate ?? 0) === 0 && <span className="text-gray-500 text-sm">N/A</span>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-gray-600">SGST Rate (%):</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={data.sgstRate ?? 0}
                          onChange={(e) => handleFieldChange('sgstRate', parseFloat(e.target.value) || 0)}
                          className="editable-field w-20"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                        {(data.sgstRate ?? 0) === 0 && <span className="text-gray-500 text-sm">N/A</span>}
                      </div>
                    </div>
                  </>
                )}
                {data.gstType === 'ALL' && (
                  <>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-gray-600">IGST Rate (%):</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={data.igstRate ?? 0}
                          onChange={(e) => handleFieldChange('igstRate', parseFloat(e.target.value) || 0)}
                          className="editable-field w-20"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                        {(data.igstRate ?? 0) === 0 && <span className="text-gray-500 text-sm">N/A</span>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-gray-600">CGST Rate (%):</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={data.cgstRate ?? 0}
                          onChange={(e) => handleFieldChange('cgstRate', parseFloat(e.target.value) || 0)}
                          className="editable-field w-20"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                        {(data.cgstRate ?? 0) === 0 && <span className="text-gray-500 text-sm">N/A</span>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-gray-600">SGST Rate (%):</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={data.sgstRate ?? 0}
                          onChange={(e) => handleFieldChange('sgstRate', parseFloat(e.target.value) || 0)}
                          className="editable-field w-20"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                        {(data.sgstRate ?? 0) === 0 && <span className="text-gray-500 text-sm">N/A</span>}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
            {data.invoiceHeading === 'TAX INVOICE' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax Amount:</span>
                <span className="font-medium">{formatCurrency(data.taxAmount, data.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold total-row p-2 rounded">
              <span>Total:</span>
              <span>{formatCurrency(data.total, data.currency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Advance Payment:</span>
              <input
                type="number"
                value={data.advancePayment ?? 0}
                onChange={(e) => handleFieldChange('advancePayment', parseFloat(e.target.value) || 0)}
                className="editable-field w-32"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex justify-between text-lg font-bold p-2 rounded border border-gray-200">
              <span>Total Balance:</span>
              <span>{formatCurrency(data.totalBalance, data.currency)}</span>
            </div>
            <div className="text-sm text-gray-600">
              <strong>Amount in Words:</strong> {data.amountInWords}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency (ISO Code)</label>
              <input
                type="text"
                value={data.currency}
                onChange={(e) => handleFieldChange('currency', e.target.value.toUpperCase())}
                className="editable-field w-full"
                placeholder="INR, USD, EUR"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={data.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                className="editable-field w-full"
                rows="3"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
            <input
              type="text"
              value={data.bankDetails.accountName || ''}
              onChange={(e) => handleNestedFieldChange('bankDetails', 'accountName', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
            <input
              type="text"
              value={data.bankDetails.bankName}
              onChange={(e) => handleNestedFieldChange('bankDetails', 'bankName', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              value={data.bankDetails.accountNumber}
              onChange={(e) => handleNestedFieldChange('bankDetails', 'accountNumber', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
            <input
              type="text"
              value={data.bankDetails.ifscCode}
              onChange={(e) => handleNestedFieldChange('bankDetails', 'ifscCode', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Swift Code</label>
            <input
              type="text"
              value={data.bankDetails.swiftCode || ''}
              onChange={(e) => handleNestedFieldChange('bankDetails', 'swiftCode', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AD Code</label>
            <input
              type="text"
              value={data.bankDetails.adCode || ''}
              onChange={(e) => handleNestedFieldChange('bankDetails', 'adCode', e.target.value)}
              className="editable-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Authorized Signatory Name</label>
            <input
              type="text"
              value={data.authorizedSignatory}
              onChange={(e) => handleFieldChange('authorizedSignatory', e.target.value)}
              className="editable-field w-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoiceEditor
