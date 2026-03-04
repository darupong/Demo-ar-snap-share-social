import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import type * as ThreeTypes from 'three'

// AR.js and Three.js are loaded via CDN in index.html.
// We use `import type` for TypeScript types only — never import the actual module.
// All THREE constructors are accessed via window.THREE (the CDN instance)
// which matches what AR.js uses internally.

export interface ARSceneRef {
  captureImage: () => Promise<string | null>
}

interface ARSceneProps {
  onMarkerFound?: () => void
  onMarkerLost?: () => void
  onError?: (msg: string) => void
}

const ARScene = forwardRef<ARSceneRef, ARSceneProps>(function ARScene(
  { onMarkerFound, onMarkerLost, onError },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<ThreeTypes.WebGLRenderer | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const animFrameRef = useRef<number>(0)
  const isInitializedRef = useRef(false)

  // Stable callback refs to avoid re-running effect on every render
  const onMarkerFoundRef = useRef(onMarkerFound)
  const onMarkerLostRef = useRef(onMarkerLost)
  const onErrorRef = useRef(onError)
  useEffect(() => { onMarkerFoundRef.current = onMarkerFound }, [onMarkerFound])
  useEffect(() => { onMarkerLostRef.current = onMarkerLost }, [onMarkerLost])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  const captureImage = useCallback(async (): Promise<string | null> => {
    const video = videoRef.current
    const renderer = rendererRef.current
    if (!video || !renderer) return null

    try {
      const width = video.videoWidth || window.innerWidth
      const height = video.videoHeight || window.innerHeight

      const offscreen = document.createElement('canvas')
      offscreen.width = width
      offscreen.height = height
      const ctx = offscreen.getContext('2d')
      if (!ctx) return null

      // Layer 1: camera video frame
      ctx.drawImage(video, 0, 0, width, height)

      // Layer 2: Three.js AR overlay (scale to match video dimensions)
      ctx.drawImage(
        renderer.domElement,
        0, 0,
        renderer.domElement.width,
        renderer.domElement.height,
        0, 0,
        width,
        height
      )

      return offscreen.toDataURL('image/png', 0.95)
    } catch (err) {
      console.error('Capture failed:', err)
      return null
    }
  }, [])

  useImperativeHandle(ref, () => ({ captureImage }), [captureImage])

  useEffect(() => {
    // Guard: prevent double-initialization (protects against React hot reload)
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    const container = containerRef.current
    if (!container) return

    // Wait for CDN globals to load
    if (typeof window.THREE === 'undefined') {
      onErrorRef.current?.('Three.js CDN not loaded. Check index.html script tags.')
      return
    }
    if (typeof window.THREEx === 'undefined') {
      onErrorRef.current?.('AR.js CDN not loaded. Check index.html script tags.')
      return
    }

    const T = window.THREE
    const { THREEx } = window

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,              // transparent bg so video shows through
      preserveDrawingBuffer: true,  // needed for canvas.toDataURL()
    }) as ThreeTypes.WebGLRenderer

    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.className = 'ar-canvas'
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.top = '0'
    renderer.domElement.style.left = '0'
    renderer.domElement.style.zIndex = '1'
    renderer.domElement.style.pointerEvents = 'none'
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ── Scene & Camera ──────────────────────────────────────────────────────
    const scene = new T.Scene() as ThreeTypes.Scene
    const camera = new T.Camera() as ThreeTypes.Camera
    scene.add(camera)

    // ── Lights ──────────────────────────────────────────────────────────────
    const ambientLight = new T.AmbientLight(0xffffff, 0.7) as ThreeTypes.AmbientLight
    scene.add(ambientLight)

    const dirLight = new T.DirectionalLight(0xffffff, 1.2) as ThreeTypes.DirectionalLight
    dirLight.position.set(5, 10, 5)
    scene.add(dirLight)

    const pointLight1 = new T.PointLight(0x9333ea, 2, 8) as ThreeTypes.PointLight
    pointLight1.position.set(2, 4, 2)
    scene.add(pointLight1)

    const pointLight2 = new T.PointLight(0x06b6d4, 1.5, 8) as ThreeTypes.PointLight
    pointLight2.position.set(-2, 3, -2)
    scene.add(pointLight2)

    // ── AR Toolkit Source ───────────────────────────────────────────────────
    const arToolkitSource = new THREEx.ArToolkitSource({
      sourceType: 'webcam',
      sourceWidth: 640,
      sourceHeight: 480,
    })

    arToolkitSource.init(
      () => {
        // Get the video element AR.js created
        const video = arToolkitSource.domElement as HTMLVideoElement
        video.className = 'ar-video'
        video.style.position = 'absolute'
        video.style.top = '0'
        video.style.left = '0'
        video.style.zIndex = '0'
        video.style.width = '100%'
        video.style.height = '100%'
        video.style.objectFit = 'cover'
        container.insertBefore(video, container.firstChild)
        videoRef.current = video

        handleResize()
      },
      (err: unknown) => {
        console.error('ArToolkitSource error:', err)
        onErrorRef.current?.('กล้องไม่พร้อมใช้งาน กรุณาอนุญาตการเข้าถึงกล้อง')
      }
    )

    // ── AR Toolkit Context ──────────────────────────────────────────────────
    const arToolkitContext = new THREEx.ArToolkitContext({
      cameraParametersUrl: '/camera_para.dat',
      detectionMode: 'mono',
      maxDetectionRate: 30,
      canvasWidth: 640,
      canvasHeight: 480,
      imageSmoothingEnabled: false,
    })

    arToolkitContext.init(() => {
      // Copy AR calibration to camera projection matrix
      camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix())
    })

    // ── Marker Root ─────────────────────────────────────────────────────────
    const markerRoot = new T.Group() as ThreeTypes.Group
    scene.add(markerRoot)

    // ── Marker Controls (Hiro Pattern) ──────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _markerControls = new THREEx.ArMarkerControls(
      arToolkitContext,
      markerRoot,
      {
        type: 'pattern',
        patternUrl: '/patt.hiro',
        changeMatrixMode: 'modelViewMatrix',
      }
    )

    // ── 3D Object: Diamond Crystal ──────────────────────────────────────────
    const group = new T.Group() as ThreeTypes.Group

    // Main icosahedron gem
    const icoGeo = new T.IcosahedronGeometry(0.7, 0)
    const icoMat = new T.MeshStandardMaterial({
      color: 0x9333ea,        // violet-600
      metalness: 0.9,
      roughness: 0.05,
      emissive: 0x3b0764,     // deep purple glow
      emissiveIntensity: 0.4,
    })
    const gem = new T.Mesh(icoGeo, icoMat) as ThreeTypes.Mesh
    group.add(gem)

    // Wireframe overlay for crystal look
    const wireGeo = new T.WireframeGeometry(icoGeo)
    const wireMat = new T.LineBasicMaterial({
      color: 0xd8b4fe,        // violet-300
      transparent: true,
      opacity: 0.5,
    })
    const wireframe = new T.LineSegments(wireGeo, wireMat) as ThreeTypes.LineSegments
    group.add(wireframe)

    // Outer ring
    const ringGeo = new T.TorusGeometry(0.9, 0.04, 8, 32)
    const ringMat = new T.MeshStandardMaterial({
      color: 0x06b6d4,        // cyan-500
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0x0e7490,
      emissiveIntensity: 0.3,
    })
    const ring = new T.Mesh(ringGeo, ringMat) as ThreeTypes.Mesh
    ring.rotation.x = Math.PI / 2
    group.add(ring)

    // Small orbiting sphere
    const orbGeo = new T.SphereGeometry(0.12, 8, 8)
    const orbMat = new T.MeshStandardMaterial({
      color: 0xfbbf24,        // amber-400
      metalness: 0.8,
      roughness: 0.1,
      emissive: 0x78350f,
      emissiveIntensity: 0.4,
    })
    const orb = new T.Mesh(orbGeo, orbMat) as ThreeTypes.Mesh
    group.add(orb)

    group.position.y = 0.5
    markerRoot.add(group)

    // ── Resize Handler ──────────────────────────────────────────────────────
    function handleResize() {
      arToolkitSource.onResizeElement()
      arToolkitSource.copyElementSizeTo(renderer.domElement)
      if (arToolkitContext.arController !== null) {
        arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas)
      }
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // ── Animation Loop ──────────────────────────────────────────────────────
    let wasVisible = false
    const startTime = Date.now()

    function animate() {
      animFrameRef.current = requestAnimationFrame(animate)

      if (arToolkitSource.ready) {
        arToolkitContext.update(arToolkitSource.domElement)
      }

      // Detect marker visibility changes
      const isVisible = markerRoot.visible
      if (isVisible && !wasVisible) {
        onMarkerFoundRef.current?.()
        wasVisible = true
      } else if (!isVisible && wasVisible) {
        onMarkerLostRef.current?.()
        wasVisible = false
      }

      // Animate 3D object when marker is tracked
      if (markerRoot.visible) {
        const elapsed = (Date.now() - startTime) / 1000

        // Main gem spin + tilt
        gem.rotation.y += 0.018
        gem.rotation.x = Math.sin(elapsed * 0.7) * 0.15

        // Wireframe counter-rotate for effect
        wireframe.rotation.y -= 0.01
        wireframe.rotation.z += 0.008

        // Floating up/down
        group.position.y = 0.5 + Math.sin(elapsed * 1.2) * 0.18

        // Scale pulse (breathing)
        const scale = 1 + Math.sin(elapsed * 2.5) * 0.06
        gem.scale.set(scale, scale, scale)
        wireframe.scale.set(scale, scale, scale)

        // Ring rotation
        ring.rotation.z = elapsed * 0.8
        ring.rotation.x = Math.PI / 2 + Math.sin(elapsed * 0.5) * 0.3

        // Orbit sphere around gem
        const orbAngle = elapsed * 2
        orb.position.set(
          Math.cos(orbAngle) * 0.9,
          Math.sin(orbAngle * 0.5) * 0.3,
          Math.sin(orbAngle) * 0.9
        )
      }

      renderer.render(scene, camera)
    }

    animate()

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      isInitializedRef.current = false
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', handleResize)

      renderer.dispose()
      icoGeo.dispose()
      icoMat.dispose()
      wireGeo.dispose()
      wireMat.dispose()
      ringGeo.dispose()
      ringMat.dispose()
      orbGeo.dispose()
      orbMat.dispose()

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      if (videoRef.current?.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current)
      }
      rendererRef.current = null
      videoRef.current = null
    }
  }, []) // Empty deps - only run once on mount

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    />
  )
})

export default ARScene
