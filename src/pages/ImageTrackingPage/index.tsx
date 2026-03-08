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
import { ROUTES } from '@/constants'
import { dataURLtoBlob } from '@/lib/image'
import ImageTrackingInstructions from './components/ImageTrackingInstructions'

const SHARE_TEXT = 'ส่อง target image แล้วเห็นวิดีโอลอยขึ้นมาแบบ AR! #siampiwat_demo'
const FISH_VIDEO_ID = 'mindar-fish-video'

const MINDAR_SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js',
  'https://aframe.io/releases/1.4.2/aframe.min.js',
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js',
]

let mindarScriptsPromise: Promise<void> | null = null

type ARState = 'idle' | 'starting' | 'started'

interface AFrameSceneElement extends HTMLElement {
  hasLoaded: boolean
  renderer?: { domElement: HTMLCanvasElement }
  systems: {
    'mindar-image-system'?: {
      start: () => Promise<void>
      stop: () => void
    }
  }
}

/** Load MindAR and A-Frame scripts once for the whole app session. */
function loadMindarScripts(): Promise<void> {
  if (mindarScriptsPromise) return mindarScriptsPromise

  mindarScriptsPromise = MINDAR_SCRIPTS.reduce(
    (chain, src) =>
      chain.then(
        () =>
          new Promise<void>((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
              resolve()
              return
            }

            const script = document.createElement('script')
            script.src = src
            script.onload = () => resolve()
            script.onerror = () => reject(new Error(`Failed to load: ${src}`))
            document.head.appendChild(script)
          }),
      ),
    Promise.resolve(),
  )

  return mindarScriptsPromise
}

