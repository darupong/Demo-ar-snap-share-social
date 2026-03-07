import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'

export interface SplashCanvasRef {
  captureImage: () => Promise<string | null>
}

export type SplashMode = 'splash' | 'silhouette'

interface SplashCanvasProps {
  mode?: SplashMode
  onReady?: () => void
  onError?: (msg: string) => void
}

function coverTransform(vW: number, vH: number, sW: number, sH: number) {
  const vr = vW / vH
  const sr = sW / sH
  const dW = vr > sr ? sH * vr : sW
  const dH = vr > sr ? sH : sW / vr
  return { dW, dH, ox: (sW - dW) / 2, oy: (sH - dH) / 2 }
}

const SplashCanvas = forwardRef<SplashCanvasRef, SplashCanvasProps>(
  function SplashCanvas({ mode = 'splash', onReady, onError }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Offscreen canvas for CPU pixel processing (reused across frames)
    const offRef = useRef<HTMLCanvasElement | null>(null)

    const segmenterRef = useRef<ImageSegmenter | null>(null)
    const animRef = useRef<number>(0)
    const lastTimeRef = useRef<number>(-1)
    const lastSegTsRef = useRef<number>(0)

    const isInitRef = useRef(false)
    const modeRef = useRef(mode)
    useEffect(() => { modeRef.current = mode }, [mode])

    const onReadyRef = useRef(onReady)
    const onErrorRef = useRef(onError)
    useEffect(() => { onReadyRef.current = onReady }, [onReady])
    useEffect(() => { onErrorRef.current = onError }, [onError])

    const captureImage = useCallback(async (): Promise<string | null> => {
      const canvas = canvasRef.current
      if (!canvas) return null
      try {
        const off = document.createElement('canvas')
        off.width = canvas.width
        off.height = canvas.height
        off.getContext('2d')?.drawImage(canvas, 0, 0)
        return off.toDataURL('image/png', 0.95)
      } catch { return null }
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

          const segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          })
          if (stopped) { segmenter.close(); return }

          segmenterRef.current = segmenter
          onReadyRef.current?.()
          renderLoop()
        } catch (err) {
          const msg =
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'กล้องไม่พร้อมใช้งาน กรุณาอนุญาตการเข้าถึงกล้อง'
              : 'โหลด Segmentation ไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ต แล้วลองรีเฟรช'
          onErrorRef.current?.(msg)
        }
      }

      function renderLoop() {
        animRef.current = requestAnimationFrame(renderLoop)

        const v = videoRef.current
        const c = canvasRef.current
        const seg = segmenterRef.current
        if (!v || !c || v.readyState < 2 || !seg) return
        if (v.currentTime === lastTimeRef.current) return
        lastTimeRef.current = v.currentTime

        const W = c.width
        const H = c.height
        const ctx = c.getContext('2d')
        if (!ctx) return

        const vW = v.videoWidth || W
        const vH = v.videoHeight || H
        const { dW, dH, ox, oy } = coverTransform(vW, vH, W, H)

        const now = performance.now()

        // Run CPU-heavy segmentation + pixel processing at ~12fps for mobile perf.
        // Offscreen canvas holds the processed result and is redrawn each frame.
        if (now - lastSegTsRef.current > 85) {
          lastSegTsRef.current = now

          // Reuse offscreen canvas (create once)
          if (!offRef.current) offRef.current = document.createElement('canvas')
          const off = offRef.current
          off.width = vW
          off.height = vH
          const offCtx = off.getContext('2d', { willReadFrequently: true })
          if (!offCtx) return

          // Draw raw (unmirrored) video for mask alignment
          offCtx.drawImage(v, 0, 0, vW, vH)

          const result = seg.segmentForVideo(v, now)
          const masks = result.confidenceMasks ?? []

          // Selfie segmenter may return:
          //   1 mask  → masks[0] = person confidence (high = person)
          //   2 masks → masks[0] = background, masks[1] = person confidence
          // isPersonMask: true → high confidence = person (keep color)
          //               false → high confidence = background (apply effect)
          let rawMask = masks.length >= 2 ? masks[1] : masks[0]
          const isPersonMask = masks.length >= 2 ? true : true // both cases: high = person

          if (rawMask) {
            const mask = rawMask.getAsFloat32Array()
            const mW = rawMask.width
            const mH = rawMask.height
            rawMask.close()

            const imageData = offCtx.getImageData(0, 0, vW, vH)
            const px = imageData.data

            for (let py2 = 0; py2 < vH; py2++) {
              for (let px2 = 0; px2 < vW; px2++) {
                const pi = (py2 * vW + px2) * 4
                const mx = Math.min(Math.floor(px2 * mW / vW), mW - 1)
                const my = Math.min(Math.floor(py2 * mH / vH), mH - 1)
                const confidence = mask[my * mW + mx]

                // isBackground: true when this pixel is background
                const isBackground = isPersonMask ? confidence < 0.5 : confidence >= 0.5

                if (isBackground) {
                  if (modeRef.current === 'splash') {
                    const gray = px[pi] * 0.299 + px[pi + 1] * 0.587 + px[pi + 2] * 0.114
                    px[pi] = gray; px[pi + 1] = gray; px[pi + 2] = gray
                  } else {
                    px[pi] = 0; px[pi + 1] = 0; px[pi + 2] = 0
                  }
                }
              }
            }

            offCtx.putImageData(imageData, 0, 0)
          }

          // Release remaining GPU-backed masks
          masks.forEach(m => { try { m.close() } catch { /* already closed */ } })
        }

        // Draw processed frame (or raw video before first segmentation) mirrored for selfie
        ctx.clearRect(0, 0, W, H)
        const src = offRef.current && offRef.current.width > 0 ? offRef.current : v

        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(src, -(ox + dW), oy, dW, dH)
        ctx.restore()
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
        segmenterRef.current?.close()
        segmenterRef.current = null
      }
    }, [])

    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* Video element is hidden — canvas renders everything */}
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

export default SplashCanvas
