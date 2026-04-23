import { useState, useRef } from 'react'
import { Upload, AlertCircle } from 'lucide-react'

const DocumentUploader = ({ onUpload, isLoading }) => {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file) => {
    setError('')
    
    // Validate file type - support PDF, DOC, and DOCX
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, or DOCX file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    onUpload(file)
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className={`upload-area ${dragActive ? 'dragover' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            {isLoading ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            ) : (
              <Upload className="h-12 w-12 text-gray-400" />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isLoading ? 'Processing Template...' : 'Upload Document Template'}
            </h3>
            <p className="text-gray-500 mb-4">
              {isLoading 
                ? 'Extracting data from your document template...' 
                : 'Drag and drop your invoice template here, or click to browse'
              }
            </p>
          </div>

          {!isLoading && (
            <button
              onClick={openFileDialog}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Choose Template
            </button>
          )}

          {error && (
            <div className="flex items-center justify-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          <div className="text-sm text-gray-400">
            <p>Supported formats: PDF, DOC, DOCX</p>
            <p>Maximum file size: 10MB</p>
            <p className="mt-2 text-blue-600">
              💡 Tip: Upload an existing invoice to use as a template
            </p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  )
}

export default DocumentUploader 