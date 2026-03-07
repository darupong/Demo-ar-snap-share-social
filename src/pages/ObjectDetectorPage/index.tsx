import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Camera, Info, Download, Share2, X, AlertCircle, Facebook, ScanSearch } from 'lucide-react'
import ObjectDetectorCanvas, { type ObjectDetectorCanvasRef } from '@/components/ObjectDetectorCanvas'
import { ROUTES } from '@/constants'
import { dataURLtoBlob } from '@/lib/image'
import ObjectDetectorInstructions from './components/ObjectDetectorInstructions'

const SHARE_TEXT =
  'สนุกกับ AR Object Detector แบบมีกล่องล้อมวัตถุ — ส่องของรอบตัวแล้วแชร์ให้เพื่อนดู! #demo'

/** Page for bounding-box object detection demo using MediaPipe ObjectDetector */
export default function ObjectDetectorPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<ObjectDetectorCanvasRef>(null)

  const [labels, setLabels] = useState<string[]>([])
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const canNativeShare =
    typeof navigator.share === 'function' && typeof navigator.canShare === 'function'

  useEffect(() => {
    document.body.classList.add('ar-active')
    return () => document.body.classList.remove('ar-active')
  }, [])

  const handleCapture = useCallback(async () => {
    if (!canvasRef.current || isCapturing) return
    setIsCapturing(true)
    try {
      const imageData = await canvasRef.current.captureImage()
      if (imageData) {
        setCapturedImage(imageData)
        setShowPreview(true)
      } else {
        setErrorMsg('ไม่สามารถถ่ายภาพได้ กรุณาลองใหม่')
        setTimeout(() => setErrorMsg(null), 3000)
      }
    } finally {
      setIsCapturing(false)
    }
  }, [isCapturing])

  const handleDownload = useCallback(() => {
    if (!capturedImage) return
    const link = document.createElement('a')
    link.href = capturedImage
    link.download = `objects-detector-${Date.now()}.png`
    link.click()
  }, [capturedImage])

  const handleShare = useCallback(async () => {
    if (!capturedImage || isSharing) return
    const blob = dataURLtoBlob(capturedImage)
    if (!blob) return

    setIsSharing(true)
    try {
      const filesArray = [new File([blob], 'objects-detector.png', { type: 'image/png' })]

      if (canNativeShare && navigator.canShare?.({ files: filesArray })) {
        await navigator.share({
          files: filesArray,
          text: SHARE_TEXT,
        })
      } else {
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          window.location.href,
        )}`
        window.open(shareUrl, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setIsSharing(false)
    }
  }, [capturedImage, isSharing, canNativeShare])

  const handleObjectsDetected = useCallback((detected: string[]) => {
    setLabels(detected)
    if (detected.length > 0) {
      setIsLoading(false)
    }
  }, [])

  const handleReady = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handleError = useCallback((msg: string) => {
    setErrorMsg(msg)
    setIsLoading(false)
  }, [])

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <button
        type="button"
        onClick={() => navigate(ROUTES.HOME)}
        className="fixed top-4 left-4 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs text-gray-200 hover:bg-white/10 transition-colors"
      >
        <Home size={14} />
        <span>กลับหน้าแรก</span>
      </button>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowInstructions(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-cyan-400/60 text-xs text-cyan-100 hover:bg-cyan-500/10 transition-colors"
        >
          <Info size={14} />
          <span>วิธีเล่น</span>
        </button>
      </div>

      <div className="absolute top-16 inset-x-0 z-10 flex flex-col items-center px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-cyan-500/40 backdrop-blur">
          <ScanSearch size={14} className="text-cyan-300" />
          <span className="text-xs text-gray-100">
            โหมด Object Detector (มีกล่องล้อมวัตถุ)
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-200 text-center max-w-md">
          ส่องกล้องไปที่สิ่งของบนโต๊ะ เช่น แก้วน้ำ ขวดน้ำ หนังสือ กล่อง หรือคีย์บอร์ด
          จะเห็นกรอบและชื่อวัตถุขึ้นรอบของที่ตรวจเจอ
        </p>
      </div>

      <ObjectDetectorCanvas
        ref={canvasRef}
        onObjectsDetected={handleObjectsDetected}
        onReady={handleReady}
        onError={handleError}
      />

      <div className="fixed inset-x-0 bottom-0 pb-8 pt-4 px-6 z-20 pointer-events-none">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2 pointer-events-auto">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/70 border border-white/10">
              <Camera size={14} className="text-cyan-300" />
              <span className="text-[11px] text-gray-200">Object Detector</span>
            </div>
            <div className="min-h-[32px]">
              {errorMsg ? (
                <div className="flex items-center gap-2 text-xs text-red-300 bg-red-900/40 border border-red-500/40 rounded-lg px-2 py-1">
                  <AlertCircle size={13} />
                  <span>{errorMsg}</span>
                </div>
              ) : isLoading ? (
                <p className="text-xs text-gray-300 flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  กำลังโหลดโมเดล Object Detector...
                </p>
              ) : labels.length > 0 ? (
                <p className="text-xs text-gray-200">
                  ตรวจจับได้:{' '}
                  <span className="text-cyan-300">
                    {labels
                      .slice(0, 3)
                      .map((l) => l.toLowerCase())
                      .join(', ')}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-gray-300">
                  ลองขยับกล้องไปหาสิ่งของชัด ๆ เช่น แก้วน้ำ หนังสือ หรือกล่อง
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!capturedImage}
              className="w-10 h-10 rounded-full border border-white/30 bg-black/60 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-black/60 transition-colors"
            >
              <Download size={18} />
            </button>
            <button
              type="button"
              onClick={handleCapture}
              disabled={isCapturing}
              className="relative w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_0_0_3px_rgba(15,23,42,0.9)] disabled:opacity-60 transition-transform active:scale-95"
            >
              <div className="w-12 h-12 rounded-full border-4 border-slate-900 bg-slate-900/80" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={!capturedImage || isSharing}
              className="w-10 h-10 rounded-full border border-cyan-400/60 bg-black/60 flex items-center justify-center text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40 disabled:hover:bg-black/60 transition-colors"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {showPreview && capturedImage && (
        <div className="fixed inset-0 bg-black/80 z-30 flex flex-col items-center justify-center px-4">
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-white/10 bg-black/80">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-white/10"
            >
              <X size={16} />
            </button>
            <div className="bg-black">
              <img src={capturedImage} alt="Object detection preview" className="w-full h-auto" />
            </div>
            <div className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-200">
                <Facebook size={14} className="text-sky-400" />
                <span>แชร์ไปยังโซเชียลหรือบันทึกรูปเก็บไว้ได้เลย</span>
              </div>
              <button
                type="button"
                onClick={handleShare}
                disabled={isSharing}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500 text-white text-xs hover:bg-sky-400 disabled:opacity-60"
              >
                <Share2 size={14} />
                <span>แชร์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showInstructions && (
        <ObjectDetectorInstructions open={showInstructions} onClose={() => setShowInstructions(false)} />
      )}
    </div>
  )
}

