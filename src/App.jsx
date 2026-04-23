import { useState } from 'react'
import { FileText, Download, PlusCircle } from 'lucide-react'
import InvoiceEditor from './components/InvoiceEditor'
import DocumentUploader from './components/PDFUploader'
import InvoicePreview from './components/InvoicePreview'
import {
  createDefaultInvoiceData,
  downloadInvoiceAsPDF,
  extractFromFile,
  normalizeInvoiceData
} from './utils/pdfUtils'
import { extractTemplateLayout, generatePDFWithTemplate } from './utils/templateUtils'

function App() {
  const [currentStep, setCurrentStep] = useState('upload')
  const [invoiceData, setInvoiceData] = useState(null)
  const [uploadedTemplate, setUploadedTemplate] = useState(null)
  const [templateLayout, setTemplateLayout] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const getStepNumber = () => {
    if (currentStep === 'edit') return 2
    if (currentStep === 'preview') return 3
    return 1
  }

  const handleCreateFromScratch = () => {
    setInvoiceData(createDefaultInvoiceData())
    setUploadedTemplate(null)
    setTemplateLayout(null)
    setCurrentStep('edit')
  }

  const handleDocumentUpload = async (file) => {
    setIsLoading(true)
    try {
      setUploadedTemplate(file)

      let layout = null
      if (file.type === 'application/pdf') {
        layout = await extractTemplateLayout(file)
        setTemplateLayout(layout)
      } else {
        setTemplateLayout(null)
      }

      const extractedData = await extractFromFile(file)

      if (extractedData) {
        setInvoiceData(normalizeInvoiceData(extractedData))
        setCurrentStep('edit')
      } else {
        alert('Could not extract invoice data from this file. Please try another template.')
      }
    } catch (error) {
      console.error('Error processing document:', error)
      alert('Error processing document. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvoiceUpdate = (updatedData) => {
    setInvoiceData(updatedData)
  }

  const handlePreview = () => {
    setCurrentStep('preview')
  }

  const handleBackToEdit = () => {
    setCurrentStep('edit')
  }

  const handleNewInvoice = () => {
    setInvoiceData(null)
    setUploadedTemplate(null)
    setTemplateLayout(null)
    setCurrentStep('upload')
  }

  const handleDownloadPDF = async () => {
    if (!invoiceData) return

    setIsLoading(true)
    try {
      let result

      if (templateLayout) {
        const doc = await generatePDFWithTemplate(invoiceData, templateLayout)
        const filename = `invoice-${invoiceData.invoiceNumber}-${new Date().toISOString().split('T')[0]}.pdf`
        doc.save(filename)
        result = { success: true, message: 'PDF downloaded successfully.' }
      } else {
        result = await downloadInvoiceAsPDF(invoiceData, uploadedTemplate)
      }

      if (result.success) {
        alert('PDF downloaded successfully.')
      } else {
        alert('Failed to download PDF: ' + result.message)
      }
    } catch (error) {
      alert('Failed to download PDF: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Smart Invoice Generator
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Step {getStepNumber()} of 3
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentStep === 'upload' && (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Choose How You Want To Start
            </h2>
            <p className="text-gray-600 mb-8">
              Start with an automatically generated invoice table, or upload an existing template.
            </p>

            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border-2 border-blue-200 hover:border-blue-500 transition-colors">
                <div className="text-center mb-4">
                  <PlusCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Create New Invoice
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Start from a ready invoice format. Columns and line items are generated automatically.
                  </p>
                </div>

                <div className="space-y-3 text-left">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Pre-built invoice table and totals
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Add company, client, and bank details
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Instant subtotal, tax, and grand total
                  </div>
                </div>

                <button
                  onClick={handleCreateFromScratch}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Start New Invoice
                </button>
              </div>

            </div>
          </div>
        )}

        {currentStep === 'upload-data' && (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Upload Your Invoice Template
            </h2>
            <p className="text-gray-600 mb-8">
              Upload an invoice file and edit extracted data. PDF templates will keep their original layout.
            </p>
            <DocumentUploader
              onUpload={handleDocumentUpload}
              isLoading={isLoading}
            />
            <button
              onClick={() => setCurrentStep('upload')}
              className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        )}

        {currentStep === 'edit' && invoiceData && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Edit Invoice Data
                </h2>
                {templateLayout && (
                  <p className="text-sm text-green-600 mt-1">
                    Template layout will be preserved in the final PDF.
                  </p>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleNewInvoice}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  New Invoice
                </button>
                <button
                  onClick={handlePreview}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Preview PDF
                </button>
              </div>
            </div>

            <InvoiceEditor
              invoiceData={invoiceData}
              onUpdate={handleInvoiceUpdate}
            />
          </div>
        )}

        {currentStep === 'preview' && invoiceData && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Preview & Download
                </h2>
                {templateLayout && (
                  <p className="text-sm text-green-600 mt-1">
                    PDF will be generated with your original template layout.
                  </p>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleBackToEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 flex items-center disabled:opacity-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isLoading ? 'Generating PDF...' : 'Download PDF'}
                </button>
              </div>
            </div>
            <InvoicePreview invoiceData={invoiceData} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
