import { X, Sun, Move, Camera, Share2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'

const tips = [
  { icon: Sun, text: 'ใช้แสงสว่างเพียงพอ — ยิ่งคมชัดยิ่งตัดขอบได้ดี' },
  { icon: Move, text: 'ถ้าขอบไม่ชัด ลองขยับห่างจากกล้องนิดหน่อย หรือเปลี่ยนฉากหลัง' },
  { icon: Layers, text: 'สลับ mode ระหว่าง Color Splash (grayscale bg) กับ Silhouette (black bg)' },
  { icon: Camera, text: 'กดปุ่มกล้องเพื่อถ่ายภาพ color splash' },
  { icon: Share2, text: 'แชร์ภาพไปยัง Facebook, Line หรือ Instagram' },
]

export interface SplashInstructionsProps {
  open: boolean
  onClose: () => void
}

export default function SplashInstructions({ open, onClose }: SplashInstructionsProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-80 bg-gray-950/95 border-l border-pink-500/30 z-30 flex flex-col overflow-y-auto"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-pink-500/20">
          <h2 className="text-white font-semibold text-lg">วิธีใช้ Color Splash</h2>
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
          <div className="flex flex-col items-center gap-3">
            <p className="text-pink-300 text-xs font-medium uppercase tracking-widest">
              Selfie Segmentation
            </p>
            <div className="w-full bg-black rounded-2xl border border-pink-500/20 flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="text-5xl">🎨</div>
                <p className="text-pink-400/60 text-xs">คนมีสี — พื้นหลัง grayscale / ดำ</p>
              </div>
            </div>
          </div>

          <div className="border-t border-pink-500/20" />

          <div>
            <p className="text-pink-300 text-xs font-medium uppercase tracking-widest mb-3">
              โหมด
            </p>
            <div className="space-y-2">
              {[
                {
                  icon: '🎨',
                  name: 'Color Splash',
                  desc: 'พื้นหลังเป็นภาพขาว-ดำ คนยังคงมีสีสด เห็นความแตกต่างชัดเจน',
                },
                {
                  icon: '🌑',
                  name: 'Silhouette',
                  desc: 'พื้นหลังดำสนิท คนมีสีสด เอฟเฟกต์ dramatic มากขึ้น',
                },
              ].map(({ icon, name, desc }) => (
                <div key={name} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{icon}</span>
                    <span className="text-white text-sm font-medium">{name}</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-pink-500/20" />

          <div>
            <p className="text-pink-300 text-xs font-medium uppercase tracking-widest mb-3">
              เคล็ดลับ
            </p>
            <ul className="space-y-3">
              {tips.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-pink-500/15 flex items-center justify-center shrink-0 mt-0.5 border border-pink-500/20">
                    <Icon size={13} className="text-pink-400" />
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-pink-500/20" />

          <div className="bg-pink-500/10 rounded-xl p-4 border border-pink-500/20">
            <p className="text-pink-300 text-xs font-medium mb-2">เทคโนโลยี</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              ใช้ MediaPipe ImageSegmenter + Selfie Segmenter model
              แยกคนออกจากพื้นหลัง pixel-by-pixel บน CPU แบบ real-time
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
