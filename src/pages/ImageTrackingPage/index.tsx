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
  Facebook,
  Target,
  Play,
  ScanLine,
  Film,
} from 'lucide-react'
import MindARVideoScene, { type MindARVideoSceneRef } from '@/components/MindARVideoScene'
import { ROUTES } from '@/constants'
import { dataURLtoBlob } from '@/lib/image'
import ImageTrackingInstructions from './components/ImageTrackingInstructions'

const SHARE_TEXT = 'ส่อง target image แล้วเห็นวิดีโอลอยขึ้นมาแบบ AR! #demo'

// Load MindAR + A-Frame CDN scripts sequentially (once, cached globally)
const MINDAR_SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js',
  'https://aframe.io/releases/1.4.2/aframe.min.js',
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js',
]

let mindarScriptsPromise: Promise<void> | null = null

function loadMindarScripts(): Promise<void> {
  if (mindarScriptsPromise) return mindarScriptsPromise
  mindarScriptsPromise = MINDAR_SCRIPTS.reduce(
    (chain, src) =>
      chain.then(
        () =>
          new Promise<void>((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
            const s = document.createElement('script')
            s.src = src
            s.onload = () => resolve()
            s.onerror = () => reject(new Error(`Failed to load: ${src}`))
            document.head.appendChild(s)
          }),
      ),
    Promise.resolve(),
  )
  return mindarScriptsPromise
}

type ARState = 'idle' | 'starting' | 'started'

