import { forwardRef, useEffect, useImperativeHandle, useRef, type MutableRefObject } from 'react'

export interface MindARModelSceneRef {
  startAR: () => Promise<void>
  stopAR: () => void
  captureImage: () => Promise<string | null>
}

interface MindARModelSceneProps {
  imageTargetSrc?: string
  modelSrc?: string
  modelPosition?: string
  modelRotation?: string
  modelScale?: string
  modelAnimationPosition?: string
  modelAnimationRotation?: string
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

/** Return true when the video element is a live camera feed from getUserMedia. */
function isLiveCameraVideo(video: HTMLVideoElement): boolean {
  return Boolean(video.srcObject && video.srcObject instanceof MediaStream)
}

/** Apply fullscreen feed styles to MindAR injected camera and canvas elements. */
function applyFeedStyles(sceneEl: AFrameSceneElement) {
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight

  const sr = sceneEl.shadowRoot
  if (sr && !sr.getElementById('mindar-model-feed-styles')) {
    const style = document.createElement('style')
    style.id = 'mindar-model-feed-styles'
    style.textContent = `
      video {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 100% !important; min-height: 100% !important;
        object-fit: cover !important;
        object-position: center center !important;
        box-sizing: border-box !important;
        display: block !important;
        z-index: 1 !important;
      }

      canvas {
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
        background: transparent !important;
        z-index: 2 !important;
      }
    `
    sr.appendChild(style)
  }

  const fullBleedBase: Partial<CSSStyleDeclaration> = {
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
    boxSizing: 'border-box',
  }

  const cameraFeedStyle: Partial<CSSStyleDeclaration> = {
    ...fullBleedBase,
    zIndex: '1',
    opacity: '1',
    visibility: 'visible',
    pointerEvents: 'none',
    transform: 'none',
    background: '#000',
  }

  const overlayCanvasStyle: Partial<CSSStyleDeclaration> = {
    ...fullBleedBase,
    zIndex: '2',
    background: 'transparent',
    pointerEvents: 'none',
  }

  Object.assign(sceneEl.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    width: `${viewportWidth}px`,
    height: `${viewportHeight}px`,
    overflow: 'hidden',
    display: 'block',
    background: 'transparent',
    zIndex: '2',
  })

  sceneEl.querySelectorAll<HTMLElement>('video').forEach((el) => Object.assign(el.style, cameraFeedStyle))
  sceneEl.shadowRoot
    ?.querySelectorAll<HTMLElement>('video')
    .forEach((el) => Object.assign(el.style, cameraFeedStyle))

  sceneEl.querySelectorAll<HTMLElement>('canvas').forEach((el) => Object.assign(el.style, overlayCanvasStyle))
  sceneEl.shadowRoot
    ?.querySelectorAll<HTMLElement>('canvas')
    .forEach((el) => Object.assign(el.style, overlayCanvasStyle))

  if (sceneEl.renderer?.domElement) {
    Object.assign(sceneEl.renderer.domElement.style, overlayCanvasStyle)
  }

  document.querySelectorAll('video').forEach((el) => {
    if (el instanceof HTMLVideoElement && isLiveCameraVideo(el)) {
      Object.assign(el.style, cameraFeedStyle)
    }
  })

  let parent: HTMLElement | null = sceneEl.parentElement
  while (parent && parent !== document.body) {
    Object.assign(parent.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      width: `${viewportWidth}px`,
      height: `${viewportHeight}px`,
      overflow: 'hidden',
      boxSizing: 'border-box',
      background: 'transparent',
      zIndex: '2',
    })
    parent = parent.parentElement
  }
}

