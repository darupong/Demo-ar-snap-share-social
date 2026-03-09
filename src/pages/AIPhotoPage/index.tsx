import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home,
  Camera,
  Info,
  Download,
  Share2,
  X,
  AlertCircle,
  Sparkles,
  Loader2,
  Gift,
  Video,
  ImageIcon,
} from 'lucide-react'
import AIPhotoCanvas, { type AIPhotoCanvasRef } from '@/components/AIPhotoCanvas'
import SpinWheelCoupon from '@/components/SpinWheelCoupon'
import { ROUTES } from '@/constants'
import AIPhotoInstructions from './components/AIPhotoInstructions'

const SHARE_TEXT = 'สร้างภาพศิลปะด้วย AI — ลองเล่นกันเลย! #siampiwat_demo #AIPhoto'
const VIDEO_POLL_INTERVAL_MS = 10_000

type Theme = 'man' | 'woman'

async function generateAIPhoto(
  imageBase64: string,
  theme: Theme,
): Promise<{ imageUrl: string; videoTaskId: string | null }> {
  const response = await fetch('/api/generate-ai-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, theme }),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `API Error: ${response.status}`)
  }
  const data = await response.json()
  if (!data.imageUrl) throw new Error('No image URL in response')
  return { imageUrl: data.imageUrl, videoTaskId: data.videoTaskId ?? null }
}

async function checkVideoStatus(taskId: string): Promise<{ status: string; videoUrl: string | null }> {
  const response = await fetch(`/api/get-video-status?taskId=${encodeURIComponent(taskId)}`)
  if (!response.ok) throw new Error(`Status API Error: ${response.status}`)
  return response.json()
}

function downloadFile(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  link.click()
}