export default function ImageTrackingPage() {
  const navigate = useNavigate()
  const sceneRef = useRef<MindARVideoSceneRef>(null)

  const [scriptsReady, setScriptsReady] = useState(false)
  const [arState, setArState] = useState<ARState>('idle')
  const [isARReady, setIsARReady] = useState(false)
  const [targetFound, setTargetFound] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const canNativeShare =
    typeof navigator.share === 'function' && typeof navigator.canShare === 'function'

  const showError = (msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 5000)
  }

  // Load MindAR scripts on mount
  useEffect(() => {
    document.body.classList.add('ar-active')
    loadMindarScripts()
      .then(() => setScriptsReady(true))
      .catch(() => showError('โหลด MindAR ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'))

    return () => {
      document.body.classList.remove('ar-active')
      sceneRef.current?.stopAR()
    }
  }, [])

  // Catch MindAR's uncaught async errors (e.g. .mind file parse failures)
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message ?? String(e.reason ?? '')
      if (msg.includes('buffer') || msg.includes('byte') || msg.includes('mind')) {
        e.preventDefault()
        setArState('idle')
        showError(
          'ไม่สามารถโหลด target.mind ได้ — ไฟล์อาจไม่ถูกต้องหรือไม่พบที่ /target/target.mind',
        )
      }
    }
    window.addEventListener('unhandledrejection', handler)
    return () => window.removeEventListener('unhandledrejection', handler)
  }, [])

  const handleStartAR = async () => {
    if (arState !== 'idle' || !isARReady) return
    setErrorMsg(null)
    setArState('starting')

    // Verify camera permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      stream.getTracks().forEach((t) => t.stop())
    } catch (err) {
      setArState('idle')
      showError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'กล้องไม่พร้อมใช้งาน กรุณาอนุญาตการเข้าถึงกล้อง'
          : 'ไม่สามารถเปิดกล้องได้ กรุณาลองใหม่',
      )
      return
    }

    // Verify target.mind file exists
    try {
      const res = await fetch('/target/targets.mind', { method: 'HEAD' })
      if (!res.ok) {
        setArState('idle')
        showError('ไม่พบไฟล์ /target/targets.mind กรุณาตรวจสอบว่าไฟล์อยู่ใน public/target/')
        return
      }
    } catch {
      setArState('idle')
      showError('ไม่สามารถตรวจสอบ target.mind ได้')
      return
    }

    try {
      await sceneRef.current?.startAR()
      setArState('started')
    } catch (err) {
      setArState('idle')
      const msg = err instanceof Error ? err.message : ''
      showError(
        msg.includes('buffer') || msg.includes('byte')
          ? 'ไฟล์ target.mind ไม่ถูกต้อง กรุณาสร้างใหม่จาก MindAR Compiler'
          : 'ไม่สามารถเริ่ม AR ได้ กรุณาลองรีเฟรชหน้า',
      )
    }
  }

  const handleCapture = useCallback(async () => {
    if (!sceneRef.current || isCapturing || arState !== 'started') return
    setIsCapturing(true)
    try {
      const imageData = await sceneRef.current.captureImage()
      if (imageData) {
        setCapturedImage(imageData)
        setShowPreview(true)
      } else {
        showError('ไม่สามารถถ่ายภาพได้ กรุณาลองใหม่')
      }
    } finally {
      setIsCapturing(false)
    }
  }, [isCapturing, arState])

  const handleDownload = useCallback(() => {
    if (!capturedImage) return
    const link = document.createElement('a')
    link.href = capturedImage
    link.download = `image-tracking-${Date.now()}.png`
    link.click()
  }, [capturedImage])

  const handleShare = useCallback(async () => {
    if (!capturedImage || isSharing) return
    const blob = dataURLtoBlob(capturedImage)
    if (!blob) return
    setIsSharing(true)
    try {
      const file = new File([blob], 'image-tracking-ar.png', { type: 'image/png' })
      if (canNativeShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Image Tracking AR #demo', text: SHARE_TEXT, files: [file] })
        return
      }
      if (canNativeShare) {
        await navigator.share({
          title: 'Image Tracking AR #demo',
          text: SHARE_TEXT,
          url: window.location.origin,
        })
        return
      }
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`
      window.open(fbUrl, 'fb-share-dialog', 'width=626,height=436,scrollbars=yes')
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        showError('แชร์ไม่สำเร็จ กรุณาลองใหม่')
      }
    } finally {
      setIsSharing(false)
    }
  }, [capturedImage, isSharing, canNativeShare])

  const isStartable = scriptsReady && isARReady && arState === 'idle'

  return (
    <div
      className="relative overflow-hidden bg-black"
      style={{ width: '100vw', height: '100vh' }}
    >
      {/* A-Frame scene — only mount after scripts are ready */}
      {scriptsReady && (
        <MindARVideoScene
          ref={sceneRef}
          imageTargetSrc="/target/targets.mind"
          videoSrc="/videos/Fish.mp4"
          videoWidth={1.0}
          videoHeight={0.6}
          onReady={() => setIsARReady(true)}
          onTargetFound={() => setTargetFound(true)}
          onTargetLost={() => setTargetFound(false)}
          onError={showError}
        />
      )}

      {/* Start / Loading overlay */}
      {arState !== 'started' && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
          style={{ zIndex: 20 }}
        >
          <div className="relative mb-8">
            <div className="w-32 h-32 rounded-full border-2 border-teal-500/30 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-2 border-teal-400/50 flex items-center justify-center">
                <Film size={40} className="text-teal-400" />
              </div>
            </div>
            {arState === 'starting' && (
              <div className="absolute inset-0 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
            )}
          </div>

          <h1 className="text-white font-bold text-2xl mb-2">Image Tracking AR</h1>
          <p className="text-gray-400 text-sm text-center max-w-xs px-6 mb-8 leading-relaxed">
            ส่องกล้อง (กล้องหลัง) ไปที่ target image<br />
            วิดีโอจะปรากฎบนรูปแบบ real-time
          </p>

          {errorMsg && (
            <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/50 mb-5 mx-6 max-w-xs">
              <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <span className="text-red-300 text-sm leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <button
            onClick={handleStartAR}
            disabled={!isStartable}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 ${
              !isStartable
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-linear-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/40 hover:from-teal-400 hover:to-cyan-400'
            }`}
          >
            {arState === 'starting' ? (
              <>
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                กำลังเริ่ม AR...
              </>
            ) : !scriptsReady ? (
              <>
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                โหลด MindAR...
              </>
            ) : !isARReady ? (
              <>
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                เตรียม กล้อง...
              </>
            ) : (
              <>
                <Play size={20} />
                เริ่ม AR
              </>
            )}
          </button>

          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="mt-5 text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      )}

      {/* AR UI overlay */}
      {arState === 'started' && (
        <div
          className="fixed inset-0 flex flex-col justify-between pointer-events-none"
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
              ) : targetFound ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/20 border border-teal-500/50 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-teal-300 text-sm font-medium">พบ target! วิดีโอเล่นอยู่</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-sm">
                  <ScanLine size={14} className="text-gray-400 animate-pulse" />
                  <span className="text-gray-300 text-sm">ส่องกล้องไปที่ target image</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowInstructions(true)}
              className="w-10 h-10 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 active:scale-95 transition-all pointer-events-auto"
            >
              <Info size={18} />
            </button>
          </div>

          {/* Scanning frame */}
          {!targetFound && (
            <div className="flex justify-center">
              <div className="relative w-48 h-48">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-teal-400 rounded-tl-sm" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-teal-400 rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-teal-400 rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-teal-400 rounded-br-sm" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Target size={24} className="text-teal-400/40" />
                </div>
              </div>
            </div>
          )}

          {/* Bottom controls */}
          <div className="pb-10 px-8 pointer-events-auto">
            <div className="flex items-center justify-between max-w-xs mx-auto">
              <button
                onClick={() => {
                  sceneRef.current?.stopAR()
                  navigate(ROUTES.HOME)
                }}
                className="w-12 h-12 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 active:scale-95 transition-all"
              >
                <Home size={20} />
              </button>

              <button
                onClick={handleCapture}
                disabled={isCapturing}
                style={{
                  boxShadow: isCapturing ? undefined : '0 0 24px rgba(20,184,166,0.5)',
                }}
                className={`w-20 h-20 rounded-full border-4 border-white/60 flex items-center justify-center active:scale-95 transition-all duration-150 ${
                  isCapturing ? 'bg-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-100'
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
      )}

      {/* Preview modal */}
      {showPreview && capturedImage && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 50 }}>
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          />
          <div className="relative bg-gray-950 rounded-3xl border border-teal-500/30 p-5 w-full max-w-sm shadow-2xl shadow-teal-500/20">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <h2 className="text-white font-bold text-xl mb-4">Image Tracking AR Snap!</h2>
            <div className="rounded-2xl overflow-hidden border border-teal-500/20 mb-5">
              <img src={capturedImage} alt="Image Tracking AR Snapshot" className="w-full h-auto" />
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
                    : 'bg-linear-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 shadow-lg shadow-teal-500/30'
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
        <ImageTrackingInstructions
          open={showInstructions}
          onClose={() => setShowInstructions(false)}
        />
      </div>
    </div>
  )
}
