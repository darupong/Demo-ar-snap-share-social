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
} from 'lucide-react'
import AIPhotoCanvas, { type AIPhotoCanvasRef } from '@/components/AIPhotoCanvas'
import { ROUTES } from '@/constants'
import AIPhotoInstructions from './components/AIPhotoInstructions'

const SHARE_TEXT = 'สร้างภาพศิลปะด้วย AI — ลองเล่นกันเลย! #demo #AIPhoto'
const DAILY_LIMIT_KEY = 'ai_photo_daily_limit'
const MAX_DAILY_USES = 1

interface DailyLimitData {
  date: string
  count: number
}

/** Check if user can generate AI photo today */
function checkDailyLimit(): { canUse: boolean; remainingUses: number } {
  const today = new Date().toLocaleDateString('th-TH')
  const stored = localStorage.getItem(DAILY_LIMIT_KEY)

  if (!stored) {
    return { canUse: true, remainingUses: MAX_DAILY_USES }
  }

  try {
    const data: DailyLimitData = JSON.parse(stored)
    
    // Reset count if it's a new day
    if (data.date !== today) {
      return { canUse: true, remainingUses: MAX_DAILY_USES }
    }

    // Check if limit exceeded
    if (data.count >= MAX_DAILY_USES) {
      return { canUse: false, remainingUses: 0 }
    }

    return { canUse: true, remainingUses: MAX_DAILY_USES - data.count }
  } catch {
    return { canUse: true, remainingUses: MAX_DAILY_USES }
  }
}

/** Increment daily usage count */
function incrementDailyUsage(): void {
  const today = new Date().toLocaleDateString('th-TH')
  const stored = localStorage.getItem(DAILY_LIMIT_KEY)

  let data: DailyLimitData = { date: today, count: 0 }

  if (stored) {
    try {
      const parsed: DailyLimitData = JSON.parse(stored)
      if (parsed.date === today) {
        data.count = parsed.count
      }
    } catch {
      // Reset if parse error
    }
  }

  data.count += 1
  localStorage.setItem(DAILY_LIMIT_KEY, JSON.stringify(data))
}

/** Generate AI photo via Vercel serverless function */
async function generateAIPhoto(imageBase64: string): Promise<string> {
  const response = await fetch('/api/generate-ai-photo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: imageBase64,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `API Error: ${response.status}`)
  }

  const data = await response.json()
  if (!data.imageUrl) {
    throw new Error('No image URL in response')
  }

  return data.imageUrl
}

