import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Camera, Info, Download, Share2, X, AlertCircle, Facebook, Sparkles } from 'lucide-react'
import SplashCanvas, { type SplashCanvasRef, type SplashMode } from '@/components/SplashCanvas'
import { ROUTES } from '@/constants'
import { dataURLtoBlob } from '@/lib/image'
import SplashInstructions from './components/SplashInstructions'

const SHARE_TEXT = 'Color Splash effect สุดเท่ — ฉันมีสี background ขาวดำ! #siampiwat_demo'

const MODES: { value: SplashMode; label: string; desc: string }[] = [
  { value: 'splash', label: '🎨 Color Splash', desc: 'พื้นหลัง grayscale คนมีสี' },
  { value: 'silhouette', label: '🌑 Silhouette', desc: 'พื้นหลังดำสนิท คนมีสี' },
]

export default function SplashPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<SplashCanvasRef>(null)

  const [mode, setMode] = useState<SplashMode>('splash')
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
    link.download = `color-splash-${Date.now()}.png`
    link.click()
  }, [capturedImage])

  const handleShare = useCallback(async () => {
    if (!capturedImage || isSharing) return
    const blob = dataURLtoBlob(capturedImage)
    if (!blob) return
    setIsSharing(true)
    try {
      const file = new File([blob], 'color-splash.png', { type: 'image/png' })
      if (canNativeShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Color Splash #siampiwat_demo', text: SHARE_TEXT, files: [file] })
        return
      }
      if (canNativeShare) {
        await navigator.share({ title: 'Color Splash #siampiwat_demo', text: SHARE_TEXT, url: window.location.origin })
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

  return (
    <div
      className="relative overflow-hidden bg-black"
      style={{ width: '100vw', height: '100vh' }}
    >
      <SplashCanvas
        ref={canvasRef}
        mode={mode}
        onReady={() => setIsLoading(false)}
        onError={(msg) => { setIsLoading(false); setErrorMsg(msg) }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-4" style={{ zIndex: 20 }}>
          <Sparkles size={40} className="text-pink-400 animate-pulse" />
          <p className="text-white font-medium text-lg">กำลังโหลด Color Splash...</p>
          <p className="text-gray-400 text-sm text-center px-8">
            โหลด MediaPipe Selfie Segmenter<br />ครั้งแรกอาจใช้เวลา 3–5 วินาที
          </p>
        </div>
      )}

      <div
        className="absolute inset-0 flex flex-col justify-between pointer-events-none"
        style={{ zIndex: 10 }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            {errorMsg ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/50 backdrop-blur-sm">
                <AlertCircle size={14} className="text-red-400" />
                <span className="text-red-300 text-sm">{errorMsg}</span>
              </div>
            ) : !isLoading ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/20 border border-pink-500/50 backdrop-blur-sm">
                <Sparkles size={14} className="text-pink-300" />
                <span className="text-pink-200 text-sm font-medium">
                  {MODES.find(m => m.value === mode)?.label}
                </span>
              </div>
            ) : null}
          </div>

          <button
            onClick={() => setShowInstructions(true)}
            className="w-10 h-10 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 active:scale-95 transition-all pointer-events-auto"
          >
            <Info size={18} />
          </button>
        </div>

        {/* Mode toggle */}
        {!isLoading && (
          <div className="flex justify-center pointer-events-auto">
            <div className="flex gap-2 bg-black/60 border border-white/10 rounded-2xl p-1.5 backdrop-blur-sm">
              {MODES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    mode === value
                      ? 'bg-pink-500/80 text-white shadow-lg shadow-pink-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="pb-10 px-8 pointer-events-auto">
          <div className="flex items-center justify-between max-w-xs mx-auto">
            <button
              onClick={() => navigate(ROUTES.HOME)}
              className="w-12 h-12 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 active:scale-95 transition-all"
            >
              <Home size={20} />
            </button>

            <button
              onClick={handleCapture}
              disabled={isCapturing || isLoading}
              style={{ boxShadow: isCapturing || isLoading ? undefined : '0 0 24px rgba(236,72,153,0.5)' }}
              className={`w-20 h-20 rounded-full border-4 border-white/60 flex items-center justify-center active:scale-95 transition-all duration-150 ${
                isCapturing || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-100'
              }`}
            >
              <Camera size={28} className="text-black" />
            </button>

            <button
              onClick={() => setShowInstructions(true)}
              className="w-12 h-12 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 active:scale-95 transition-all"
            >
              <Info size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {showPreview && capturedImage && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 50 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative bg-gray-950 rounded-3xl border border-pink-500/30 p-5 w-full max-w-sm shadow-2xl shadow-pink-500/20">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <h2 className="text-white font-bold text-xl mb-4">Color Splash Snap!</h2>
            <div className="rounded-2xl overflow-hidden border border-pink-500/20 mb-5">
              <img src={capturedImage} alt="Color Splash" className="w-full h-auto" />
            </div>
            <div className="flex gap-3 mb-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-3 rounded-xl border border-gray-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                <Download size={16} />
                บันทึก
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className={`flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                  isSharing
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-linear-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 shadow-lg shadow-pink-500/30'
                }`}
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
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ zIndex: 40 }}>
        <SplashInstructions open={showInstructions} onClose={() => setShowInstructions(false)} />
      </div>
    </div>
  )
}
