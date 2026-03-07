import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

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

/** Apply fullscreen feed styles to MindAR injected camera and canvas elements. */
function applyFeedStyles(sceneEl: AFrameSceneElement) {
  const sr = sceneEl.shadowRoot
  if (sr && !sr.getElementById('mindar-model-feed-styles')) {
    const style = document.createElement('style')
    style.id = 'mindar-model-feed-styles'
    style.textContent = `
      video, canvas {
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
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center center',
  }

  sceneEl.querySelectorAll<HTMLElement>('video, canvas').forEach((el) => Object.assign(el.style, fullBleed))
  let parent: HTMLElement | null = sceneEl.parentElement
  while (parent && parent !== document.body) {
    Object.assign(parent.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    })
    parent = parent.parentElement
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
      feedTimers.current.forEach(clearTimeout)
      feedTimers.current = [0, 50, 150, 300, 600, 1200].map((ms) =>
        setTimeout(() => {
          if (sceneRef.current) applyFeedStyles(sceneRef.current)
        }, ms),
      )
    }

    /** Stop the MindAR tracking system and clear pending feed style timers. */
    const stopAR = (): void => {
      feedTimers.current.forEach(clearTimeout)
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
        feedTimers.current.forEach(clearTimeout)
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
        color-space="sRGB"
        renderer="colorManagement: true; antialias: true; preserveDrawingBuffer: true; alpha: true"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
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
