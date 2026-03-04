import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

export interface HandFireCanvasRef {
  captureImage: () => Promise<string | null>
}

interface HandFireCanvasProps {
  fireColor?: string          // hex e.g. '#ff6600'
  onHandsDetected?: (count: number) => void
  onReady?: () => void
  onError?: (msg: string) => void
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  type: 'fire' | 'spark'
  // Color baked at emission time — old particles keep their color during fade
  r: number
  g: number
  b: number
}

// Index finger tip = landmark 8 (MCP→PIP→DIP→TIP: 5,6,7,8)
const INDEX_TIP = 8

const FINGER_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
]

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 255, g: 102, b: 0 }
}

/**
 * Compute objectFit:cover display rect.
 * offsetX/offsetY can be negative (cropped areas outside screen).
 */
function getCoverTransform(videoW: number, videoH: number, screenW: number, screenH: number) {
  const va = videoW / videoH
  const sa = screenW / screenH
  let displayW: number, displayH: number
  if (va > sa) {
    displayH = screenH
    displayW = screenH * va
  } else {
    displayW = screenW
    displayH = screenW / va
  }
  return {
    displayW,
    displayH,
    offsetX: (screenW - displayW) / 2,
    offsetY: (screenH - displayH) / 2,
  }
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, alpha: number) {
  const { r, g, b } = p
  const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)

  if (p.type === 'fire') {
    // Bright whitish core → chosen color → dark edge → transparent
    const cr = Math.min(255, r + 160)
    const cg = Math.min(255, g + 160)
    const cb = Math.min(255, b + 160)
    grad.addColorStop(0,   `rgba(${cr},${cg},${cb},${alpha})`)
    grad.addColorStop(0.3, `rgba(${r},${g},${b},${alpha * 0.9})`)
    grad.addColorStop(0.7, `rgba(${r >> 1},${g >> 1},${b >> 1},${alpha * 0.5})`)
    grad.addColorStop(1,   `rgba(0,0,0,0)`)
  } else {
    // spark — white center → chosen color → transparent
    grad.addColorStop(0,   `rgba(255,255,255,${alpha})`)
    grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.7})`)
    grad.addColorStop(1,   `rgba(0,0,0,0)`)
  }

  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
  ctx.fill()
}

const HandFireCanvas = forwardRef<HandFireCanvasRef, HandFireCanvasProps>(
  function HandFireCanvas({ fireColor = '#ff6600', onHandsDetected, onReady, onError }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const particlesRef = useRef<Particle[]>([])
    const animFrameRef = useRef<number>(0)
    const landmarkerRef = useRef<HandLandmarker | null>(null)
    const lastVideoTimeRef = useRef<number>(-1)
    const isInitializedRef = useRef(false)

    // Live color ref — renderLoop always reads latest without re-running effect
    const colorRef = useRef(hexToRgb(fireColor))
    useEffect(() => { colorRef.current = hexToRgb(fireColor) }, [fireColor])

    const onHandsDetectedRef = useRef(onHandsDetected)
    const onReadyRef = useRef(onReady)
    const onErrorRef = useRef(onError)
    useEffect(() => { onHandsDetectedRef.current = onHandsDetected }, [onHandsDetected])
    useEffect(() => { onReadyRef.current = onReady }, [onReady])
    useEffect(() => { onErrorRef.current = onError }, [onError])

    const captureImage = useCallback(async (): Promise<string | null> => {
      const video = videoRef.current
      const fireCanvas = canvasRef.current
      if (!video || !fireCanvas) return null

      try {
        const w = window.innerWidth
        const h = window.innerHeight
        const offscreen = document.createElement('canvas')
        offscreen.width = w
        offscreen.height = h
        const ctx = offscreen.getContext('2d')
        if (!ctx) return null

        // Mirrored video with objectFit:cover
        const { displayW, displayH, offsetX, offsetY } = getCoverTransform(
          video.videoWidth || w, video.videoHeight || h, w, h
        )
        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(video, -(offsetX + displayW), offsetY, displayW, displayH)
        ctx.restore()

        ctx.drawImage(fireCanvas, 0, 0, w, h)
        return offscreen.toDataURL('image/png', 0.95)
      } catch (err) {
        console.error('Capture failed:', err)
        return null
      }
    }, [])

    useImperativeHandle(ref, () => ({ captureImage }), [captureImage])

    useEffect(() => {
      if (isInitializedRef.current) return
      isInitializedRef.current = true

      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      let stopped = false

      function syncCanvasSize() {
        if (!canvas) return
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
      syncCanvasSize()
      window.addEventListener('resize', syncCanvasSize)

      async function init() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          })
          if (stopped) { stream.getTracks().forEach(t => t.stop()); return }
          video!.srcObject = stream
          await video!.play()

          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
          )
          if (stopped) return

          const handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
          })
          if (stopped) { handLandmarker.close(); return }

          landmarkerRef.current = handLandmarker
          onReadyRef.current?.()
          renderLoop()
        } catch (err) {
          console.error('HandFireCanvas init error:', err)
          onErrorRef.current?.(
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'กล้องไม่พร้อมใช้งาน กรุณาอนุญาตการเข้าถึงกล้อง'
              : 'โหลด AI ไม่สำเร็จ กรุณาลองใหม่'
          )
        }
      }

      function emitFire(x: number, y: number) {
        const { r, g, b } = colorRef.current
        const particles = particlesRef.current

        // 2 fire particles per frame
        for (let i = 0; i < 2; i++) {
          particles.push({
            x: x + rand(-5, 5),
            y: y + rand(-5, 5),
            vx: rand(-0.6, 0.6),
            vy: rand(-1.2, -2.8),
            life: rand(0.5, 0.8),
            maxLife: rand(0.5, 0.8),
            size: rand(14, 26),
            type: 'fire',
            r, g, b,
          })
        }

        // Spark: 25% chance
        if (Math.random() < 0.25) {
          particles.push({
            x: x + rand(-3, 3),
            y: y + rand(-3, 3),
            vx: rand(-4, 4),
            vy: rand(-3, -7),
            life: rand(0.15, 0.3),
            maxLife: rand(0.15, 0.3),
            size: rand(2, 5),
            type: 'spark',
            r, g, b,
          })
        }
      }

      function renderLoop() {
        animFrameRef.current = requestAnimationFrame(renderLoop)

        const v = videoRef.current
        const c = canvasRef.current
        const lm = landmarkerRef.current
        if (!v || !c || v.readyState < 2) return

        const W = c.width
        const H = c.height
        const ctx = c.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, W, H)

        const vW = v.videoWidth || W
        const vH = v.videoHeight || H
        const { displayW, displayH, offsetX, offsetY } = getCoverTransform(vW, vH, W, H)

        // Mirror x to match CSS scaleX(-1) on video
        const mx = (lx: number) => (1 - lx) * displayW + offsetX
        const my = (ly: number) => ly * displayH + offsetY

        if (lm && v.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = v.currentTime
          const result = lm.detectForVideo(v, performance.now())
          onHandsDetectedRef.current?.(result.landmarks.length)

          const { r, g, b } = colorRef.current

          for (const hand of result.landmarks) {
            // Skeleton — color tinted to fire color
            ctx.save()
            ctx.strokeStyle = `rgba(${r},${g},${b},0.4)`
            ctx.lineWidth = 1.5
            for (const [a, bn] of FINGER_CONNECTIONS) {
              ctx.beginPath()
              ctx.moveTo(mx(hand[a].x), my(hand[a].y))
              ctx.lineTo(mx(hand[bn].x), my(hand[bn].y))
              ctx.stroke()
            }
            ctx.restore()

            // Fire from index fingertip only
            emitFire(mx(hand[INDEX_TIP].x), my(hand[INDEX_TIP].y))
          }
        }

        // Draw particles with additive blending
        ctx.globalCompositeOperation = 'lighter'
        const dt = 0.016
        particlesRef.current = particlesRef.current.filter(p => {
          p.life -= dt
          if (p.life <= 0) return false
          p.x += p.vx
          p.y += p.vy
          p.vy -= 0.04
          drawParticle(ctx, p, Math.max(0, p.life / p.maxLife))
          return true
        })
        ctx.globalCompositeOperation = 'source-over'
      }

      init()

      return () => {
        stopped = true
        isInitializedRef.current = false
        cancelAnimationFrame(animFrameRef.current)
        window.removeEventListener('resize', syncCanvasSize)

        const v = videoRef.current
        if (v?.srcObject) {
          ;(v.srcObject as MediaStream).getTracks().forEach(t => t.stop())
          v.srcObject = null
        }
        if (landmarkerRef.current) {
          landmarkerRef.current.close()
          landmarkerRef.current = null
        }
      }
    }, [])

    return (
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          overflow: 'hidden',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            zIndex: 0,
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      </div>
    )
  }
)

export default HandFireCanvas
