import { useRef, useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'

const SignatureCanvas = ({ onSave, onClose, initialSignature = null }) => {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [context, setContext] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const ctx = canvas.getContext('2d')
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2
    ctx.strokeStyle = '#000000'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image()
      img.onload = () => {
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }
      img.src = initialSignature
    }

    setContext(ctx)
  }, [initialSignature])

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const clientX = e.clientX || e.touches?.[0]?.clientX
    const clientY = e.clientY || e.touches?.[0]?.clientY

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    setIsDrawing(true)
    const { x, y } = getCanvasCoordinates(e)
    if (context) {
      context.beginPath()
      context.moveTo(x, y)
    }
  }

  const draw = (e) => {
    if (!isDrawing || !context) return

    e.preventDefault()
    const { x, y } = getCanvasCoordinates(e)
    context.lineTo(x, y)
    context.stroke()
  }

  const stopDrawing = (e) => {
    e.preventDefault()
    setIsDrawing(false)
    if (context) {
      context.closePath()
    }
  }

  const clearSignature = () => {
    if (context && canvasRef.current) {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      context.strokeStyle = '#000000'
    }
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    const signatureDataUrl = canvas.toDataURL('image/png')
    onSave(signatureDataUrl)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Draw Your Signature</h2>
        
        <div className="mb-4">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="border-2 border-gray-300 rounded w-full bg-white cursor-crosshair"
            style={{ height: '200px', touchAction: 'none' }}
          />
        </div>

        <p className="text-sm text-gray-500 mb-4">Use your mouse or touch screen to sign</p>

        <div className="flex gap-3">
          <button
            onClick={clearSignature}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={saveSignature}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
          >
            Save Signature
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignatureCanvas
