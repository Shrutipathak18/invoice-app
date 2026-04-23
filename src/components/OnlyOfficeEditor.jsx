import React, { useEffect, useRef, useState } from 'react'
import { Upload, FileText, Download, Edit3 } from 'lucide-react'

const OnlyOfficeEditor = ({ onFileUpload, onSave }) => {
  const [isEditorLoaded, setIsEditorLoaded] = useState(false)
  const [currentDocument, setCurrentDocument] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)

  // OnlyOffice Document Server URL (will be set when Docker is ready)
  const ONLYOFFICE_SERVER_URL = 'http://localhost:8080'

  useEffect(() => {
    // Load OnlyOffice script when component mounts
    loadOnlyOfficeScript()
  }, [])

  const loadOnlyOfficeScript = () => {
    if (window.DocEditor) {
      setIsEditorLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = `${ONLYOFFICE_SERVER_URL}/web-apps/apps/api/documents/api.js`
    script.onload = () => {
      setIsEditorLoaded(true)
      console.log('OnlyOffice script loaded successfully')
    }
    script.onerror = () => {
      console.error('Failed to load OnlyOffice script')
      alert('OnlyOffice Document Server is not running. Please start the Docker container.')
    }
    document.body.appendChild(script)
  }

  const handleFileUpload = async (file) => {
    if (!file) return

    setIsLoading(true)
    try {
      // For now, we'll simulate file upload
      // In a real implementation, you'd upload to your server
      const fileUrl = await uploadFileToServer(file)
      
      setCurrentDocument({
        file: file,
        url: fileUrl,
        key: generateDocumentKey(),
        title: file.name
      })

      // Initialize the editor
      initializeEditor(fileUrl, file.name)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const uploadFileToServer = async (file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      
      const result = await response.json()
      return result.fileUrl
    } catch (error) {
      console.error('Upload error:', error)
      throw new Error('Failed to upload file to server')
    }
  }

  const generateDocumentKey = () => {
    return Math.random().toString(36).substr(2, 9)
  }

  const initializeEditor = (fileUrl, fileName) => {
    if (!window.DocEditor || !editorRef.current) {
      console.error('OnlyOffice not loaded or editor container not ready')
      return
    }

    try {
      // eslint-disable-next-line no-undef
      new window.DocEditor('onlyoffice-editor', {
        document: {
          fileType: getFileType(fileName),
          key: currentDocument?.key || generateDocumentKey(),
          title: fileName,
          url: fileUrl,
        },
        documentType: 'word',
        editorConfig: {
          mode: 'edit',
          lang: 'en',
          callbackUrl: 'http://localhost:3001/callback', // For save callbacks
          user: {
            id: 'user1',
            name: 'User'
          }
        },
        height: '100%',
        width: '100%',
      })

      console.log('OnlyOffice editor initialized')
    } catch (error) {
      console.error('Error initializing OnlyOffice editor:', error)
      alert('Failed to initialize editor. Please check if OnlyOffice server is running.')
    }
  }

  const getFileType = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase()
    switch (extension) {
      case 'docx':
        return 'docx'
      case 'doc':
        return 'doc'
      case 'pdf':
        return 'pdf'
      default:
        return 'docx'
    }
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full h-full">
      {!currentDocument ? (
        // File Upload Interface
        <div className="max-w-2xl mx-auto p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Upload Document to Edit
            </h2>
            <p className="text-gray-600 mb-8">
              Upload a DOCX, DOC, or PDF file to edit it visually in the browser.
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-500 transition-colors">
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
                    {isLoading ? 'Uploading Document...' : 'Upload Document'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {isLoading 
                      ? 'Processing your document...' 
                      : 'Drag and drop your document here, or click to browse'
                    }
                  </p>
                </div>

                {!isLoading && (
                  <button
                    onClick={openFileDialog}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Choose Document
                  </button>
                )}

                <div className="text-sm text-gray-400">
                  <p>Supported formats: DOCX, DOC, PDF</p>
                  <p>Maximum file size: 50MB</p>
                  {!isEditorLoaded && (
                    <p className="mt-2 text-orange-600">
                      ⚠️ OnlyOffice server is not running. Please start the Docker container.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.doc,.pdf"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      ) : (
        // OnlyOffice Editor
        <div className="w-full h-full">
          <div className="flex justify-between items-center p-4 bg-white border-b">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-medium">{currentDocument.title}</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentDocument(null)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
          
          <div 
            id="onlyoffice-editor" 
            ref={editorRef}
            className="w-full h-full min-h-[600px]"
            style={{ height: 'calc(100vh - 120px)' }}
          />
        </div>
      )}
    </div>
  )
}

export default OnlyOfficeEditor 