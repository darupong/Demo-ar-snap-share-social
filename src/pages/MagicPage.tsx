import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Camera, Info, Download, Share2, X, AlertCircle, Facebook, Loader2 } from 'lucide-react'
import HandFireCanvas, { HandFireCanvasRef } from '@/components/HandFireCanvas'
import MagicInstructions from './MagicPage/components/MagicInstructions'
import { ROUTES, FIRE_PRESETS, MAGIC_SHARE_TEXT } from '@/constants'
import { dataURLtoBlob } from '@/lib/image'

export default function MagicPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<HandFireCanvasRef>(null)

  const [fireColor, setFireColor] = useState(FIRE_PRESETS[0].color)
  const [isLoading, setIsLoading] = useState(true)
  const [handsCount, setHandsCount] = useState(0)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

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
    link.download = `magic-hands-${Date.now()}.png`
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
      const file = new File([blob], 'magic-hands.png', { type: 'image/png' })
      if (canNativeShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Magic Hands #demo', text: MAGIC_SHARE_TEXT, files: [file] })
        return
      }
      if (canNativeShare) {
        await navigator.share({ title: 'Magic Hands #demo', text: MAGIC_SHARE_TEXT, url: window.location.origin })
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
      {/* ── Hand Fire Canvas ── */}
      <HandFireCanvas
        ref={canvasRef}
        fireColor={fireColor}
        onHandsDetected={setHandsCount}
        onReady={() => setIsLoading(false)}
        onError={(msg) => { setIsLoading(false); setErrorMsg(msg) }}
      />

      {/* ── Loading overlay ── */}
      {isLoading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-4"
          style={{ zIndex: 20 }}
        >
          <Loader2 size={40} className="text-orange-400 animate-spin" />
          <p className="text-white font-medium text-lg">กำลังโหลด AI...</p>
          <p className="text-gray-400 text-sm text-center px-8">
            โหลด MediaPipe Hand Tracking model<br />ครั้งแรกอาจใช้เวลา 3-5 วินาที
          </p>
        </div>
      )}

      {/* ── UI overlay ── */}
      <div
        className="absolute inset-0 flex flex-col justify-between pointer-events-none"
        style={{ zIndex: 10 }}
      >
        {/* Top status bar */}
        <div className="flex items-center justify-between px-4 pt-4 pointer-events-none">
          <div className="pointer-events-none">
            {handsCount > 0 ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm border"
                style={{
                  backgroundColor: `${fireColor}22`,
                  borderColor: `${fireColor}66`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: fireColor }}
                />
                <span className="text-sm font-medium" style={{ color: fireColor }}>
                  ☝️ พบนิ้วชี้ {handsCount > 1 ? '2 ข้าง' : ''}
                </span>
              </div>
            ) : isLoading ? null : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                <span className="text-gray-300 text-sm">ชูนิ้วชี้หน้ากล้อง</span>
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

        {/* Middle: hint when no hands */}
        {!isLoading && handsCount === 0 && !errorMsg && (
          <div className="flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full border-2 animate-ping"
                  style={{ borderColor: `${fireColor}66` }}
                />
                <div
                  className="absolute inset-3 rounded-full border"
                  style={{ borderColor: `${fireColor}33` }}
                />
                <span className="text-5xl">☝️</span>
              </div>
              <p className="text-white/70 text-sm backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full">
                ชูนิ้วชี้หน้ากล้องเพื่อเริ่ม
              </p>
            </div>
          </div>
        )}

        {/* Bottom area: color picker + control bar */}
        <div className="pb-safe pb-8 px-6 pointer-events-auto space-y-4">

          {/* ── Color Picker Row ── */}
          <div className="flex items-center justify-center gap-3">
            {FIRE_PRESETS.map(preset => {
              const isSelected = fireColor === preset.color
              return (
                <button
                  key={preset.color}
                  title={preset.label}
                  onClick={() => setFireColor(preset.color)}
                  style={{
                    backgroundColor: preset.color,
                    width: 32,
                    height: 32,
                    boxShadow: isSelected
                      ? `0 0 0 2px #000, 0 0 0 4px ${preset.color}, 0 0 12px ${preset.color}88`
                      : `0 0 0 1px rgba(255,255,255,0.2)`,
                    transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                  className="rounded-full active:scale-90 shrink-0"
                >
                  <span className="sr-only">{preset.label}</span>
                </button>
              )
            })}

            {/* Custom color — rainbow gradient + native color picker */}
            <label
              title="เลือกสีเอง"
              style={{
                width: 32,
                height: 32,
                boxShadow: !FIRE_PRESETS.some(p => p.color === fireColor)
                  ? `0 0 0 2px #000, 0 0 0 4px ${fireColor}, 0 0 12px ${fireColor}88`
                  : `0 0 0 1px rgba(255,255,255,0.2)`,
                transform: !FIRE_PRESETS.some(p => p.color === fireColor) ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.15s ease',
              }}
              className="rounded-full cursor-pointer shrink-0 relative overflow-hidden
                bg-linear-to-br from-red-500 via-green-400 to-blue-500 active:scale-90"
            >
              <input
                type="color"
                value={fireColor}
                onChange={e => setFireColor(e.target.value)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer',
                  border: 'none',
                  padding: 0,
                }}
              />
            </label>
          </div>

          {/* ── Control bar ── */}
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
                boxShadow: isCapturing || isLoading
                  ? undefined
                  : `0 0 24px ${fireColor}55`,
              }}
              className={`w-20 h-20 rounded-full border-4 border-white/60
                flex items-center justify-center
                active:scale-95 transition-all duration-150
                ${isCapturing || isLoading
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

      {/* ── Capture Preview Modal ── */}
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

            <h2 className="text-white font-bold text-xl mb-4">Magic Hands ของคุณ! ✨</h2>

            <div className="rounded-2xl overflow-hidden border border-white/10 mb-5">
              <img src={capturedImage} alt="Magic Hands Snapshot" className="w-full h-auto" />
            </div>

            <div className="flex justify-center mb-4">
              <span
                className="px-3 py-1 rounded-full text-sm font-medium border"
                style={{
                  backgroundColor: `${fireColor}22`,
                  borderColor: `${fireColor}55`,
                  color: fireColor,
                }}
              >
                #demo
              </span>
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
                  active:scale-[0.98] transition-all"
                style={{
                  background: isSharing
                    ? '#4b5563'
                    : `linear-gradient(to right, ${fireColor}, ${fireColor}99)`,
                  cursor: isSharing ? 'not-allowed' : 'pointer',
                  boxShadow: isSharing ? undefined : `0 4px 20px ${fireColor}44`,
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

      {/* ── Instructions Sheet ── */}
      <div style={{ zIndex: 40 }}>
        <MagicInstructions
          open={showInstructions}
          onClose={() => setShowInstructions(false)}
        />
      </div>
    </div>
  )
}
