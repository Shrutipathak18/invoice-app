import mammoth from 'mammoth'

// Extract data from document files (DOC, DOCX)
export async function extractFromDocument(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    
    // Use mammoth to extract text from DOC/DOCX
    const result = await mammoth.extractRawText({ arrayBuffer })
    const text = result.value
    
    // Parse the extracted text to identify invoice fields
    const extractedData = parseInvoiceText(text)
    
    return extractedData
  } catch (error) {
    console.error('Error extracting data from document:', error)
    return null
  }
}

// Parse invoice text to extract structured data
function parseInvoiceText(text) {
  // This is a basic parser - in a real implementation, you might use AI or more sophisticated parsing
  // const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // Initialize default data structure
  const extractedData = {
    invoiceNumber: 'INV-2024-001',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    companyName: 'Your Company Name',
    companyAddress: '123 Business Street, City, State 12345',
    companyPhone: '+1 (555) 123-4567',
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
        description: 'Product/Service Description',
        hsnCode: 'HSN123456',
        quantity: 1,
        price: 100,
        total: 100
      }
    ],
    subtotal: 100,
    taxRate: 18,
    taxAmount: 18,
    total: 118,
    amountInWords: 'One Hundred Eighteen Indian Rupee',
    currency: 'INR',
    bankDetails: {
      bankName: 'Bank Name',
      accountNumber: '1234567890',
      ifscCode: 'ABCD0001234'
    },
    notes: 'Thank you for your business!'
  }
  
  // Try to extract invoice number
  const invoiceNumberMatch = text.match(/invoice\s*#?\s*:?\s*([A-Z0-9-]+)/i)
  if (invoiceNumberMatch) {
    extractedData.invoiceNumber = invoiceNumberMatch[1]
  }
  
  // Try to extract company name
  const companyNameMatch = text.match(/company\s*:?\s*([^\n]+)/i)
  if (companyNameMatch) {
    extractedData.companyName = companyNameMatch[1].trim()
  }
  
  // Try to extract client name
  const clientNameMatch = text.match(/bill\s+to\s*:?\s*([^\n]+)/i) || 
                         text.match(/client\s*:?\s*([^\n]+)/i)
  if (clientNameMatch) {
    extractedData.billTo.name = clientNameMatch[1].trim()
  }
  
  // Try to extract total amount
  const totalMatch = text.match(/total\s*:?\s*[₹$]?([0-9,]+\.?[0-9]*)/i)
  if (totalMatch) {
    const total = parseFloat(totalMatch[1].replace(/,/g, ''))
    extractedData.total = total
    extractedData.subtotal = total * 0.85 // Estimate subtotal
    extractedData.taxAmount = total * 0.15 // Estimate tax
  }
  
  // Try to extract tax rate
  const taxRateMatch = text.match(/tax\s*\(?([0-9]+)%?\)?\s*:?\s*[₹$]?([0-9,]+\.?[0-9]*)/i)
  if (taxRateMatch) {
    extractedData.taxRate = parseFloat(taxRateMatch[1])
  }
  
  return extractedData
}

// Convert document to PDF format for template preservation
export async function convertDocumentToPDF(file) {
  try {
    // For now, we'll return the file as-is since we're focusing on data extraction
    // In a real implementation, you might use a library like docx-pdf or similar
    return file
  } catch (error) {
    console.error('Error converting document to PDF:', error)
    return null
  }
}

// Check if file is a document (DOC, DOCX)
export function isDocumentFile(file) {
  const documentTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  return documentTypes.includes(file.type)
}

// Check if file is a PDF
export function isPDFFile(file) {
  return file.type === 'application/pdf'
} 
