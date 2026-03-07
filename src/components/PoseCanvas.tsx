import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export interface PoseCanvasRef {
  captureImage: () => Promise<string | null>
}

interface PoseCanvasProps {
  onReady?: () => void
  onError?: (msg: string) => void
  onPoseDetected?: (detected: boolean) => void
  facingMode?: 'user' | 'environment'
}

// MediaPipe Pose 33-landmark connections
const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [11, 12],
  [11, 13], [13, 15], [15, 17], [17, 19], [19, 15], [15, 21],
  [12, 14], [14, 16], [16, 18], [18, 20], [20, 16], [16, 22],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
]

// Left side = cyan, right side = violet, face/center = rose
const LEFT_IDS = new Set([11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31])
const RIGHT_IDS = new Set([12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32])

function dotColor(idx: number) {
  if (LEFT_IDS.has(idx)) return '#22d3ee'
  if (RIGHT_IDS.has(idx)) return '#a78bfa'
  return '#fb7185'
}

function lineColor(i: number, j: number) {
  if (LEFT_IDS.has(i) && LEFT_IDS.has(j)) return 'rgba(34,211,238,0.85)'
  if (RIGHT_IDS.has(i) && RIGHT_IDS.has(j)) return 'rgba(167,139,250,0.85)'
  if (i <= 10 || j <= 10) return 'rgba(251,113,133,0.6)'
  return 'rgba(255,255,255,0.55)'
}

function coverTransform(vW: number, vH: number, sW: number, sH: number) {
  const vr = vW / vH
  const sr = sW / sH
  const dW = vr > sr ? sH * vr : sW
  const dH = vr > sr ? sH : sW / vr
  return { dW, dH, ox: (sW - dW) / 2, oy: (sH - dH) / 2 }
}

const PoseCanvas = forwardRef<PoseCanvasRef, PoseCanvasProps>(
  function PoseCanvas({ onReady, onError, onPoseDetected, facingMode = 'user' }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const detectorRef = useRef<PoseLandmarker | null>(null)
    const animRef = useRef<number>(0)
    const lastTimeRef = useRef<number>(-1)
    const isInitRef = useRef(false)

    const onReadyRef = useRef(onReady)
    const onErrorRef = useRef(onError)
    const onPoseRef = useRef(onPoseDetected)
    useEffect(() => { onReadyRef.current = onReady }, [onReady])
    useEffect(() => { onErrorRef.current = onError }, [onError])
    useEffect(() => { onPoseRef.current = onPoseDetected }, [onPoseDetected])

    const captureImage = useCallback(async (): Promise<string | null> => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return null
      try {
        const off = document.createElement('canvas')
        off.width = canvas.width
        off.height = canvas.height
        const ctx = off.getContext('2d')
        if (!ctx) return null
        ctx.drawImage(canvas, 0, 0)
        return off.toDataURL('image/png', 0.95)
      } catch {
        return null
      }
    }, [])

    useImperativeHandle(ref, () => ({ captureImage }), [captureImage])

    useEffect(() => {
      if (isInitRef.current) return
      isInitRef.current = true

      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      let stopped = false
      const mirrored = facingMode === 'user'

      function syncSize() {
        if (!canvas) return
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
      syncSize()
      window.addEventListener('resize', syncSize)

      async function init() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          })
          if (stopped) { stream.getTracks().forEach(t => t.stop()); return }
          video!.srcObject = stream
          await video!.play()

          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
          )
          if (stopped) return

          const detector = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-tasks/pose_landmarker/pose_landmarker_lite.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
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
              : 'โหลด Pose Detector ไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ต แล้วลองรีเฟรชหน้าอีกครั้ง'
          onErrorRef.current?.(msg)
        }
      }

      function drawSkeleton(
        ctx: CanvasRenderingContext2D,
        landmarks: NormalizedLandmark[],
        W: number,
        H: number,
        dW: number,
        dH: number,
        ox: number,
        oy: number,
      ) {
        function toXY(lm: NormalizedLandmark) {
          const rx = lm.x * dW + ox
          const y = lm.y * dH + oy
          return { x: mirrored ? W - rx : rx, y }
        }

        // connections
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        for (const [i, j] of CONNECTIONS) {
          const li = landmarks[i]
          const lj = landmarks[j]
          if (!li || !lj) continue
          if ((li.visibility ?? 1) < 0.3 || (lj.visibility ?? 1) < 0.3) continue
          const pi = toXY(li)
          const pj = toXY(lj)
          const col = lineColor(i, j)
          ctx.strokeStyle = col
          ctx.shadowColor = col
          ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.moveTo(pi.x, pi.y)
          ctx.lineTo(pj.x, pj.y)
          ctx.stroke()
        }

        // landmark dots
        ctx.shadowBlur = 14
        for (let idx = 0; idx < landmarks.length; idx++) {
          const lm = landmarks[idx]
          if (!lm || (lm.visibility ?? 1) < 0.3) continue
          const { x, y } = toXY(lm)
          const col = dotColor(idx)
          ctx.fillStyle = col
          ctx.shadowColor = col
          ctx.beginPath()
          ctx.arc(x, y, idx <= 10 ? 3 : 5, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.shadowBlur = 0
      }

      function renderLoop() {
        animRef.current = requestAnimationFrame(renderLoop)

        const v = videoRef.current
        const c = canvasRef.current
        const det = detectorRef.current
        if (!v || !c || v.readyState < 2 || !det) return
        if (v.currentTime === lastTimeRef.current) return
        lastTimeRef.current = v.currentTime

        const W = c.width
        const H = c.height
        const ctx = c.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, W, H)

        const vW = v.videoWidth || W
        const vH = v.videoHeight || H
        const { dW, dH, ox, oy } = coverTransform(vW, vH, W, H)

        // Draw video (mirrored for front camera)
        if (mirrored) {
          ctx.save()
          ctx.scale(-1, 1)
          ctx.drawImage(v, -(ox + dW), oy, dW, dH)
          ctx.restore()
        } else {
          ctx.drawImage(v, ox, oy, dW, dH)
        }

        const result = det.detectForVideo(v, performance.now())
        const hasPose = result.landmarks.length > 0
        onPoseRef.current?.(hasPose)

        for (const landmarks of result.landmarks) {
          drawSkeleton(ctx, landmarks, W, H, dW, dH, ox, oy)
        }
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
        {/* Video acts as source for ctx.drawImage; canvas renders everything */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      </div>
    )
  },
)

export default PoseCanvas