/** Keep the MindAR scene aligned with mobile viewport changes while AR is running. */
function startFeedSync(
  sceneEl: AFrameSceneElement,
  feedTimersRef: MutableRefObject<ReturnType<typeof setTimeout>[]>,
  feedLoopRef: MutableRefObject<number | null>,
  feedObserverRef: MutableRefObject<MutationObserver | null>,
  cleanupFeedSyncRef: MutableRefObject<(() => void) | null>,
) {
  cleanupFeedSyncRef.current?.()

  const apply = () => applyFeedStyles(sceneEl)
  const handleViewportChange = () => apply()

  apply()

  feedTimersRef.current.forEach(clearTimeout)
  feedTimersRef.current = [0, 50, 150, 300, 600, 1200].map((ms) => setTimeout(apply, ms))

  const loop = () => {
    apply()
    feedLoopRef.current = window.requestAnimationFrame(loop)
  }
  feedLoopRef.current = window.requestAnimationFrame(loop)

  const observer = new MutationObserver(apply)
  observer.observe(sceneEl, { childList: true, subtree: true })
  feedObserverRef.current = observer

  window.addEventListener('resize', handleViewportChange)
  window.visualViewport?.addEventListener('resize', handleViewportChange)
  window.visualViewport?.addEventListener('scroll', handleViewportChange)

  cleanupFeedSyncRef.current = () => {
    feedTimersRef.current.forEach(clearTimeout)
    feedTimersRef.current = []

    if (feedLoopRef.current !== null) {
      window.cancelAnimationFrame(feedLoopRef.current)
      feedLoopRef.current = null
    }

    feedObserverRef.current?.disconnect()
    feedObserverRef.current = null

    window.removeEventListener('resize', handleViewportChange)
    window.visualViewport?.removeEventListener('resize', handleViewportChange)
    window.visualViewport?.removeEventListener('scroll', handleViewportChange)
  }
}

