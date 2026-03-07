import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'

export interface GestureCanvasRef {
  captureImage: () => Promise<string | null>
}

interface GestureCanvasProps {
  onReady?: () => void
  onError?: (msg: string) => void
  onGestureDetected?: (gesture: string | null) => void
}

interface GestureInfo {
  emoji: string
  label: string
  color: string
}

const GESTURE_MAP: Record<string, GestureInfo> = {
  Thumb_Up:    { emoji: '👍', label: 'เยี่ยมมาก!',  color: '#fbbf24' },
  Thumb_Down:  { emoji: '👎', label: 'ไม่โอเค!',    color: '#ef4444' },
  Victory:     { emoji: '✌️', label: 'Peace!',       color: '#22d3ee' },
  ILoveYou:    { emoji: '🤟', label: 'Love You!',    color: '#fb7185' },
  Open_Palm:   { emoji: '🖐️', label: 'หยุด!',       color: '#a78bfa' },
  Pointing_Up: { emoji: '☝️', label: 'อันดับ 1!',   color: '#f97316' },
  Closed_Fist: { emoji: '👊', label: 'แน่มาก!',     color: '#34d399' },
}

const HAND_CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]

function coverTransform(vW: number, vH: number, sW: number, sH: number) {
  const vr = vW / vH
  const sr = sW / sH
  const dW = vr > sr ? sH * vr : sW
  const dH = vr > sr ? sH : sW / vr
  return { dW, dH, ox: (sW - dW) / 2, oy: (sH - dH) / 2 }
}

const GestureCanvas = forwardRef<GestureCanvasRef, GestureCanvasProps>(
  function GestureCanvas({ onReady, onError, onGestureDetected }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const recognizerRef = useRef<GestureRecognizer | null>(null)
    const animRef = useRef<number>(0)
    const lastTimeRef = useRef<number>(-1)
    const isInitRef = useRef(false)

    // Animation state — updated imperatively each frame, no React re-renders
    const emojiScaleRef = useRef(0)
    const currentGestureRef = useRef<string | null>(null)
    const gestureStartRef = useRef(0)
    const comboRef = useRef(1)

    const onReadyRef = useRef(onReady)
    const onErrorRef = useRef(onError)
    const onGestureRef = useRef(onGestureDetected)
    useEffect(() => { onReadyRef.current = onReady }, [onReady])
    useEffect(() => { onErrorRef.current = onError }, [onError])
    useEffect(() => { onGestureRef.current = onGestureDetected }, [onGestureDetected])

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

          const recognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
          })
          if (stopped) { recognizer.close(); return }

          recognizerRef.current = recognizer
          onReadyRef.current?.()
          renderLoop()
        } catch (err) {
          const msg =
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'กล้องไม่พร้อมใช้งาน กรุณาอนุญาตการเข้าถึงกล้อง'
              : 'โหลด Gesture Recognizer ไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ต แล้วลองรีเฟรช'
          onErrorRef.current?.(msg)
        }
      }

      function renderLoop() {
        animRef.current = requestAnimationFrame(renderLoop)

        const v = videoRef.current
        const c = canvasRef.current
        const rec = recognizerRef.current
        if (!v || !c || v.readyState < 2 || !rec) return
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

        // Draw mirrored video
        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(v, -(ox + dW), oy, dW, dH)
        ctx.restore()

        // Detect gesture
        const now = performance.now()
        const result = rec.recognizeForVideo(v, now)
        const topCategory = result.gestures[0]?.[0]?.categoryName ?? null
        const gestureInfo = topCategory && topCategory !== 'None' ? GESTURE_MAP[topCategory] : null

        // Update combo timer
        if (gestureInfo && topCategory) {
          if (topCategory === currentGestureRef.current) {
            comboRef.current = Math.floor((now - gestureStartRef.current) / 2000) + 1
          } else {
            currentGestureRef.current = topCategory
            gestureStartRef.current = now
            comboRef.current = 1
          }
        } else {
          currentGestureRef.current = null
        }

        onGestureRef.current?.(gestureInfo ? topCategory : null)

        // Animate emoji scale (lerp toward target)
        const targetScale = gestureInfo ? 1.0 : 0
        emojiScaleRef.current += (targetScale - emojiScaleRef.current) * 0.12
        const scale = emojiScaleRef.current

        // Draw hand landmarks (for all detected hands)
        for (let h = 0; h < result.landmarks.length; h++) {
          const hand = result.landmarks[h]
          const handGesture = result.gestures[h]?.[0]?.categoryName ?? ''
          const dotColor = GESTURE_MAP[handGesture]?.color ?? '#ffffff'

          // Connections
          ctx.lineWidth = 2
          ctx.strokeStyle = 'rgba(255,255,255,0.35)'
          ctx.shadowBlur = 0
          for (const [i, j] of HAND_CONNECTIONS) {
            if (!hand[i] || !hand[j]) continue
            ctx.beginPath()
            ctx.moveTo(W - (hand[i].x * dW + ox), hand[i].y * dH + oy)
            ctx.lineTo(W - (hand[j].x * dW + ox), hand[j].y * dH + oy)
            ctx.stroke()
          }

          // Dots
          ctx.fillStyle = dotColor
          ctx.shadowColor = dotColor
          ctx.shadowBlur = 8
          for (const lm of hand) {
            ctx.beginPath()
            ctx.arc(W - (lm.x * dW + ox), lm.y * dH + oy, 4, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.shadowBlur = 0
        }

        // Draw animated emoji + label + combo
        if (scale > 0.01 && gestureInfo) {
          const cx = W / 2
          const cy = H * 0.28
          const pulse = comboRef.current > 1 ? 1 + Math.sin(now / 300) * 0.06 : 1
          const s = scale * pulse

          ctx.save()
          ctx.translate(cx, cy)
          ctx.scale(s, s)
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.shadowColor = gestureInfo.color
          ctx.shadowBlur = 30
          ctx.font = '100px sans-serif'
          ctx.fillText(gestureInfo.emoji, 0, 0)
          ctx.restore()

          // Label
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = gestureInfo.color
          ctx.shadowColor = gestureInfo.color
          ctx.shadowBlur = 12
          ctx.font = `bold ${Math.round(20 * scale)}px system-ui, sans-serif`
          ctx.fillText(gestureInfo.label, cx, cy + 58 * scale)

          // Combo badge
          if (comboRef.current > 1) {
            ctx.font = `bold ${Math.round(15 * scale)}px system-ui, sans-serif`
            ctx.fillStyle = '#ffffff'
            ctx.shadowColor = gestureInfo.color
            ctx.shadowBlur = 14
            ctx.fillText(`✕${comboRef.current} COMBO!`, cx, cy + 84 * scale)
          }

          ctx.shadowBlur = 0
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
        recognizerRef.current?.close()
        recognizerRef.current = null
      }
    }, [])

    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
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

export default GestureCanvas
