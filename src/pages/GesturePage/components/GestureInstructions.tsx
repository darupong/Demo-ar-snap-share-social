import { X, Hand, Camera, Share2, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'

const GESTURES = [
  { emoji: '👍', name: 'Thumbs Up', label: 'เยี่ยมมาก!' },
  { emoji: '👎', name: 'Thumbs Down', label: 'ไม่โอเค!' },
  { emoji: '✌️', name: 'Victory', label: 'Peace!' },
  { emoji: '🤟', name: 'ILY', label: 'Love You!' },
  { emoji: '🖐️', name: 'Open Palm', label: 'หยุด!' },
  { emoji: '☝️', name: 'Pointing Up', label: 'อันดับ 1!' },
  { emoji: '👊', name: 'Fist', label: 'แน่มาก!' },
]

const tips = [
  { icon: Hand, text: 'ยกมือให้กล้องเห็นชัด — ทำท่าค้างไว้ 2 วินาทีเพื่อสะสม COMBO' },
  { icon: Timer, text: 'ยิ่งถือท่าเดิมนาน COMBO ยิ่งสูง — ถ่ายรูปตอน combo เยอะ ๆ ดูดีมาก' },
  { icon: Camera, text: 'กดปุ่มกล้องเพื่อถ่ายภาพพร้อม emoji ยักษ์และ hand skeleton' },
  { icon: Share2, text: 'แชร์รูปไปยัง Facebook, Line หรือ Instagram' },
]

export interface GestureInstructionsProps {
  open: boolean
  onClose: () => void
}

export default function GestureInstructions({ open, onClose }: GestureInstructionsProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-80 bg-gray-950/95 border-l border-amber-500/30 z-30 flex flex-col overflow-y-auto"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-amber-500/20">
          <h2 className="text-white font-semibold text-lg">วิธีใช้ Gesture Emoji</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full w-8 h-8"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          <div>
            <p className="text-amber-300 text-xs font-medium uppercase tracking-widest mb-3">
              ท่ามือที่รองรับ
            </p>
            <div className="grid grid-cols-2 gap-2">
              {GESTURES.map(({ emoji, name, label }) => (
                <div key={name} className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className="text-white text-xs font-medium">{name}</p>
                    <p className="text-gray-400 text-xs">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-amber-500/20" />

          <div>
            <p className="text-amber-300 text-xs font-medium uppercase tracking-widest mb-3">
              เคล็ดลับ
            </p>
            <ul className="space-y-3">
              {tips.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
                    <Icon size={13} className="text-amber-400" />
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-amber-500/20" />

          <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
            <p className="text-amber-300 text-xs font-medium mb-2">เทคโนโลยี</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              ใช้ MediaPipe GestureRecognizer รู้จัก 7 ท่ามือ
              พร้อมแสดง hand landmark 21 จุดแบบ real-time บน CPU
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
