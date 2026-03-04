import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'

export interface AIPhotoCanvasRef {
  captureImage: () => Promise<string | null>
}

interface AIPhotoCanvasProps {
  onReady?: () => void
  onError?: (msg: string) => void
}

const AIPhotoCanvas = forwardRef<AIPhotoCanvasRef, AIPhotoCanvasProps>(
  function AIPhotoCanvas({ onReady, onError }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const isInitRef = useRef(false)

    // Capture current frame as base64 data URL
    const captureImage = useCallback(async (): Promise<string | null> => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return null

      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/jpeg', 0.9)
      } catch {
        return null
      }
    }, [])

    useImperativeHandle(ref, () => ({ captureImage }), [captureImage])

    useEffect(() => {
      if (isInitRef.current) return
      isInitRef.current = true

      const video = videoRef.current
      if (!video) return

      let stopped = false

      async function init() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          })

          if (stopped) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }

          ;(video as HTMLVideoElement).srcObject = stream
          await (video as HTMLVideoElement).play()
          onReady?.()
        } catch (err) {
          const msg =
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'กล้องไม่พร้อมใช้งาน กรุณาอนุญาตการเข้าถึงกล้อง'
              : 'ไม่สามารถเปิดกล้องได้ กรุณาลองใหม่อีกครั้ง'
          onError?.(msg)
        }
      }

      init()

      return () => {
        stopped = true
        const v = videoRef.current
        if (v?.srcObject) {
          ;(v.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
          v.srcObject = null
        }
      }
    }, [onError, onReady])

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
      </div>
    )
  },
)

export default AIPhotoCanvas
