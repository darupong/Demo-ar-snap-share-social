import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { FilesetResolver, ImageClassifier } from '@mediapipe/tasks-vision'

export interface ObjectDetectCanvasRef {
  captureImage: () => Promise<string | null>
}

interface ObjectDetectCanvasProps {
  onObjectsDetected?: (labels: string[]) => void
  onReady?: () => void
  onError?: (msg: string) => void
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

const ObjectDetectCanvas = forwardRef<ObjectDetectCanvasRef, ObjectDetectCanvasProps>(
  function ObjectDetectCanvas({ onObjectsDetected, onReady, onError }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const classifierRef = useRef<ImageClassifier | null>(null)
    const animRef = useRef<number>(0)
    const lastTimeRef = useRef<number>(-1)
    const isInitRef = useRef(false)

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
        const ctx = off.getContext('2d')!
        const { displayW, displayH, offsetX, offsetY } = getCoverTransform(
          video.videoWidth || w,
          video.videoHeight || h,
          w,
          h,
        )
        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(video, -(offsetX + displayW), offsetY, displayW, displayH)
        ctx.restore()
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
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
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

          const classifier = await ImageClassifier.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-tasks/image_classifier/efficientnet_lite0_uint8.tflite',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            maxResults: 3,
            scoreThreshold: 0.3,
          })
          if (stopped) {
            classifier.close()
            return
          }

          classifierRef.current = classifier
          onReady?.()
          renderLoop()
        } catch (err) {
          const msg =
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'กล้องไม่พร้อมใช้งาน กรุณาอนุญาตการเข้าถึงกล้อง'
              : 'โหลด Image Classifier ไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ต แล้วลองรีเฟรชหน้าอีกครั้ง'
          onError?.(msg)
        }
      }

      function renderLoop() {
        animRef.current = requestAnimationFrame(renderLoop)
        const video = videoRef.current
        const canvas = canvasRef.current
        const classifier = classifierRef.current
        if (!video || !canvas || video.readyState < 2 || !classifier) return
        if (video.currentTime === lastTimeRef.current) return
        lastTimeRef.current = video.currentTime

        const W = canvas.width
        const H = canvas.height
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, W, H)

        const { displayW, displayH, offsetX, offsetY } = getCoverTransform(
          video.videoWidth || W,
          video.videoHeight || H,
          W,
          H,
        )

        const result = classifier.classifyForVideo(video, performance.now()) as any
        const classifications = (result?.classifications as any[]) || []
        const labels: string[] = []

        ctx.save()
        ctx.scale(-1, 1)
        ctx.translate(-W, 0)

        if (classifications.length > 0) {
          const cats = (classifications[0].categories as any[]) || []
          const topCats = cats.slice(0, 3)
          let y = offsetY + 28

          topCats.forEach((cat) => {
            const label: string = cat.displayName || cat.categoryName || 'object'
            const score: number = cat.score ?? 0
            labels.push(label)

            const text = `${label} ${(score * 100).toFixed(0)}%`
            const paddingX = 12
            ctx.font = '13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
            const textWidth = ctx.measureText(text).width
            const x = offsetX + 12

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
            ctx.fillRect(x, y - 18, textWidth + paddingX * 2, 22)
            ctx.fillStyle = 'rgba(56, 189, 248, 1)'
            ctx.fillText(text, x + paddingX, y)
            y += 26
          })
        }

        ctx.restore()
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
        classifierRef.current?.close()
        classifierRef.current = null
      }
    }, [])

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
            transform: 'scaleX(-1)',
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

export default ObjectDetectCanvas