/** Page for AI photo generation demo */
export default function AIPhotoPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<AIPhotoCanvasRef>(null)

  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [remainingUses, setRemainingUses] = useState(MAX_DAILY_USES)

  const canNativeShare =
    typeof navigator.share === 'function' && typeof navigator.canShare === 'function'

  useEffect(() => {
    document.body.classList.add('ar-active')
    // Check daily limit on mount
    const { remainingUses: remaining } = checkDailyLimit()
    setRemainingUses(remaining)
    return () => document.body.classList.remove('ar-active')
  }, [])

  const handleCapture = useCallback(async () => {
    if (!canvasRef.current || isCapturing) return

    // Check daily limit before capturing
    const { canUse } = checkDailyLimit()
    if (!canUse) {
      setErrorMsg('คุณใช้งานครบโควต้าวันนี้แล้ว (1 ครั้ง/วัน) กรุณากลับมาใช้งานใหม่พรุ่งนี้')
      setTimeout(() => setErrorMsg(null), 5000)
      return
    }

    setIsCapturing(true)
    try {
      const imageData = await canvasRef.current.captureImage()
      if (imageData) {
        setCapturedImage(imageData)
        setAiGeneratedImage(null)
        // Start AI generation immediately
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
      const aiImageUrl = await generateAIPhoto(imageData)
      setAiGeneratedImage(aiImageUrl)
      // Increment usage count after successful generation
      incrementDailyUsage()
      const { remainingUses: remaining } = checkDailyLimit()
      setRemainingUses(remaining)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถสร้างภาพ AI ได้'
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(null), 5000)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const handleDownload = useCallback(() => {
    if (!aiGeneratedImage) return
    const link = document.createElement('a')
    link.href = aiGeneratedImage
    link.download = `ai-photo-${Date.now()}.png`
    link.target = '_blank'
    link.click()
  }, [aiGeneratedImage])

  const handleShare = useCallback(async () => {
    if (!aiGeneratedImage || isSharing) return

    setIsSharing(true)
    try {
      if (canNativeShare) {
        await navigator.share({
          text: SHARE_TEXT,
          url: aiGeneratedImage,
        })
      } else {
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          aiGeneratedImage,
        )}`
        window.open(shareUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      // User cancelled share or error
    } finally {
      setIsSharing(false)
    }
  }, [aiGeneratedImage, isSharing, canNativeShare])

  const handleReady = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handleError = useCallback((msg: string) => {
    setErrorMsg(msg)
    setIsLoading(false)
  }, [])

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <button
        type="button"
        onClick={() => navigate(ROUTES.HOME)}
        className="fixed top-4 left-4 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs text-gray-200 hover:bg-white/10 transition-colors"
      >
        <Home size={14} />
        <span>กลับหน้าแรก</span>
      </button>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowInstructions(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-purple-400/60 text-xs text-purple-100 hover:bg-purple-500/10 transition-colors"
        >
          <Info size={14} />
          <span>วิธีเล่น</span>
        </button>
      </div>

      <div className="absolute top-16 inset-x-0 z-10 flex flex-col items-center px-4 gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-purple-500/40 backdrop-blur">
          <Sparkles size={14} className="text-purple-300" />
          <span className="text-xs text-gray-100">AI Photo Generation</span>
        </div>
        <p className="text-xs text-gray-300 text-center max-w-md">
          ถ่ายรูปตัวเองแล้วให้ AI แปลงเป็นภาพศิลปะธีมธรรมชาติแฟนตาซี
        </p>
        {/* Daily limit indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30">
          <span className="text-xs text-purple-300">
            {remainingUses > 0 ? (
              <>เหลือ {remainingUses}/{MAX_DAILY_USES} ครั้งวันนี้</>
            ) : (
              <>ใช้งานครบโควต้าวันนี้แล้ว</>
            )}
          </span>
        </div>
      </div>

      {!capturedImage && <AIPhotoCanvas ref={canvasRef} onReady={handleReady} onError={handleError} />}

      {capturedImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-5">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-4 px-4">
              <Loader2 size={48} className="text-purple-400 animate-spin" />
              <p className="text-white text-base font-medium">กำลังสร้างภาพ AI...</p>
              <p className="text-gray-400 text-sm text-center max-w-md">
                AI กำลังแต่งชุดธีมธรรมชาติและวางคุณในฉากแฟนตาซี โปรดรอสักครู่ (10-30 วินาที)
              </p>
              <div className="flex gap-1 mt-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          ) : aiGeneratedImage ? (
            <div className="relative w-full max-w-2xl px-4">
              <img
                src={aiGeneratedImage}
                alt="AI Generated"
                className="w-full h-auto rounded-2xl border border-purple-500/30 shadow-2xl"
              />
              <button
                type="button"
                onClick={() => {
                  setCapturedImage(null)
                  setAiGeneratedImage(null)
                }}
                className="absolute top-3 right-7 w-10 h-10 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-3 left-7 right-7 bg-black/70 backdrop-blur rounded-lg px-3 py-2 border border-purple-500/30">
                <p className="text-green-300 text-xs font-medium">✨ สร้างภาพสำเร็จ! ดาวน์โหลดหรือแชร์ได้เลย</p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 pb-8 pt-4 px-6 z-20 pointer-events-none">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2 pointer-events-auto">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/70 border border-white/10">
              <Camera size={14} className="text-purple-300" />
              <span className="text-[11px] text-gray-200">AI Photo</span>
            </div>
            <div className="min-h-[32px]">
              {errorMsg ? (
                <div className="flex items-start gap-2 text-xs text-red-300 bg-red-900/40 border border-red-500/40 rounded-lg px-2 py-1.5 max-w-xs">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              ) : isLoading ? (
                <p className="text-xs text-gray-300 flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                  กำลังเปิดกล้อง...
                </p>
              ) : isGenerating ? (
                <p className="text-xs text-purple-300 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  กำลังสร้างภาพ AI...
                </p>
              ) : aiGeneratedImage ? (
                <p className="text-xs text-green-300 font-medium">✓ สร้างภาพ AI สำเร็จ!</p>
              ) : (
                <p className="text-xs text-gray-300">พร้อมถ่ายภาพ</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!aiGeneratedImage}
              className="w-10 h-10 rounded-full border border-white/30 bg-black/60 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-black/60 transition-colors"
            >
              <Download size={18} />
            </button>
            <button
              type="button"
              onClick={handleCapture}
              disabled={isCapturing || isGenerating || remainingUses === 0}
              className="relative w-16 h-16 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50 disabled:opacity-60 transition-transform active:scale-95"
            >
              {isCapturing || isGenerating ? (
                <Loader2 size={24} className="text-white animate-spin" />
              ) : (
                <div className="w-12 h-12 rounded-full border-4 border-white/80 bg-white/20" />
              )}
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={!aiGeneratedImage || isSharing}
              className="w-10 h-10 rounded-full border border-purple-400/60 bg-black/60 flex items-center justify-center text-purple-300 hover:bg-purple-500/10 disabled:opacity-40 disabled:hover:bg-black/60 transition-colors"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {showInstructions && (
        <AIPhotoInstructions open={showInstructions} onClose={() => setShowInstructions(false)} />
      )}
    </div>
  )
}

