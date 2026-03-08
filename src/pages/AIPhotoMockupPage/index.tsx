import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home,
  Camera,
  Info,
  Download,
  Share2,
  X,
  AlertCircle,
  Sparkles,
  Loader2,
  Gift,
} from 'lucide-react'
import AIPhotoCanvas, { type AIPhotoCanvasRef } from '@/components/AIPhotoCanvas'
import SpinWheelCoupon from '@/components/SpinWheelCoupon'
import { ROUTES } from '@/constants'
import AIPhotoInstructions from '@/pages/AIPhotoPage/components/AIPhotoInstructions'

const MOCK_GEN_DELAY_MS = 5000
/** Mock result image (put mock1.jpg in public/mockup/) */
const MOCK_RESULT_IMAGE = '/mockup/mock1.jpg'
/** Sample video for mock result (public sample URL) */
const MOCK_RESULT_VIDEO = '/mockup/mockvdo.mp4'

/** Mockup page: clone of AIPhotoPage with no API; fake gen 5s then show image + video result */
export default function AIPhotoMockupPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<AIPhotoCanvasRef>(null)

  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showResult, setShowResult] = useState(false)
  const [showSpinWheel, setShowSpinWheel] = useState(false)
  const [hasSpun, setHasSpun] = useState(false)

  const canNativeShare =
    typeof navigator.share === 'function' && typeof navigator.canShare === 'function'

  useEffect(() => {
    document.body.classList.add('ar-active')
    return () => document.body.classList.remove('ar-active')
  }, [])

  /** When fake gen starts, wait 5s then show result */
  useEffect(() => {
    if (!capturedImage || !isGenerating) return
    const t = setTimeout(() => {
      setIsGenerating(false)
      setShowResult(true)
    }, MOCK_GEN_DELAY_MS)
    return () => clearTimeout(t)
  }, [capturedImage, isGenerating])

  /** Capture photo then start fake "generating" for 5 seconds */
  const handleCapture = useCallback(async () => {
    if (!canvasRef.current || isCapturing) return

    setIsCapturing(true)
    try {
      const imageData = await canvasRef.current.captureImage()
      if (imageData) {
        setCapturedImage(imageData)
        setShowResult(false)
        setIsGenerating(true)
      } else {
        setErrorMsg('ไม่สามารถถ่ายภาพได้ กรุณาลองใหม่')
        setTimeout(() => setErrorMsg(null), 3000)
      }
    } finally {
      setIsCapturing(false)
    }
  }, [isCapturing])

  /** Clear result and return to camera */
  const handleReset = useCallback(() => {
    setCapturedImage(null)
    setShowResult(false)
    setHasSpun(false)
  }, [])

  const handleDownload = useCallback(() => {
    const link = document.createElement('a')
    link.href = MOCK_RESULT_IMAGE
    link.download = `ai-mockup-${Date.now()}.jpg`
    link.target = '_blank'
    link.click()
  }, [])

  const handleShare = useCallback(async () => {
    if (isSharing) return
    setIsSharing(true)
    try {
      if (canNativeShare) {
        await navigator.share({
          text: 'AI Photo Mockup #siampiwat_demo',
          url: window.location.origin + MOCK_RESULT_IMAGE,
        })
      } else {
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          window.location.origin + MOCK_RESULT_IMAGE,
        )}`
        window.open(shareUrl, '_blank', 'noopener,noreferrer')
      }
    } catch {
      // User cancelled or error
    } finally {
      setIsSharing(false)
    }
  }, [isSharing, canNativeShare])

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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-amber-400/60 text-xs text-amber-100 hover:bg-amber-500/10 transition-colors"
        >
          <Info size={14} />
          <span>วิธีเล่น</span>
        </button>
      </div>

      <div className="absolute top-16 inset-x-0 z-10 flex flex-col items-center px-4 gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-amber-500/40 backdrop-blur">
          <Sparkles size={14} className="text-amber-300" />
          <span className="text-xs text-gray-100">AI Photo Mockup</span>
        </div>
      </div>

      {!capturedImage && <AIPhotoCanvas ref={canvasRef} onReady={handleReady} onError={handleError} />}

      {capturedImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-5">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-4 px-4">
              <Loader2 size={48} className="text-amber-400 animate-spin" />
              <p className="text-white text-base font-medium">กำลังสร้างภาพ AI...</p>
              <p className="text-gray-400 text-sm text-center max-w-md">
                แบบ Mockup: รอสักครู่ (~5 วินาที)
              </p>
              <div className="flex gap-1 mt-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          ) : showResult ? (
            <div className="relative w-full max-w-2xl px-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl bg-black/50">
                  <p className="text-amber-300 text-xs font-medium px-2 py-1 text-center border-b border-amber-500/20">ภาพ</p>
                  <img
                    src={MOCK_RESULT_IMAGE}
                    alt="Mock result"
                    className="w-full h-auto aspect-9/16 object-cover"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl bg-black/50">
                  <p className="text-amber-300 text-xs font-medium px-2 py-1 text-center border-b border-amber-500/20">วิดีโอ</p>
                  <video
                    src={MOCK_RESULT_VIDEO}
                    className="w-full aspect-9/16 object-cover"
                    controls
                    loop
                    muted
                    playsInline
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="absolute top-3 right-7 w-10 h-10 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-3 left-7 right-7 bg-black/70 backdrop-blur rounded-lg px-3 py-2 border border-amber-500/30">
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 pb-8 pt-4 px-6 z-20 pointer-events-none">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2 pointer-events-auto">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/70 border border-white/10">
              <Camera size={14} className="text-amber-300" />
              <span className="text-[11px] text-gray-200">AI Photo Mockup</span>
            </div>
            <div className="min-h-[32px]">
              {errorMsg ? (
                <div className="flex items-start gap-2 text-xs text-red-300 bg-red-900/40 border border-red-500/40 rounded-lg px-2 py-1.5 max-w-xs">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              ) : isLoading ? (
                <p className="text-xs text-gray-300 flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  กำลังเปิดกล้อง...
                </p>
              ) : isGenerating ? (
                <p className="text-xs text-amber-300 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  กำลังสร้างภาพ (Mock 5 วินาที)...
                </p>
              ) : showResult ? (
                <p className="text-xs text-green-300 font-medium">✓ แสดงผลภาพ + วิดีโอ</p>
              ) : (
                <p className="text-xs text-gray-300">พร้อมถ่ายภาพ</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!showResult}
              className="w-10 h-10 rounded-full border border-white/30 bg-black/60 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-black/60 transition-colors"
            >
              <Download size={18} />
            </button>
            {showResult ? (
              <button
                type="button"
                onClick={() => setShowSpinWheel(true)}
                disabled={hasSpun}
                className="relative w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                style={{
                  background: hasSpun
                    ? '#4b5563'
                    : 'linear-gradient(135deg, #f59e0b, #f97316)',
                  boxShadow: hasSpun ? undefined : '0 0 20px rgba(245,158,11,0.5)',
                }}
                title={hasSpun ? 'ใช้คูปองแล้ว' : 'สุ่มคูปอง'}
              >
                <Gift size={22} className="text-white" />
                <span className="text-white font-bold leading-none mt-0.5" style={{ fontSize: 8 }}>
                  {hasSpun ? 'used' : 'SPIN'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCapture}
                disabled={isCapturing || isGenerating}
                className="relative w-16 h-16 rounded-full bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/50 disabled:opacity-60 transition-transform active:scale-95"
              >
                {isCapturing || isGenerating ? (
                  <Loader2 size={24} className="text-white animate-spin" />
                ) : (
                  <div className="w-12 h-12 rounded-full border-4 border-white/80 bg-white/20" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              disabled={!showResult || isSharing}
              className="w-10 h-10 rounded-full border border-amber-400/60 bg-black/60 flex items-center justify-center text-amber-300 hover:bg-amber-500/10 disabled:opacity-40 disabled:hover:bg-black/60 transition-colors"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {showInstructions && (
        <AIPhotoInstructions open={showInstructions} onClose={() => setShowInstructions(false)} />
      )}

      <SpinWheelCoupon
        open={showSpinWheel}
        onClose={() => setShowSpinWheel(false)}
        onSpun={() => setHasSpun(true)}
      />
    </div>
  )
}
