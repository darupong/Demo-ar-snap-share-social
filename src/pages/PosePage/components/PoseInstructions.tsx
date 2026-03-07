import { X, PersonStanding, Sun, Camera, Share2, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'

const tips = [
  { icon: Sun, text: 'ใช้แสงสว่างเพียงพอ และพื้นหลังต่างจากชุดที่สวมใส่' },
  { icon: Move, text: 'ถอยออกให้ห่างกล้องพอให้เห็นร่างกายเต็มๆ หรืออย่างน้อยครึ่งตัว' },
  { icon: PersonStanding, text: 'ลองขยับแขน-ขา เต้น หรือทำท่าต่างๆ แล้วดู skeleton เคลื่อนไหวตาม' },
  { icon: Camera, text: 'กดปุ่มกล้องเพื่อถ่ายภาพพร้อม skeleton ส่งต่อเพื่อนได้เลย' },
  { icon: Share2, text: 'แชร์ภาพ skeleton ไปยัง Facebook, Line หรือ Instagram' },
]

export interface PoseInstructionsProps {
  open: boolean
  onClose: () => void
}

export default function PoseInstructions({ open, onClose }: PoseInstructionsProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-80 bg-gray-950/95 border-l border-violet-500/30 z-30 flex flex-col overflow-y-auto"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-violet-500/20">
          <h2 className="text-white font-semibold text-lg">วิธีใช้ Pose Skeleton</h2>
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
            <p className="text-violet-300 text-xs font-medium uppercase tracking-widest">
              Body Pose Detection
            </p>
            <div className="w-full bg-black rounded-2xl border border-violet-500/20 flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="text-5xl">🦴</div>
                <p className="text-violet-400/60 text-xs">
                  ระบบวาด skeleton 33 จุดทั่วร่างกายแบบ real-time
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-violet-500/20" />

          <div>
            <p className="text-violet-300 text-xs font-medium uppercase tracking-widest mb-3">
              สีของ skeleton
            </p>
            <div className="space-y-2">
              {[
                { color: 'bg-cyan-400', label: 'ด้านซ้าย', desc: 'แขนซ้าย ขาซ้าย' },
                { color: 'bg-violet-400', label: 'ด้านขวา', desc: 'แขนขวา ขาขวา' },
                { color: 'bg-rose-400', label: 'ใบหน้า / กลาง', desc: 'ศีรษะ ลำตัว' },
              ].map(({ color, label, desc }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${color} shrink-0`} />
                  <div>
                    <span className="text-white text-sm font-medium">{label}</span>
                    <span className="text-gray-400 text-xs ml-2">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-violet-500/20" />

          <div>
            <p className="text-violet-300 text-xs font-medium uppercase tracking-widest mb-3">
              เคล็ดลับ
            </p>
            <ul className="space-y-3">
              {tips.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/20">
                    <Icon size={13} className="text-violet-400" />
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-violet-500/20" />

          <div className="bg-violet-500/10 rounded-xl p-4 border border-violet-500/20">
            <p className="text-violet-300 text-xs font-medium mb-2">เทคโนโลยี</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              ใช้ MediaPipe PoseLandmarker Lite (33 landmark points)
              ทำงานบน CPU ของอุปกรณ์ ไม่ส่งข้อมูลออกนอก
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