/** Wait for two animation frames so A-Frame finishes its current render pass. */
function waitForRender(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

/** Capture camera feed and WebGL overlay into a single PNG image. */
async function compositeCapture(sceneEl: AFrameSceneElement): Promise<string | null> {
  await waitForRender()

  const width = window.innerWidth
  const height = window.innerHeight
  const glCanvas = sceneEl.renderer?.domElement

  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height

  const ctx = offscreen.getContext('2d')
  if (!ctx) return null

  let cameraVideo: HTMLVideoElement | null = null
  const pickCameraVideo = (video: HTMLVideoElement) => {
    if (!cameraVideo && video.readyState >= 2) {
      cameraVideo = video
    }
  }

  sceneEl.querySelectorAll<HTMLVideoElement>('video').forEach(pickCameraVideo)
  sceneEl.shadowRoot?.querySelectorAll<HTMLVideoElement>('video').forEach(pickCameraVideo)
  if (!cameraVideo) {
    document.querySelectorAll<HTMLVideoElement>('video').forEach(pickCameraVideo)
  }

  let drewCamera = false
  if (cameraVideo) {
    try {
      const videoEl = cameraVideo as HTMLVideoElement
      const videoWidth = videoEl.videoWidth || width
      const videoHeight = videoEl.videoHeight || height
      const scale = Math.max(width / videoWidth, height / videoHeight)
      const drawWidth = videoWidth * scale
      const drawHeight = videoHeight * scale
      ctx.drawImage(videoEl, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
      drewCamera = true
    } catch {
      // Ignore camera draw issues and keep fallback path below.
    }
  }

  if (glCanvas) {
    try {
      ctx.drawImage(glCanvas, 0, 0, width, height)
    } catch {
      // Ignore WebGL draw issues and keep fallback path below.
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

const MindARModelScene = forwardRef<MindARModelSceneRef, MindARModelSceneProps>(
  function MindARModelScene(
    {
      imageTargetSrc = '/target/targets.mind',
      modelSrc = '/3d/Crab/scene.gltf',
      modelPosition = '0 0 0',
      modelRotation = '0 0 0',
      modelScale = '0.2 0.2 0.2',
      modelAnimationPosition,
      modelAnimationRotation,
      onReady,
      onTargetFound,
      onTargetLost,
      onError,
    },
    ref,
  ) {
    const sceneRef = useRef<AFrameSceneElement | null>(null)
    const feedTimers = useRef<ReturnType<typeof setTimeout>[]>([])
    const feedLoopRef = useRef<number | null>(null)
    const feedObserverRef = useRef<MutationObserver | null>(null)
    const cleanupFeedSyncRef = useRef<(() => void) | null>(null)

    const onReadyRef = useRef(onReady)
    const onTargetFoundRef = useRef(onTargetFound)
    const onTargetLostRef = useRef(onTargetLost)
    const onErrorRef = useRef(onError)

    useEffect(() => {
      onReadyRef.current = onReady
    }, [onReady])

    useEffect(() => {
      onTargetFoundRef.current = onTargetFound
    }, [onTargetFound])

    useEffect(() => {
      onTargetLostRef.current = onTargetLost
    }, [onTargetLost])

    useEffect(() => {
      onErrorRef.current = onError
    }, [onError])

    /** Start the MindAR image tracking system and restyle injected camera elements. */
    const startAR = async (): Promise<void> => {
      const sceneEl = sceneRef.current
      if (!sceneEl) throw new Error('Scene not ready')

      const arSystem = sceneEl.systems['mindar-image-system']
      if (!arSystem) throw new Error('AR system not ready')

      await arSystem.start()
      startFeedSync(
        sceneEl,
        feedTimers,
        feedLoopRef,
        feedObserverRef,
        cleanupFeedSyncRef,
      )
    }

    /** Stop the MindAR tracking system and clear pending feed style timers. */
    const stopAR = (): void => {
      cleanupFeedSyncRef.current?.()
      try {
        sceneRef.current?.systems['mindar-image-system']?.stop()
      } catch {
        // Ignore stop errors from already-disposed scenes.
      }
    }

    /** Capture the current camera frame with the tracked 3D model overlay. */
    const captureImage = async (): Promise<string | null> => {
      const sceneEl = sceneRef.current
      if (!sceneEl) return null
      return compositeCapture(sceneEl)
    }

    useImperativeHandle(ref, () => ({ startAR, stopAR, captureImage }))

    useEffect(() => {
      const sceneEl = sceneRef.current
      if (!sceneEl) return

      /** Notify page UI once A-Frame finished booting. */
      const handleLoaded = () => onReadyRef.current?.()

      /** Notify page UI when the target image is found. */
      const handleTargetFound = () => {
        onTargetFoundRef.current?.()
      }

      /** Notify page UI when the target image is lost. */
      const handleTargetLost = () => {
        onTargetLostRef.current?.()
      }

      /** Translate low-level MindAR errors into a friendly Thai message. */
      const handleARError = (event: Event) => {
        console.error('MindAR model error', (event as CustomEvent).detail)
        onErrorRef.current?.('AR เกิดข้อผิดพลาด กรุณาลองรีเฟรช')
      }

      if (sceneEl.hasLoaded) handleLoaded()
      else sceneEl.addEventListener('loaded', handleLoaded)

      sceneEl.addEventListener('targetFound', handleTargetFound)
      sceneEl.addEventListener('targetLost', handleTargetLost)
      sceneEl.addEventListener('arError', handleARError)

      return () => {
        cleanupFeedSyncRef.current?.()
        sceneEl.removeEventListener('loaded', handleLoaded)
        sceneEl.removeEventListener('targetFound', handleTargetFound)
        sceneEl.removeEventListener('targetLost', handleTargetLost)
        sceneEl.removeEventListener('arError', handleARError)
      }
    }, [])

    return (
      <a-scene
        ref={(el: unknown) => {
          sceneRef.current = el as AFrameSceneElement | null
        }}
        mindar-image={`imageTargetSrc: ${imageTargetSrc}; autoStart: false; uiLoading: no; uiError: no; uiScanning: no;`}
        background="color: transparent"
        color-space="sRGB"
        renderer="colorManagement: true; antialias: true; preserveDrawingBuffer: true; alpha: true"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
        embedded
      >
        <a-camera position="0 0 0" look-controls="enabled: false" />
        <a-entity mindar-image-target="targetIndex: 0">
          <a-entity
            gltf-model={`url(${modelSrc})`}
            position={modelPosition}
            rotation={modelRotation}
            scale={modelScale}
            animation__position={modelAnimationPosition}
            animation__rotation={modelAnimationRotation}
          />
        </a-entity>
      </a-scene>
    )
  },
)

export default MindARModelScene
