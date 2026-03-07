import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface MindARVideoSceneRef {
  startAR: () => Promise<void>
  stopAR: () => void
  captureImage: () => Promise<string | null>
}

interface MindARVideoSceneProps {
  imageTargetSrc?: string
  videoSrc?: string
  videoWidth?: number
  videoHeight?: number
  onReady?: () => void
  onTargetFound?: () => void
  onTargetLost?: () => void
  onError?: (msg: string) => void
}

interface AFrameSceneElement extends HTMLElement {
  hasLoaded: boolean
  renderer: { domElement: HTMLCanvasElement }
  systems: {
    'mindar-image-system': {
      start: () => Promise<void>
      stop: () => void
    }
  }
}

function applyFeedStyles(sceneEl: AFrameSceneElement) {
  const sr = sceneEl.shadowRoot
  if (sr && !sr.getElementById('mindar-feed-styles')) {
    const style = document.createElement('style')
    style.id = 'mindar-feed-styles'
    style.textContent = `
      video:not(#mindar-fish-video), canvas {
        position: fixed !important;
        top: 0 !important; left: 0 !important;
        width: 100% !important; height: 100% !important;
        min-width: 100% !important; min-height: 100% !important;
        object-fit: cover !important;
        object-position: center center !important;
        box-sizing: border-box !important;
      }
    `
    sr.appendChild(style)
  }
  const fullBleed: Partial<CSSStyleDeclaration> = {
    position: 'fixed', top: '0', left: '0',
    width: '100%', height: '100%',
    objectFit: 'cover', objectPosition: 'center center',
  }
  sceneEl.querySelectorAll<HTMLElement>('video:not(#mindar-fish-video)').forEach(el => Object.assign(el.style, fullBleed))
  sceneEl.querySelectorAll<HTMLElement>('canvas').forEach(el => Object.assign(el.style, fullBleed))
  let p: HTMLElement | null = sceneEl.parentElement
  while (p && p !== document.body) {
    Object.assign(p.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', overflow: 'hidden' })
    p = p.parentElement
  }
}

/** Wait for two animation frames to ensure A-Frame has completed its render pass. */
function waitForRender(): Promise<void> {
  return new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )
}

/**
 * Composite capture:
 *   Layer 1 — camera video (CSS element, cover-fit)
 *   Layer 2 — WebGL canvas (AR overlay: fish video plane on transparent bg)
 *
 * MindAR uses a CSS video for camera display and A-Frame WebGL for AR entities,
 * so we must composite both to get the full AR photo.
 */
async function compositeCapture(
  sceneEl: AFrameSceneElement,
  fishVideoEl: HTMLVideoElement | null,
): Promise<string | null> {
  // Wait for A-Frame to finish rendering so the WebGL buffer has the latest frame
  await waitForRender()

  const W = window.innerWidth
  const H = window.innerHeight
  const glCanvas = sceneEl.renderer?.domElement

  // Always composite the CSS camera feed with the WebGL AR layer.
  // Reading the WebGL canvas directly can miss the live camera feed on some MindAR setups,
  // which results in a black background plus only the AR content.
  const off = document.createElement('canvas')
  off.width = W
  off.height = H
  const ctx = off.getContext('2d')
  if (!ctx) return null

  // Find MindAR's camera video (not our fish video)
  let camVideo: HTMLVideoElement | null = null
  const pick = (v: HTMLVideoElement) => {
    if (!camVideo && v !== fishVideoEl && v.id !== 'mindar-fish-video' && v.readyState >= 2) {
      camVideo = v
    }
  }
  sceneEl.querySelectorAll<HTMLVideoElement>('video').forEach(pick)
  sceneEl.shadowRoot?.querySelectorAll<HTMLVideoElement>('video').forEach(pick)
  if (!camVideo) document.querySelectorAll<HTMLVideoElement>('video').forEach(pick)

  // Layer 1: camera video (cover transform, rear camera → no mirror)
  let drewCamera = false
  if (camVideo) {
    try {
      const vid = camVideo as HTMLVideoElement
      const vW = vid.videoWidth || W
      const vH = vid.videoHeight || H
      const scale = Math.max(W / vW, H / vH)
      const dW = vW * scale
      const dH = vH * scale
      ctx.drawImage(vid, (W - dW) / 2, (H - dH) / 2, dW, dH)
      drewCamera = true
    } catch { /* local camera stream — should never fail */ }
  }

  // Layer 2: WebGL AR canvas (fish video plane, transparent bg)
  if (glCanvas) {
    try {
      ctx.drawImage(glCanvas, 0, 0, W, H)
    } catch { /* tainted — skip; only camera shows */ }
  }

  try {
    const url = off.toDataURL('image/png', 0.95)
    if ((url.split(',')[1]?.length ?? 0) > 200) return url
  } catch { /* fall through to WebGL-only fallback */ }

  // Fallback: if the camera feed could not be captured, at least return the AR canvas.
  if (!drewCamera && glCanvas) {
    try {
      const url = glCanvas.toDataURL('image/png', 0.95)
      return (url.split(',')[1]?.length ?? 0) > 200 ? url : null
    } catch { return null }
  }

  return null
}

