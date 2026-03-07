import { X, Hand, Palette, Trash2, Camera, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const tips = [
  { icon: Hand, text: 'ชี้นิ้วชี้ขึ้น (นิ้วอื่นงอ) เพื่อวาดเส้น' },
  { icon: Hand, text: 'หยิกนิ้วหัวแม่มือและนิ้วชี้เข้าหากัน (Pinch) เพื่อยกปากกา — ย้ายตำแหน่งโดยไม่วาด' },
  { icon: Palette, text: 'เลือกสีจาก palette ด้านล่าง และปรับขนาดแปรงได้' },
  { icon: Trash2, text: 'กดไอคอน Trash เพื่อล้างภาพทั้งหมด' },
  { icon: Camera, text: 'กดปุ่มกล้องเพื่อถ่ายภาพรวมกับ background กล้องหน้า' },
  { icon: Share2, text: 'แชร์ผลงานไปยัง Facebook, Line หรือ Instagram' },
]

export interface DrawInstructionsProps {
  open: boolean
  onClose: () => void
}

export default function DrawInstructions({ open, onClose }: DrawInstructionsProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-80 bg-gray-950/95 border-l border-cyan-500/30 z-30 flex flex-col overflow-y-auto"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-cyan-500/20">
          <h2 className="text-white font-semibold text-lg">วิธีใช้ Air Drawing</h2>
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
            <p className="text-cyan-300 text-xs font-medium uppercase tracking-widest">
              Air Drawing with Hand
            </p>
            <div className="w-full bg-black rounded-2xl border border-cyan-500/20 flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="text-5xl">✍️</div>
                <p className="text-cyan-400/60 text-xs">ใช้นิ้วมือวาดภาพในอากาศ real-time</p>
              </div>
            </div>
          </div>

          <div className="border-t border-cyan-500/20" />

          <div>
            <p className="text-cyan-300 text-xs font-medium uppercase tracking-widest mb-3">
              ท่ามือ
            </p>
            <div className="space-y-2">
              {[
                { emoji: '☝️', label: 'ชี้นิ้วชี้', desc: 'วาดเส้น' },
                { emoji: '🤏', label: 'Pinch (หยิก)', desc: 'ยกปากกา / ย้ายโดยไม่วาด' },
                { emoji: '👋', label: 'ไม่มีมือ', desc: 'ยกปากกาอัตโนมัติ' },
              ].map(({ emoji, label, desc }) => (
                <div key={label} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <span className="text-white text-sm font-medium">{label}</span>
                    <span className="text-gray-400 text-xs block">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-cyan-500/20" />

          <div>
            <p className="text-cyan-300 text-xs font-medium uppercase tracking-widest mb-3">
              เคล็ดลับ
            </p>
            <ul className="space-y-3">
              {tips.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/20">
                    <Icon size={13} className="text-cyan-400" />
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-cyan-500/20" />

          <div className="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/20">
            <p className="text-cyan-300 text-xs font-medium mb-2">เทคโนโลยี</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              ใช้ MediaPipe HandLandmarker (21 landmark points)
              ติดตาม index finger tip แบบ real-time บน CPU ของอุปกรณ์
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
