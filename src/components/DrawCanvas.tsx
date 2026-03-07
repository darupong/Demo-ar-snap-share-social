import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

export interface DrawCanvasRef {
  captureImage: () => Promise<string | null>
  clearCanvas: () => void
}

interface DrawCanvasProps {
  color?: string
  brushSize?: number
  onReady?: () => void
  onError?: (msg: string) => void
  onHandDetected?: (detected: boolean) => void
}

interface Point {
  x: number
  y: number
  color: string
  size: number
}

// Index finger tip = 8, index MCP = 5, thumb tip = 4
const INDEX_TIP = 8
const INDEX_MCP = 5
const THUMB_TIP = 4

function coverTransform(vW: number, vH: number, sW: number, sH: number) {
  const vr = vW / vH
  const sr = sW / sH
  const dW = vr > sr ? sH * vr : sW
  const dH = vr > sr ? sH : sW / vr
  return { dW, dH, ox: (sW - dW) / 2, oy: (sH - dH) / 2 }
}

function dist(
  ax: number, ay: number,
  bx: number, by: number,
) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)
}

const DrawCanvas = forwardRef<DrawCanvasRef, DrawCanvasProps>(
  function DrawCanvas(
    { color = '#22d3ee', brushSize = 5, onReady, onError, onHandDetected },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null) // clears each frame (cursor)
    const drawCanvasRef = useRef<HTMLCanvasElement>(null)    // persistent strokes

    const detectorRef = useRef<HandLandmarker | null>(null)
    const animRef = useRef<number>(0)
    const lastTimeRef = useRef<number>(-1)
    const isInitRef = useRef(false)

    // Drawing state
    const strokesRef = useRef<Point[][]>([])        // completed strokes
    const currentStrokeRef = useRef<Point[]>([])    // stroke being drawn
    const prevTipRef = useRef<{ x: number; y: number } | null>(null)
    const isDrawingRef = useRef(false)

    // Latest props via refs (effect runs once)
    const colorRef = useRef(color)
    const brushRef = useRef(brushSize)
    useEffect(() => { colorRef.current = color }, [color])
    useEffect(() => { brushRef.current = brushSize }, [brushSize])

    const onReadyRef = useRef(onReady)
    const onErrorRef = useRef(onError)
    const onHandRef = useRef(onHandDetected)
    useEffect(() => { onReadyRef.current = onReady }, [onReady])
    useEffect(() => { onErrorRef.current = onError }, [onError])
    useEffect(() => { onHandRef.current = onHandDetected }, [onHandDetected])

    // Redraw all stored strokes onto the draw canvas
    function redrawStrokes() {
      const canvas = drawCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const all = [...strokesRef.current, currentStrokeRef.current]
      for (const stroke of all) {
        if (stroke.length < 2) continue
        ctx.lineWidth = stroke[0].size
        ctx.strokeStyle = stroke[0].color
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.shadowColor = stroke[0].color
        ctx.shadowBlur = stroke[0].size * 2
        ctx.beginPath()
        ctx.moveTo(stroke[0].x, stroke[0].y)
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y)
        }
        ctx.stroke()
      }
      ctx.shadowBlur = 0
    }

    const clearCanvas = useCallback(() => {
      strokesRef.current = []
      currentStrokeRef.current = []
      prevTipRef.current = null
      const canvas = drawCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }, [])

    const captureImage = useCallback(async (): Promise<string | null> => {
      const video = videoRef.current
      const overlay = overlayCanvasRef.current
      const drawing = drawCanvasRef.current
      if (!video || !overlay || !drawing) return null
      try {
        const W = overlay.width
        const H = overlay.height
        const off = document.createElement('canvas')
        off.width = W
        off.height = H
        const ctx = off.getContext('2d')
        if (!ctx) return null

        const vW = video.videoWidth || W
        const vH = video.videoHeight || H
        const { dW, dH, ox, oy } = coverTransform(vW, vH, W, H)

        // Mirrored video
        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(video, -(ox + dW), oy, dW, dH)
        ctx.restore()

        // Strokes
        ctx.drawImage(drawing, 0, 0)

        return off.toDataURL('image/png', 0.95)
      } catch {
        return null
      }
    }, [])

    useImperativeHandle(ref, () => ({ captureImage, clearCanvas }), [captureImage, clearCanvas])

    useEffect(() => {
      if (isInitRef.current) return
      isInitRef.current = true

      const video = videoRef.current
      const overlay = overlayCanvasRef.current
      const drawing = drawCanvasRef.current
      if (!video || !overlay || !drawing) return

      let stopped = false

      function syncSize() {
        if (!overlay || !drawing) return
        const W = window.innerWidth
        const H = window.innerHeight
        overlay.width = W
        overlay.height = H
        // Preserve strokes on resize by re-setting draw canvas size and redrawing
        drawing.width = W
        drawing.height = H
        redrawStrokes()
      }
      syncSize()
      window.addEventListener('resize', syncSize)

      async function init() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          })
          if (stopped) { stream.getTracks().forEach(t => t.stop()); return }
          video!.srcObject = stream
          await video!.play()

          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
          )
          if (stopped) return

          const detector = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          })
          if (stopped) { detector.close(); return }

          detectorRef.current = detector
          onReadyRef.current?.()
          renderLoop()
        } catch (err) {
          const msg =
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'กล้องไม่พร้อมใช้งาน กรุณาอนุญาตการเข้าถึงกล้อง'
              : 'โหลด Hand Detector ไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ต แล้วลองรีเฟรชหน้าอีกครั้ง'
          onErrorRef.current?.(msg)
        }
      }

      function renderLoop() {
        animRef.current = requestAnimationFrame(renderLoop)

        const v = videoRef.current
        const ov = overlayCanvasRef.current
        const det = detectorRef.current
        if (!v || !ov || v.readyState < 2 || !det) return
        if (v.currentTime === lastTimeRef.current) return
        lastTimeRef.current = v.currentTime

        const W = ov.width
        const H = ov.height
        const ctx = ov.getContext('2d')
        if (!ctx) return

        // Clear overlay each frame (cursor only)
        ctx.clearRect(0, 0, W, H)

        const vW = v.videoWidth || W
        const vH = v.videoHeight || H
        const { dW, dH, ox, oy } = coverTransform(vW, vH, W, H)

        const result = det.detectForVideo(v, performance.now())
        const hasHand = result.landmarks.length > 0
        onHandRef.current?.(hasHand)

        if (!hasHand) {
          // Lift pen when hand leaves frame
          if (isDrawingRef.current && currentStrokeRef.current.length > 1) {
            strokesRef.current.push([...currentStrokeRef.current])
          }
          currentStrokeRef.current = []
          prevTipRef.current = null
          isDrawingRef.current = false
          return
        }

        const landmarks = result.landmarks[0]
        const indexTip = landmarks[INDEX_TIP]
        const indexMcp = landmarks[INDEX_MCP]
        const thumbTip = landmarks[THUMB_TIP]

        // Mirror x (front camera is mirrored visually)
        const tipX = W - (indexTip.x * dW + ox)
        const tipY = indexTip.y * dH + oy
        const mcpY = indexMcp.y * dH + oy

        const thumbX = W - (thumbTip.x * dW + ox)
        const thumbY = thumbTip.y * dH + oy

        // Pinch detection: thumb tip close to index tip → lift pen
        const pinchDist = dist(tipX, tipY, thumbX, thumbY)
        const pinchThreshold = dW * 0.07 // ~7% of display width
        const isPinched = pinchDist < pinchThreshold

        // Index extended: tip is above MCP (smaller y = higher on screen)
        const isIndexUp = tipY < mcpY - dH * 0.03

        const shouldDraw = isIndexUp && !isPinched

        // Draw cursor dot on overlay
        const cursorColor = isPinched ? '#fb7185' : (shouldDraw ? colorRef.current : 'rgba(255,255,255,0.7)')
        ctx.beginPath()
        ctx.arc(tipX, tipY, brushRef.current + 2, 0, Math.PI * 2)
        ctx.fillStyle = cursorColor
        ctx.shadowColor = cursorColor
        ctx.shadowBlur = 12
        ctx.fill()
        ctx.shadowBlur = 0

        // Pinch label
        if (isPinched) {
          ctx.font = '13px system-ui, sans-serif'
          ctx.fillStyle = 'rgba(251,113,133,0.9)'
          ctx.fillText('ยกปากกา', tipX + 14, tipY - 8)
        }

        if (!shouldDraw) {
          // Lift pen — save completed stroke
          if (isDrawingRef.current && currentStrokeRef.current.length > 1) {
            strokesRef.current.push([...currentStrokeRef.current])
          }
          currentStrokeRef.current = []
          prevTipRef.current = null
          isDrawingRef.current = false
          return
        }

        // Draw stroke
        const prev = prevTipRef.current
        if (prev) {
          const pt: Point = {
            x: tipX,
            y: tipY,
            color: colorRef.current,
            size: brushRef.current,
          }
          currentStrokeRef.current.push(pt)

          const drawCtx = drawCanvasRef.current?.getContext('2d')
          if (drawCtx) {
            drawCtx.lineWidth = brushRef.current
            drawCtx.strokeStyle = colorRef.current
            drawCtx.lineCap = 'round'
            drawCtx.lineJoin = 'round'
            drawCtx.shadowColor = colorRef.current
            drawCtx.shadowBlur = brushRef.current * 2
            drawCtx.beginPath()
            drawCtx.moveTo(prev.x, prev.y)
            drawCtx.lineTo(tipX, tipY)
            drawCtx.stroke()
            drawCtx.shadowBlur = 0
          }
        } else {
          currentStrokeRef.current = [{
            x: tipX,
            y: tipY,
            color: colorRef.current,
            size: brushRef.current,
          }]
        }

        prevTipRef.current = { x: tipX, y: tipY }
        isDrawingRef.current = true
      }

      init()

      return () => {
        stopped = true
        cancelAnimationFrame(animRef.current)
        window.removeEventListener('resize', syncSize)
        const v = videoRef.current
        if (v?.srcObject) {
          ;(v.srcObject as MediaStream).getTracks().forEach(t => t.stop())
          v.srcObject = null
        }
        detectorRef.current?.close()
        detectorRef.current = null
      }
    }, [])

    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* Mirrored camera background */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            zIndex: 0,
          }}
        />
        {/* Persistent strokes layer */}
        <canvas
          ref={drawCanvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        {/* Cursor / hand indicator layer (clears each frame) */}
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      </div>
    )
  },
)

export default DrawCanvas
