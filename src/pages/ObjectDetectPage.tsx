import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Camera, Info, Download, Share2, X, AlertCircle, Facebook, ScanSearch } from 'lucide-react'
import ObjectDetectCanvas, { type ObjectDetectCanvasRef } from '@/components/ObjectDetectCanvas'
import { ROUTES } from '@/constants'
import { dataURLtoBlob } from '@/lib/image'
import ObjectDetectInstructions from './ObjectDetectPage/components/ObjectDetectInstructions'

const SHARE_TEXT = 'สนุกกับ AR Object Detector — ส่องของรอบตัวแล้วแชร์ให้เพื่อนดู! #demo'

export default function ObjectDetectPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<ObjectDetectCanvasRef>(null)

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
    link.download = `objects-${Date.now()}.png`
    link.click()
  }, [capturedImage])

  const handleShare = useCallback(async () => {
    if (!capturedImage || isSharing) return
    const blob = dataURLtoBlob(capturedImage)
    if (!blob) {
      setErrorMsg('ไม่สามารถเตรียมรูปสำหรับแชร์ได้')
      setTimeout(() => setErrorMsg(null), 3000)
      return
    }
    setIsSharing(true)
    try {
      const file = new File([blob], 'objects.png', { type: 'image/png' })
      if (canNativeShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Object Detector #demo', text: SHARE_TEXT, files: [file] })
        return
      }
      if (canNativeShare) {
        await navigator.share({ title: 'Object Detector #demo', text: SHARE_TEXT, url: window.location.origin })
        return
      }
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`
      window.open(fbUrl, 'fb-share-dialog', 'width=626,height=436,scrollbars=yes')
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setErrorMsg('แชร์ไม่สำเร็จ กรุณาลองใหม่')
        setTimeout(() => setErrorMsg(null), 3000)
      }
    } finally {
      setIsSharing(false)
    }
  }, [capturedImage, isSharing, canNativeShare])

  const topLabel = labels[0]

  return (
    <div
      className="relative overflow-hidden bg-black"
      style={{ width: '100vw', height: '100vh' }}
    >
      <ObjectDetectCanvas
        ref={canvasRef}
        onObjectsDetected={(ls) => {
          setLabels(ls)
          if (isLoading && ls.length > 0) setIsLoading(false)
        }}
        onReady={() => setIsLoading(false)}
        onError={(msg) => {
          setIsLoading(false)
          setErrorMsg(msg)
        }}
      />

      {isLoading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-4"
          style={{ zIndex: 20 }}
        >
          <ScanSearch size={40} className="text-cyan-400 animate-pulse" />
          <p className="text-white font-medium text-lg">กำลังโหลด Object Detector...</p>
          <p className="text-gray-400 text-sm text-center px-8">
            โหลด MediaPipe Object Detector model<br />ครั้งแรกอาจใช้เวลา 3–5 วินาที
          </p>
        </div>
      )}

      <div
        className="absolute inset-0 flex flex-col justify-between pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pointer-events-none">
          <div className="pointer-events-none">
            {topLabel ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/50 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-300 text-sm font-medium truncate max-w-[220px]">
                  พบวัตถุ: {topLabel}
                </span>
              </div>
            ) : isLoading ? null : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                <span className="text-gray-300 text-sm">ส่องกล้องไปที่สิ่งของบนโต๊ะ เช่น แก้วน้ำ ขวดน้ำ หนังสือ กล่อง หรือคีย์บอร์ด</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/50 backdrop-blur-sm pointer-events-none">
              <AlertCircle size={14} className="text-red-400" />
              <span className="text-red-300 text-sm">{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="pb-safe pb-8 px-6 pointer-events-auto space-y-4">
          {/* Detected labels list */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {labels.slice(0, 4).map((label) => (
                <span
                  key={label}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 border border-cyan-500/40 text-cyan-200"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between max-w-xs mx-auto">
            <button
              onClick={() => navigate(ROUTES.HOME)}
              className="w-12 h-12 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm
                flex items-center justify-center text-white
                hover:bg-black/70 active:scale-95 transition-all"
            >
              <Home size={20} />
            </button>
            <button
              onClick={handleCapture}
              disabled={isCapturing || isLoading}
              style={{
                boxShadow:
                  isCapturing || isLoading ? undefined : '0 0 24px rgba(34, 211, 238, 0.45)',
              }}
              className={`w-20 h-20 rounded-full border-4 border-white/60
                flex items-center justify-center
                active:scale-95 transition-all duration-150
                ${
                  isCapturing || isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-white hover:bg-gray-100'
                }`}
            >
              <Camera size={28} className="text-black" />
            </button>
            <button
              onClick={() => setShowInstructions(true)}
              className="w-12 h-12 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm
                flex items-center justify-center text-white
                hover:bg-black/70 active:scale-95 transition-all"
            >
              <Info size={20} />
            </button>
          </div>
        </div>
      </div>

      {showPreview && capturedImage && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 50 }}
        >
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          />
          <div className="relative bg-gray-950 rounded-3xl border border-white/10 p-5 w-full max-w-sm shadow-2xl">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <h2 className="text-white font-bold text-xl mb-4">Object Detector Snapshot ✨</h2>
            <div className="rounded-2xl overflow-hidden border border-white/10 mb-5">
              <img src={capturedImage} alt="Object Detector Snapshot" className="w-full h-auto" />
            </div>
            <div className="flex gap-3 mb-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-3 rounded-xl border border-gray-600 text-white text-sm font-medium
                  flex items-center justify-center gap-2
                  hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                <Download size={16} />
                บันทึก
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold
                  flex items-center justify-center gap-2
                  active:scale-[0.98] transition-all bg-linear-to-r from-cyan-500 to-emerald-500
                  hover:from-cyan-400 hover:to-emerald-400
                  disabled:bg-gray-600 disabled:cursor-not-allowed"
                style={{
                  boxShadow: isSharing ? undefined : '0 4px 20px rgba(45, 212, 191, 0.4)',
                }}
              >
                <Share2 size={16} />
                {isSharing ? 'กำลังแชร์...' : canNativeShare ? 'แชร์ + รูป' : 'แชร์'}
              </button>
            </div>
            {!canNativeShare && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Facebook size={14} className="text-blue-400 mt-0.5 shrink-0" />
                <p className="text-blue-300 text-xs leading-relaxed">
                  บน desktop กด <strong>"บันทึก"</strong> แล้วแนบรูปเองใน Facebook post
                  หรือเปิดบนมือถือเพื่อแชร์รูปได้เลย
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ zIndex: 40 }}>
        <ObjectDetectInstructions open={showInstructions} onClose={() => setShowInstructions(false)} />
      </div>
    </div>
  )
}

