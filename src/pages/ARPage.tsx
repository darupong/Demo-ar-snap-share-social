import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Camera, Info, Download, Share2, X, AlertCircle, Facebook } from 'lucide-react'
import ARScene, { ARSceneRef } from '@/components/ARScene'
import InstructionsSheet from './ARPage/components/InstructionsSheet'
import { ROUTES, HIRO_MARKER_URL, AR_SHARE_TEXT } from '@/constants'
import { dataURLtoBlob } from '@/lib/image'

export default function ARPage() {
  const navigate = useNavigate()
  const arSceneRef = useRef<ARSceneRef>(null)

  const [markerFound, setMarkerFound] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  // Check Web Share API with file support (mobile Chrome/Safari)
  const canNativeShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function'

  // Prevent page scroll on AR page
  useEffect(() => {
    document.body.classList.add('ar-active')
    return () => document.body.classList.remove('ar-active')
  }, [])

  const handleCapture = useCallback(async () => {
    if (!arSceneRef.current || isCapturing) return
    setIsCapturing(true)

    try {
      const imageData = await arSceneRef.current.captureImage()
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
    link.download = `ar-snap-demo-${Date.now()}.png`
    link.click()
  }, [capturedImage])

  /**
   * Web Share API (mobile): ส่ง image file + text ไปยัง app ที่รองรับ (Facebook, Line, IG, ฯลฯ)
   * Fallback (desktop): เปิด Facebook sharer URL (ส่ง URL + ข้อความ แต่ไม่มีรูป)
   */
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
      const file = new File([blob], 'ar-snap-demo.png', { type: 'image/png' })
      if (canNativeShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'AR Snap #demo',
          text: AR_SHARE_TEXT,
          files: [file],
        })
        return
      }
      if (canNativeShare) {
        await navigator.share({
          title: 'AR Snap #demo',
          text: AR_SHARE_TEXT,
          url: window.location.origin,
        })
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
      {/* ── AR Scene (video + Three.js canvas) ── */}
      <ARScene
        ref={arSceneRef}
        onMarkerFound={() => setMarkerFound(true)}
        onMarkerLost={() => setMarkerFound(false)}
        onError={(msg) => setErrorMsg(msg)}
      />

      {/* ── UI overlay layer (above AR canvas) ── */}
      <div
        className="absolute inset-0 flex flex-col justify-between pointer-events-none"
        style={{ zIndex: 10 }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-safe pt-4 pointer-events-none">
          {/* Status indicator */}
          <div className="pointer-events-none">
            {markerFound ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/50 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-300 text-sm font-medium">พบ Marker</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                <span className="text-gray-300 text-sm">กำลังค้นหา marker...</span>
              </div>
            )}
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/50 backdrop-blur-sm pointer-events-none">
              <AlertCircle size={14} className="text-red-400" />
              <span className="text-red-300 text-sm">{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Middle: scan hint when no marker */}
        {!markerFound && (
          <div className="flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              {/* Scan frame corners */}
              <div className="relative w-48 h-48">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-violet-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-violet-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-violet-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-violet-400 rounded-br-lg" />

                {/* Mini marker inside frame */}
                <div className="absolute inset-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <img
                    src={HIRO_MARKER_URL}
                    alt="target"
                    className="w-20 h-20 object-contain opacity-50"
                  />
                </div>
              </div>
              <p className="text-white/70 text-sm backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full">
                ส่องกล้องไปที่ Hiro marker
              </p>
            </div>
          </div>
        )}

        {/* Bottom control bar */}
        <div className="pb-safe pb-10 px-8 pointer-events-auto">
          <div className="flex items-center justify-between max-w-xs mx-auto">

            {/* Home */}
            <button
              onClick={() => navigate(ROUTES.HOME)}
              className="w-12 h-12 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm
                flex items-center justify-center text-white
                hover:bg-black/70 active:scale-95 transition-all"
            >
              <Home size={20} />
            </button>

            {/* Capture — center, large */}
            <button
              onClick={handleCapture}
              disabled={isCapturing}
              className={`w-20 h-20 rounded-full
                border-4 border-white/60
                flex items-center justify-center
                shadow-2xl shadow-white/20
                active:scale-95 transition-all duration-150
                ${isCapturing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-100'
                }`}
            >
              <Camera size={28} className="text-black" />
            </button>

            {/* Instructions */}
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
          <div className="relative bg-gray-950 rounded-3xl border border-violet-500/30 p-5 w-full max-w-sm shadow-2xl shadow-violet-500/20">

            {/* Close */}
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            <h2 className="text-white font-bold text-xl mb-4">AR Snap ของคุณ!</h2>

            {/* Preview image */}
            <div className="rounded-2xl overflow-hidden border border-violet-500/20 mb-5">
              <img
                src={capturedImage}
                alt="AR Snapshot"
                className="w-full h-auto"
              />
            </div>

            {/* Hashtag badge */}
            <div className="flex justify-center mb-4">
              <span className="px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium">
                #demo
              </span>
            </div>

            {/* Action buttons */}
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

              {/* Web Share API — ส่งรูปจริงพร้อม text ไปยัง app ที่เลือก */}
              <button
                onClick={handleShare}
                disabled={isSharing}
                className={`flex-1 py-3 rounded-xl text-white text-sm font-bold
                  flex items-center justify-center gap-2
                  active:scale-[0.98] transition-all shadow-lg
                  ${isSharing
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-linear-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-violet-500/30'
                  }`}
              >
                <Share2 size={16} />
                {isSharing ? 'กำลังแชร์...' : canNativeShare ? 'แชร์ + รูป' : 'แชร์'}
              </button>
            </div>

            {/* Desktop fallback note — แสดงเมื่อไม่มี Web Share API */}
            {!canNativeShare && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Facebook size={14} className="text-blue-400 mt-0.5 shrink-0" />
                <p className="text-blue-300 text-xs leading-relaxed">
                  บน desktop รูปจะไม่ติดไปกับ post โดยอัตโนมัติ — กด <strong>"บันทึก"</strong> แล้ว
                  แนบรูปเองใน Facebook post หรือเปิดบนมือถือเพื่อแชร์รูปได้เลย
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Instructions Sheet ── */}
      <div style={{ zIndex: 40 }}>
        <InstructionsSheet
          open={showInstructions}
          onClose={() => setShowInstructions(false)}
        />
      </div>
    </div>
  )
}