export default function AIPhotoPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<AIPhotoCanvasRef>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string | null>(null)
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showSpinWheel, setShowSpinWheel] = useState(false)
  const [hasSpun, setHasSpun] = useState(false)

  const canNativeShare =
    typeof navigator.share === 'function' && typeof navigator.canShare === 'function'

  useEffect(() => {
    document.body.classList.add('ar-active')
    return () => document.body.classList.remove('ar-active')
  }, [])

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!videoTaskId || videoUrl) return

    setIsGeneratingVideo(true)

    const poll = async () => {
      try {
        const result = await checkVideoStatus(videoTaskId)
        if (result.status === 'succeeded' && result.videoUrl) {
          setVideoUrl(result.videoUrl)
          setIsGeneratingVideo(false)
          if (pollTimerRef.current) clearInterval(pollTimerRef.current)
        } else if (result.status === 'failed' || result.status === 'expired') {
          setIsGeneratingVideo(false)
          setErrorMsg('ไม่สามารถสร้าง Video ได้ กรุณาลองใหม่')
          setTimeout(() => setErrorMsg(null), 5000)
          if (pollTimerRef.current) clearInterval(pollTimerRef.current)
        }
      } catch {
        // retry silently
      }
    }

    poll()
    pollTimerRef.current = setInterval(poll, VIDEO_POLL_INTERVAL_MS)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [videoTaskId, videoUrl])

  const handleCapture = useCallback(async () => {
    if (!canvasRef.current || isCapturing) return
    setIsCapturing(true)
    try {
      const imageData = await canvasRef.current.captureImage()
      if (imageData) {
        setCapturedImage(imageData)
        setAiGeneratedImage(null)
        setVideoTaskId(null)
        setVideoUrl(null)
        setIsGeneratingVideo(false)
        await handleGenerateAI(imageData)
      } else {
        setErrorMsg('ไม่สามารถถ่ายภาพได้ กรุณาลองใหม่')
        setTimeout(() => setErrorMsg(null), 3000)
      }
    } finally {
      setIsCapturing(false)
    }
  }, [isCapturing])

  const handleGenerateAI = useCallback(async (imageData: string) => {
    setIsGenerating(true)
    setErrorMsg(null)
    try {
      const { imageUrl, videoTaskId: taskId } = await generateAIPhoto(imageData, selectedTheme ?? 'man')
      setAiGeneratedImage(imageUrl)
      if (taskId) setVideoTaskId(taskId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถสร้างภาพ AI ได้'
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(null), 5000)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const handleShare = useCallback(async () => {
    const url = videoUrl ?? aiGeneratedImage
    if (!url || isSharing) return
    setIsSharing(true)
    try {
      if (canNativeShare) {
        await navigator.share({ text: SHARE_TEXT, url })
      } else {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          '_blank',
          'noopener,noreferrer',
        )
      }
    } catch {
      // cancelled
    } finally {
      setIsSharing(false)
    }
  }, [videoUrl, aiGeneratedImage, isSharing, canNativeShare])

  const handleReset = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    setCapturedImage(null)
    setAiGeneratedImage(null)
    setVideoTaskId(null)
    setVideoUrl(null)
    setIsGeneratingVideo(false)
  }, [])

  const handleReady = useCallback(() => setIsLoading(false), [])
  const handleError = useCallback((msg: string) => {
    setErrorMsg(msg)
    setIsLoading(false)
  }, [])

  const isBusy = isCapturing || isGenerating
  const showResult = !!capturedImage && !isGenerating && !!aiGeneratedImage

  // Theme selection screen
  if (!selectedTheme) {
    return (
      <div className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col">
        {/* bg gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/60 via-black to-black pointer-events-none" />

        {/* home btn */}
        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME)}
          className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs text-gray-200 hover:bg-white/10 transition-colors"
        >
          <Home size={14} />
          <span>กลับหน้าแรก</span>
        </button>

        <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-20 gap-8">
          {/* Title */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40">
              <Sparkles size={14} className="text-purple-300" />
              <span className="text-xs text-purple-200">AI Photo + Video</span>
            </div>
            <h1 className="text-2xl font-bold text-white">เลือก Theme ของคุณ</h1>
            <p className="text-sm text-gray-400 max-w-xs">
              AI จะแต่งชุดตามธีมที่เลือกและสร้าง Video แฟนตาซีให้คุณ
            </p>
          </div>

          {/* Theme cards */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            {(
              [
                { key: 'man', label: 'Man', sub: 'ชุดธีมธรรมชาติ', img: '/images/man.jpeg' },
                { key: 'woman', label: 'Woman', sub: 'ชุดเดรสแฟนตาซี', img: '/images/woman.jpeg' },
              ] as const
            ).map(({ key, label, sub, img }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedTheme(key)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-white/10 hover:border-purple-400/70 transition-all duration-200 active:scale-95 focus:outline-none focus:border-purple-400"
              >
                {/* Theme image */}
                <div className="relative aspect-[9/16] w-full overflow-hidden bg-white/5">
                  <img
                    src={img}
                    alt={label}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </div>
                {/* Label */}
                <div className="absolute bottom-0 inset-x-0 px-3 py-3 text-left">
                  <p className="text-white font-semibold text-sm leading-tight">{label}</p>
                  <p className="text-gray-300 text-xs">{sub}</p>
                </div>
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl ring-2 ring-purple-400/0 group-hover:ring-purple-400/60 transition-all duration-200 pointer-events-none" />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Top-left: home */}
      <button
        type="button"
        onClick={() => navigate(ROUTES.HOME)}
        className="fixed top-4 left-4 z-30 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs text-gray-200 hover:bg-white/10 transition-colors"
      >
        <Home size={14} />
        <span>กลับหน้าแรก</span>
      </button>

      {/* Top-right: instructions */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedTheme(null)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs text-gray-200 hover:bg-white/10 transition-colors"
        >
          <X size={13} />
          <span>เปลี่ยน Theme</span>
        </button>
        <button
          type="button"
          onClick={() => setShowInstructions(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-purple-400/60 text-xs text-purple-100 hover:bg-purple-500/10 transition-colors"
        >
          <Info size={14} />
          <span>วิธีเล่น</span>
        </button>
      </div>

      {/* Camera view */}
      {!capturedImage && (
        <>
          <div className="absolute top-16 inset-x-0 z-10 flex flex-col items-center px-4 gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-purple-500/40 backdrop-blur">
              <Sparkles size={14} className="text-purple-300" />
              <span className="text-xs text-gray-100">AI Photo + Video Generation</span>
              <span className="text-xs font-semibold text-purple-300 capitalize border-l border-white/20 pl-2">
                {selectedTheme}
              </span>
            </div>
            <p className="text-xs text-gray-300 text-center max-w-md">
              ถ่ายรูปตัวเองแล้วให้ AI แปลงเป็นภาพและ Video ธีมธรรมชาติแฟนตาซี
            </p>
          </div>
          <AIPhotoCanvas ref={canvasRef} onReady={handleReady} onError={handleError} />
        </>
      )}

      {/* Step 1: Generating AI image */}
      {capturedImage && isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-10">
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <Loader2 size={48} className="text-purple-400 animate-spin" />
            <p className="text-white text-lg font-semibold">กำลังสร้างภาพ AI...</p>
            <p className="text-gray-400 text-sm max-w-xs">
              AI กำลังแต่งชุดธีมธรรมชาติและวางคุณในฉากแฟนตาซี (10–30 วินาที)
            </p>
            <div className="flex gap-1.5 mt-1">
              {[0, 0.2, 0.4].map((d) => (
                <div
                  key={d}
                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${d}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2 & 3: Result page — image + video cards */}
      {showResult && (
        <div className="absolute inset-0 bg-black z-10 overflow-y-auto">
          {/* Sticky header */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-purple-300" />
              <span className="text-sm font-medium text-white">ผลลัพธ์ AI ของคุณ</span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Two cards: responsive grid */}
          <div className="px-4 pt-4 pb-32 grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">

            {/* Card 1: AI Photo */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-purple-300" />
                <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">AI Photo</span>
              </div>
              <div
                className="relative rounded-2xl overflow-hidden border border-purple-500/30 shadow-lg shadow-purple-500/10 bg-white/5"
                style={{ aspectRatio: '9/16' }}
              >
                <img
                  src={aiGeneratedImage}
                  alt="AI Generated Photo"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => downloadFile(aiGeneratedImage!, `ai-photo-${Date.now()}.png`)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 border border-purple-400/40 text-white text-sm font-medium transition-colors"
              >
                <Download size={15} />
                ดาวน์โหลดรูปภาพ
              </button>
            </div>

            {/* Card 2: AI Video */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Video size={14} className="text-pink-300" />
                <span className="text-xs font-semibold text-pink-300 uppercase tracking-wider">AI Video</span>
                {isGeneratingVideo && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-pink-400 bg-pink-500/10 border border-pink-500/20 rounded-full px-2 py-0.5">
                    <Loader2 size={10} className="animate-spin" />
                    กำลัง render...
                  </span>
                )}
              </div>
              <div
                className="relative rounded-2xl overflow-hidden border border-pink-500/30 shadow-lg shadow-pink-500/10 bg-white/5"
                style={{ aspectRatio: '9/16' }}
              >
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    autoPlay
                    loop
                    playsInline
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : isGeneratingVideo ? (
                  /* Loading skeleton */
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-pink-500/30 flex items-center justify-center">
                        <Video size={28} className="text-pink-400 animate-pulse" />
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-pink-400 border-t-transparent animate-spin" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-white text-sm font-medium">กำลัง render Video AI...</p>
                      <p className="text-gray-400 text-xs">ใช้เวลาประมาณ 1–3 นาที</p>
                    </div>
                    <div className="w-full max-w-[140px] bg-white/10 rounded-full h-1 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 0.15, 0.3].map((d) => (
                        <div
                          key={d}
                          className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${d}s` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  /* No video task or failed */
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Video size={32} className="text-gray-600" />
                    <p className="text-gray-500 text-xs">ไม่มีข้อมูล Video</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => videoUrl && downloadFile(videoUrl, `ai-video-${Date.now()}.mp4`)}
                disabled={!videoUrl}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-pink-600/80 hover:bg-pink-600 border border-pink-400/40 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download size={15} />
                {videoUrl ? 'ดาวน์โหลด Video' : isGeneratingVideo ? 'รอ Video พร้อม...' : 'ไม่มี Video'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 pb-8 pt-4 px-6 z-20 pointer-events-none">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          {/* Status */}
          <div className="flex flex-col gap-1.5 pointer-events-auto">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/70 border border-white/10">
              <Camera size={14} className="text-purple-300" />
              <span className="text-[11px] text-gray-200">AI Photo</span>
            </div>
            <div className="min-h-[28px]">
              {errorMsg ? (
                <div className="flex items-start gap-1.5 text-xs text-red-300 bg-red-900/40 border border-red-500/40 rounded-lg px-2 py-1.5 max-w-[200px]">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              ) : isLoading ? (
                <p className="text-xs text-gray-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse inline-flex" />
                  กำลังเปิดกล้อง...
                </p>
              ) : isGenerating ? (
                <p className="text-xs text-purple-300 flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" />
                  สร้างภาพ AI...
                </p>
              ) : isGeneratingVideo ? (
                <p className="text-xs text-pink-300 flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" />
                  สร้าง Video AI...
                </p>
              ) : videoUrl ? (
                <p className="text-xs text-pink-300 font-medium">🎬 Video พร้อมแล้ว!</p>
              ) : aiGeneratedImage ? (
                <p className="text-xs text-green-300 font-medium">✓ ภาพ AI พร้อมแล้ว</p>
              ) : (
                <p className="text-xs text-gray-300">พร้อมถ่ายภาพ</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pointer-events-auto">
            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              disabled={!aiGeneratedImage || isSharing}
              className="w-10 h-10 rounded-full border border-purple-400/60 bg-black/60 flex items-center justify-center text-purple-300 hover:bg-purple-500/10 disabled:opacity-40 transition-colors"
            >
              <Share2 size={18} />
            </button>

            {/* Shutter */}
            <button
              type="button"
              onClick={handleCapture}
              disabled={isBusy}
              className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50 disabled:opacity-60 transition-transform active:scale-95"
            >
              {isBusy ? (
                <Loader2 size={24} className="text-white animate-spin" />
              ) : (
                <div className="w-12 h-12 rounded-full border-4 border-white/80 bg-white/20" />
              )}
            </button>

            {/* Spin wheel */}
            <button
              type="button"
              onClick={() => setShowSpinWheel(true)}
              disabled={!aiGeneratedImage || hasSpun}
              className="w-10 h-10 rounded-full border border-amber-400/60 bg-black/60 flex items-center justify-center text-amber-300 hover:bg-amber-500/10 disabled:opacity-40 transition-colors"
              title={hasSpun ? 'ใช้คูปองแล้ว' : 'สุ่มคูปอง'}
            >
              <Gift size={18} />
            </button>
          </div>
        </div>
      </div>

      {showInstructions && (
        <AIPhotoInstructions open={showInstructions} onClose={() => setShowInstructions(false)} />
      )}

      <SpinWheelCoupon
        open={showSpinWheel}
        onClose={() => setShowSpinWheel(false)}
        onSpun={() => setHasSpun(true)}
      />
    </div>
  )
}