const MindARVideoScene = forwardRef<MindARVideoSceneRef, MindARVideoSceneProps>(
  function MindARVideoScene(
    {
      imageTargetSrc = '/target/targets.mind',
      videoSrc = '/videos/Fish.mp4',
      videoWidth = 1.0,
      videoHeight = 0.6,
      onReady,
      onTargetFound,
      onTargetLost,
      onError,
    },
    ref,
  ) {
    const sceneRef = useRef<AFrameSceneElement | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const feedTimers = useRef<ReturnType<typeof setTimeout>[]>([])

    const onReadyRef = useRef(onReady)
    const onTargetFoundRef = useRef(onTargetFound)
    const onTargetLostRef = useRef(onTargetLost)
    const onErrorRef = useRef(onError)
    useEffect(() => { onReadyRef.current = onReady }, [onReady])
    useEffect(() => { onTargetFoundRef.current = onTargetFound }, [onTargetFound])
    useEffect(() => { onTargetLostRef.current = onTargetLost }, [onTargetLost])
    useEffect(() => { onErrorRef.current = onError }, [onError])

    const startAR = async (): Promise<void> => {
      const sceneEl = sceneRef.current
      if (!sceneEl) throw new Error('Scene not ready')
      const arSystem = sceneEl.systems['mindar-image-system']
      if (!arSystem) throw new Error('AR system not ready')
      await arSystem.start()
      feedTimers.current.forEach(clearTimeout)
      feedTimers.current = [0, 50, 150, 300, 600, 1200].map(ms =>
        setTimeout(() => { if (sceneRef.current) applyFeedStyles(sceneRef.current) }, ms),
      )
    }

    const stopAR = (): void => {
      feedTimers.current.forEach(clearTimeout)
      try { sceneRef.current?.systems['mindar-image-system']?.stop() } catch { }
      videoRef.current?.pause()
    }

    const captureImage = async (): Promise<string | null> => {
      const sceneEl = sceneRef.current
      if (!sceneEl) return null
      return compositeCapture(sceneEl, videoRef.current)
    }

    useImperativeHandle(ref, () => ({ startAR, stopAR, captureImage }))

    useEffect(() => {
      const sceneEl = sceneRef.current
      if (!sceneEl) return
      const handleLoaded = () => onReadyRef.current?.()
      const handleTargetFound = () => {
        videoRef.current?.play().catch(() => {})
        onTargetFoundRef.current?.()
      }
      const handleTargetLost = () => {
        videoRef.current?.pause()
        onTargetLostRef.current?.()
      }
      const handleARError = (e: Event) => {
        console.error('MindAR error', (e as CustomEvent).detail)
        onErrorRef.current?.('AR เกิดข้อผิดพลาด กรุณาลองรีเฟรช')
      }
      if (sceneEl.hasLoaded) handleLoaded()
      else sceneEl.addEventListener('loaded', handleLoaded)
      sceneEl.addEventListener('targetFound', handleTargetFound)
      sceneEl.addEventListener('targetLost', handleTargetLost)
      sceneEl.addEventListener('arError', handleARError)
      return () => {
        feedTimers.current.forEach(clearTimeout)
        sceneEl.removeEventListener('loaded', handleLoaded)
        sceneEl.removeEventListener('targetFound', handleTargetFound)
        sceneEl.removeEventListener('targetLost', handleTargetLost)
        sceneEl.removeEventListener('arError', handleARError)
      }
    }, [])

    return (
      // semicolons are the correct separator for A-Frame multi-property components
      <a-scene
        ref={(el: unknown) => { sceneRef.current = el as AFrameSceneElement | null }}
        mindar-image={`imageTargetSrc: ${imageTargetSrc}; autoStart: false; uiLoading: no; uiError: no; uiScanning: no;`}
        color-space="sRGB"
        renderer="colorManagement: true; antialias: true; preserveDrawingBuffer: true; alpha: true"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
      >
        <a-assets>
          <video
            ref={videoRef}
            id="mindar-fish-video"
            src={videoSrc}
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
            src="#mindar-fish-video"
            position="0 0 0"
            width={String(videoWidth)}
            height={String(videoHeight)}
            rotation="0 0 0"
          />
        </a-entity>
      </a-scene>
    )
  },
)

export default MindARVideoScene