/** Wait for the AR renderer to finish the current frame. */
function waitForRender(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

/** Collect every media node inside the AR container, including shadow roots. */
function getMediaInContainer(container: HTMLElement): { videos: HTMLElement[]; canvases: HTMLElement[] } {
  const videos: HTMLElement[] = []
  const canvases: HTMLElement[] = []

  const walk = (element: Element) => {
    if (element instanceof HTMLVideoElement) videos.push(element)
    if (element instanceof HTMLCanvasElement) canvases.push(element)

    const host = element as HTMLElement
    if (host.shadowRoot) {
      Array.from(host.shadowRoot.children).forEach((child) => walk(child))
    }

    Array.from(element.children).forEach((child) => walk(child))
  }

  walk(container)
  return { videos, canvases }
}

/** Inject fullscreen video/canvas styles into the A-Frame shadow DOM. */
function injectShadowStyles(container: HTMLElement) {
  const scene = container.querySelector('a-scene') as HTMLElement | null
  const shadowRoot = scene?.shadowRoot
  if (!shadowRoot) return

  const styleId = 'image-tracking-fullbleed-styles'
  if (shadowRoot.getElementById(styleId)) return

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    video:not(#${FISH_VIDEO_ID}), canvas {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      height: 100% !important;
      min-width: 100% !important;
      min-height: 100% !important;
      object-fit: cover !important;
      object-position: center center !important;
      box-sizing: border-box !important;
      display: block !important;
    }
  `
  shadowRoot.appendChild(style)
}

/** Apply the same fullscreen camera-feed layout used by CrabTrackingPage. */
function applyCameraFeedStyles(container: HTMLElement) {
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight

  container.style.width = `${viewportWidth}px`
  container.style.height = `${viewportHeight}px`
  injectShadowStyles(container)

  const { videos, canvases } = getMediaInContainer(container)
  const fullscreenVideos = videos.filter(
    (element) => !(element instanceof HTMLVideoElement && element.id === FISH_VIDEO_ID),
  )

  const toKebab = (value: string) => value.replace(/([A-Z])/g, (_, char) => `-${char.toLowerCase()}`)

  const setStyle = (
    element: HTMLElement,
    style: Record<string, string>,
    useImportant = false,
  ) => {
    Object.entries(style).forEach(([key, value]) => {
      element.style.setProperty(toKebab(key), value, useImportant ? 'important' : '')
    })
  }

  const fullBleedStyle: Record<string, string> = {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    width: '100%',
    height: '100%',
    minWidth: '100%',
    minHeight: '100%',
    objectFit: 'cover',
    objectPosition: 'center center',
    display: 'block',
    background: 'transparent',
  }

  const parentFullStyle: Record<string, string> = {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    boxSizing: 'border-box',
    background: 'transparent',
  }

  ;[...fullscreenVideos, ...canvases].forEach((element) => {
    setStyle(element, fullBleedStyle, true)
    let parent: HTMLElement | null = element.parentElement
    while (parent && parent !== container) {
      setStyle(parent, parentFullStyle, true)
      parent = parent.parentElement
    }
  })
}

/** Capture the live camera feed and AR overlay into a single PNG image. */
async function compositeCapture(
  container: HTMLElement,
  sceneEl: AFrameSceneElement,
  fishVideoEl: HTMLVideoElement | null,
): Promise<string | null> {
  await waitForRender()

  const width = window.innerWidth
  const height = window.innerHeight
  const glCanvas = sceneEl.renderer?.domElement

  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height

  const ctx = offscreen.getContext('2d')
  if (!ctx) return null

  const { videos } = getMediaInContainer(container)
  let cameraVideo: HTMLVideoElement | null = null

  videos.forEach((video) => {
    if (
      !cameraVideo &&
      video instanceof HTMLVideoElement &&
      video !== fishVideoEl &&
      video.id !== FISH_VIDEO_ID &&
      video.readyState >= 2
    ) {
      cameraVideo = video
    }
  })

  if (!cameraVideo) {
    document.querySelectorAll('video').forEach((video) => {
      if (
        !cameraVideo &&
        video instanceof HTMLVideoElement &&
        video !== fishVideoEl &&
        video.id !== FISH_VIDEO_ID &&
        video.readyState >= 2
      ) {
        cameraVideo = video
      }
    })
  }

  let drewCamera = false
  if (cameraVideo) {
    try {
      const videoElement = cameraVideo as HTMLVideoElement
      const videoWidth = videoElement.videoWidth || width
      const videoHeight = videoElement.videoHeight || height
      const scale = Math.max(width / videoWidth, height / videoHeight)
      const drawWidth = videoWidth * scale
      const drawHeight = videoHeight * scale
      ctx.drawImage(
        videoElement,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      )
      drewCamera = true
    } catch {
      // Ignore camera draw issues and fall back to the WebGL canvas below.
    }
  }

  if (glCanvas) {
    try {
      ctx.drawImage(glCanvas, 0, 0, width, height)
    } catch {
      // Ignore WebGL draw issues and keep the fallback path below.
    }
  }

  try {
    const url = offscreen.toDataURL('image/png', 0.95)
    if ((url.split(',')[1]?.length ?? 0) > 200) return url
  } catch {
    // Fall through to WebGL-only fallback below.
  }

  if (!drewCamera && glCanvas) {
    try {
      const url = glCanvas.toDataURL('image/png', 0.95)
      return (url.split(',')[1]?.length ?? 0) > 200 ? url : null
    } catch {
      return null
    }
  }

  return null
}

/** Render the image-tracking AR page with the same camera behavior as CrabTrackingPage. */
export default function ImageTrackingPage() {
  const navigate = useNavigate()
  const sceneRef = useRef<AFrameSceneElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const fishVideoRef = useRef<HTMLVideoElement | null>(null)

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

  /** Show a temporary error banner for the page overlay. */
  const showError = useCallback((msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 5000)
  }, [])

  /** Stop the MindAR scene and the tracked target video. */
  const stopAR = useCallback(() => {
    try {
      sceneRef.current?.systems['mindar-image-system']?.stop()
    } catch {
      // Ignore stop errors from already-disposed scenes.
    }

    fishVideoRef.current?.pause()
  }, [])

  /** Re-apply fullscreen media styles to the image-tracking AR container. */
  const applyFeedLayout = useCallback(() => {
    if (containerRef.current) {
      applyCameraFeedStyles(containerRef.current)
    }
  }, [])

  /** Capture the current image-tracking AR frame as one composited image. */
  const captureSceneImage = useCallback(async () => {
    if (!containerRef.current || !sceneRef.current) return null
    return compositeCapture(containerRef.current, sceneRef.current, fishVideoRef.current)
  }, [])

  useEffect(() => {
    document.body.classList.add('ar-active')
    loadMindarScripts()
      .then(() => setScriptsReady(true))
      .catch(() => showError('โหลด MindAR ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'))

    return () => {
      document.body.classList.remove('ar-active')
      stopAR()
    }
  }, [showError, stopAR])

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message ?? String(event.reason ?? '')
      if (msg.includes('buffer') || msg.includes('byte') || msg.includes('mind')) {
        event.preventDefault()
        setArState('idle')
        showError(
          'ไม่สามารถโหลด target.mind ได้ — ไฟล์อาจไม่ถูกต้องหรือไม่พบที่ /target/targets.mind',
        )
      }
    }

    window.addEventListener('unhandledrejection', handler)
    return () => window.removeEventListener('unhandledrejection', handler)
  }, [showError])

  useEffect(() => {
    const sceneEl = sceneRef.current
    if (!scriptsReady || !sceneEl) return

    /** Mark the page ready once A-Frame finishes booting. */
    const handleLoaded = () => setIsARReady(true)

    /** Start the target video and show the found badge. */
    const handleTargetFound = () => {
      fishVideoRef.current?.play().catch(() => {})
      setTargetFound(true)
    }

    /** Pause the target video and reset the found badge. */
    const handleTargetLost = () => {
      fishVideoRef.current?.pause()
      setTargetFound(false)
    }

    /** Translate low-level MindAR errors into a friendly Thai message. */
    const handleARError = (event: Event) => {
      console.error('MindAR video error', (event as CustomEvent).detail)
      showError('AR เกิดข้อผิดพลาด กรุณาลองรีเฟรช')
    }

    if (sceneEl.hasLoaded) handleLoaded()
    else sceneEl.addEventListener('loaded', handleLoaded)

    sceneEl.addEventListener('targetFound', handleTargetFound)
    sceneEl.addEventListener('targetLost', handleTargetLost)
    sceneEl.addEventListener('arError', handleARError)

    return () => {
      sceneEl.removeEventListener('loaded', handleLoaded)
      sceneEl.removeEventListener('targetFound', handleTargetFound)
      sceneEl.removeEventListener('targetLost', handleTargetLost)
      sceneEl.removeEventListener('arError', handleARError)
    }
  }, [scriptsReady, showError])

  useEffect(() => {
    if (arState !== 'started') return

    applyFeedLayout()

    const delayed = [0, 50, 150, 300, 500, 1000].map((ms) => setTimeout(applyFeedLayout, ms))
    const observer = new MutationObserver(() => applyFeedLayout())

    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true })
    }

    let rafId = 0
    const loop = () => {
      applyFeedLayout()
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    /** Keep the fullscreen feed aligned with mobile viewport changes. */
    const handleViewportResize = () => applyFeedLayout()
    window.visualViewport?.addEventListener('resize', handleViewportResize)
    window.visualViewport?.addEventListener('scroll', handleViewportResize)

    return () => {
      delayed.forEach(clearTimeout)
      cancelAnimationFrame(rafId)
      observer.disconnect()
      window.visualViewport?.removeEventListener('resize', handleViewportResize)
      window.visualViewport?.removeEventListener('scroll', handleViewportResize)

      if (containerRef.current) {
        containerRef.current.style.width = ''
        containerRef.current.style.height = ''
      }
    }
  }, [arState, applyFeedLayout])

  /** Ask for camera access, verify assets, then start image tracking. */
  const handleStartAR = async () => {
    if (arState !== 'idle' || !isARReady) return

    setErrorMsg(null)
    setArState('starting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      stream.getTracks().forEach((track) => track.stop())
    } catch (error) {
      setArState('idle')
      showError(
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'กล้องไม่พร้อมใช้งาน กรุณาอนุญาตการเข้าถึงกล้อง'
          : 'ไม่สามารถเปิดกล้องได้ กรุณาลองใหม่',
      )
      return
    }

    try {
      const [targetRes, videoRes] = await Promise.all([
        fetch('/target/targets.mind', { method: 'HEAD' }),
        fetch('/videos/Fish.mp4', { method: 'HEAD' }),
      ])

      if (!targetRes.ok) {
        setArState('idle')
        showError('ไม่พบไฟล์ /target/targets.mind กรุณาตรวจสอบว่าไฟล์อยู่ใน public/target/')
        return
      }

      if (!videoRes.ok) {
        setArState('idle')
        showError('ไม่พบไฟล์ /videos/Fish.mp4 กรุณาตรวจสอบว่าไฟล์อยู่ใน public/videos/')
        return
      }
    } catch {
      setArState('idle')
      showError('ไม่สามารถตรวจสอบไฟล์ target หรือวิดีโอ Fish ได้')
      return
    }

    try {
      const arSystem = sceneRef.current?.systems['mindar-image-system']
      if (!arSystem) throw new Error('AR system not ready')

      await arSystem.start()
      applyFeedLayout()
      setArState('started')
    } catch (error) {
      setArState('idle')
      const msg = error instanceof Error ? error.message : ''
      showError(
        msg.includes('buffer') || msg.includes('byte')
          ? 'ไฟล์ target.mind ไม่ถูกต้อง กรุณาสร้างใหม่จาก MindAR Compiler'
          : 'ไม่สามารถเริ่ม AR ได้ กรุณาลองรีเฟรชหน้า',
      )
    }
  }

  /** Capture the current AR frame and open the preview modal. */
  const handleCapture = useCallback(async () => {
    if (!sceneRef.current || !containerRef.current || isCapturing || arState !== 'started') return

    setIsCapturing(true)
    try {
      const imageData = await captureSceneImage()
      if (imageData) {
        setCapturedImage(imageData)
        setShowPreview(true)
      } else {
        showError('ไม่สามารถถ่ายภาพได้ กรุณาลองใหม่')
      }
    } finally {
      setIsCapturing(false)
    }
  }, [captureSceneImage, isCapturing, arState, showError])

  /** Download the current AR snapshot as a PNG file. */
  const handleDownload = useCallback(() => {
    if (!capturedImage) return

    const link = document.createElement('a')
    link.href = capturedImage
    link.download = `image-tracking-${Date.now()}.png`
    link.click()
  }, [capturedImage])

  /** Share the current AR snapshot using native share when available. */
  const handleShare = useCallback(async () => {
    if (!capturedImage || isSharing) return

    const blob = dataURLtoBlob(capturedImage)
    if (!blob) return

    setIsSharing(true)
    try {
      const file = new File([blob], 'image-tracking-ar.png', { type: 'image/png' })
      if (canNativeShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Image Tracking AR #siampiwat_demo', text: SHARE_TEXT, files: [file] })
        return
      }

      if (canNativeShare) {
        await navigator.share({
          title: 'Image Tracking AR #siampiwat_demo',
          text: SHARE_TEXT,
          url: window.location.origin,
        })
        return
      }

      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`
      window.open(fbUrl, 'fb-share-dialog', 'width=626,height=436,scrollbars=yes')
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        showError('แชร์ไม่สำเร็จ กรุณาลองใหม่')
      }
    } finally {
      setIsSharing(false)
    }
  }, [capturedImage, isSharing, canNativeShare, showError])

  const isStartable = scriptsReady && isARReady && arState === 'idle'

  return (
    <div
      ref={containerRef}
      className="image-tracking-page relative"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        zIndex: 1,
      }}
    >
      {scriptsReady && (
        <a-scene
          ref={(element: unknown) => {
            sceneRef.current = element as AFrameSceneElement | null
          }}
          mindar-image="imageTargetSrc: /target/targets.mind; autoStart: false; uiLoading: no; uiError: no; uiScanning: no;"
          color-space="sRGB"
          renderer="colorManagement: true; antialias: true; preserveDrawingBuffer: true; alpha: true"
          vr-mode-ui="enabled: false"
          device-orientation-permission-ui="enabled: false"
          embedded
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            display: 'block',
            background: 'transparent',
          }}
        >
          <a-assets>
            <video
              ref={fishVideoRef}
              id={FISH_VIDEO_ID}
              src="/videos/Fish.mp4"
              crossOrigin="anonymous"
              preload="auto"
              loop
              muted
              playsInline
            />
          </a-assets>
          <a-camera position="0 0 0" look-controls="enabled: false" />
          <a-entity mindar-image-target="targetIndex: 0">
            <a-video
              src={`#${FISH_VIDEO_ID}`}
              position="0 0 0"
              width="1"
              height="0.6"
              rotation="0 0 0"
            />
          </a-entity>
        </a-scene>
      )}

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
            ส่องกล้อง (กล้องหลัง) ไปที่ target image
            <br />
            วิดีโอจะปรากฏบนรูปแบบ real-time
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
                เตรียมกล้อง...
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

      {arState === 'started' && (
        <div
          className="fixed inset-0 flex flex-col justify-between pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <div
            className="flex items-center justify-between px-4"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
            }}
          >
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

          <div
            className="px-8 pointer-events-auto"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.5rem)',
            }}
          >
            <div className="flex items-center justify-between max-w-xs mx-auto">
              <button
                onClick={() => {
                  stopAR()
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
