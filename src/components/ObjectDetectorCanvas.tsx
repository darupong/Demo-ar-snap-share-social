import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { FilesetResolver, ObjectDetector } from '@mediapipe/tasks-vision'

export interface ObjectDetectorCanvasRef {
  captureImage: () => Promise<string | null>
}

interface ObjectDetectorCanvasProps {
  onObjectsDetected?: (labels: string[]) => void
  onReady?: () => void
  onError?: (msg: string) => void
}

function isBodyRelatedLabel(label: string) {
  const lower = label.toLowerCase()
  const blocked = [
    'person',
    'people',
    'man',
    'woman',
    'boy',
    'girl',
    'human',
    'body',
    'face',
    'head',
    'hand',
    'arm',
    'leg',
    'foot',
    'feet',
    'shoulder',
    'torso',
    'mouth',
    'eye',
    'ear',
  ]
  return blocked.some((keyword) => lower.includes(keyword))
}

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

const ObjectDetectorCanvas = forwardRef<ObjectDetectorCanvasRef, ObjectDetectorCanvasProps>(
  function ObjectDetectorCanvas({ onObjectsDetected, onReady, onError }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const detectorRef = useRef<ObjectDetector | null>(null)
    const animRef = useRef<number>(0)
    const lastVideoTimeRef = useRef<number>(-1)
    const lastDetectTsRef = useRef<number>(0)
    const isInitRef = useRef(false)

    // Capture current frame with overlay as PNG data URL
    const captureImage = useCallback(async (): Promise<string | null> => {
      const video = videoRef.current
      const overlay = canvasRef.current
      if (!video || !overlay) return null

      try {
        const w = window.innerWidth
        const h = window.innerHeight
        const off = document.createElement('canvas')
        off.width = w
        off.height = h
        const ctx = off.getContext('2d')
        if (!ctx) return null

        const { displayW, displayH, offsetX, offsetY } = getCoverTransform(
          video.videoWidth || w,
          video.videoHeight || h,
          w,
          h,
        )

        ctx.drawImage(video, offsetX, offsetY, displayW, displayH)
        ctx.drawImage(overlay, 0, 0, w, h)

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
            video: {
              facingMode: 'environment',
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          })

          if (stopped) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }

          ;(video as HTMLVideoElement).srcObject = stream
          await (video as HTMLVideoElement).play()

          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
          )

          if (stopped) return

          const detector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            maxResults: 3,
            scoreThreshold: 0.4,
          })

          if (stopped) {
            detector.close()
            return
          }

          detectorRef.current = detector
          onReady?.()
          renderLoop()
        } catch (err) {
          const msg =
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'กล้องไม่พร้อมใช้งาน กรุณาอนุญาตการเข้าถึงกล้อง'
              : 'โหลด Object Detector ไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ต แล้วลองรีเฟรชหน้าอีกครั้ง'
          onError?.(msg)
        }
      }

      function renderLoop() {
        animRef.current = requestAnimationFrame(renderLoop)

        const video = videoRef.current
        const canvas = canvasRef.current
        const detector = detectorRef.current
        if (!video || !canvas || video.readyState < 2 || !detector) return

        if (video.currentTime === lastVideoTimeRef.current) return
        lastVideoTimeRef.current = video.currentTime

        const now = performance.now()
        // Limit heavy detection work to ~10 FPS to keep things light
        if (now - lastDetectTsRef.current < 100) return
        lastDetectTsRef.current = now

        const W = canvas.width
        const H = canvas.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, W, H)

        const videoW = video.videoWidth || W
        const videoH = video.videoHeight || H
        const { displayW, displayH, offsetX, offsetY } = getCoverTransform(videoW, videoH, W, H)

        // Draw video frame (not mirrored to keep boxes aligned)
        ctx.drawImage(video, offsetX, offsetY, displayW, displayH)

        const result = detector.detectForVideo(video, now) as any
        const detections = (result?.detections as any[]) || []

        const labels: string[] = []

        const scaleX = displayW / videoW
        const scaleY = displayH / videoH

        detections.forEach((det) => {
          const categories = (det.categories as any[]) || []
          if (!categories.length) return

          const best = categories[0]
          const label: string = best.displayName || best.categoryName || 'object'
          const score: number = best.score ?? 0

          if (isBodyRelatedLabel(label)) {
            return
          }

          const bbox = det.boundingBox as {
            originX: number
            originY: number
            width: number
            height: number
          }

          const x = offsetX + bbox.originX * scaleX
          const y = offsetY + bbox.originY * scaleY
          const w = bbox.width * scaleX
          const h = bbox.height * scaleY

          // Draw bounding box
          ctx.lineWidth = 3
          ctx.strokeStyle = 'rgba(56, 189, 248, 1)'
          ctx.strokeRect(x, y, w, h)

          // Draw label background
          const text = `${label} ${(score * 100).toFixed(0)}%`
          ctx.font = '13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
          const textWidth = ctx.measureText(text).width
          const paddingX = 6
          const paddingY = 4
          const labelX = x
          const labelY = Math.max(y - 20, 0)

          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
          ctx.fillRect(labelX, labelY, textWidth + paddingX * 2, 20)

          ctx.fillStyle = 'rgba(248, 250, 252, 1)'
          ctx.fillText(text, labelX + paddingX, labelY + 14)

          labels.push(label)
        })

        if (onObjectsDetected) onObjectsDetected(Array.from(new Set(labels)))
      }

      init()

      return () => {
        stopped = true
        cancelAnimationFrame(animRef.current)
        window.removeEventListener('resize', syncSize)

        const v = videoRef.current
        if (v?.srcObject) {
          ;(v.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
          v.srcObject = null
        }

        detectorRef.current?.close()
        detectorRef.current = null
      }
    }, [onError, onReady, onObjectsDetected])

    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
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
            zIndex: 0,
          }}
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

export default ObjectDetectorCanvas

