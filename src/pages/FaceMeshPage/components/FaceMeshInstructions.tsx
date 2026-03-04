import { X, Sun, Smile, Camera, Share2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const tips = [
  { icon: Sun, text: 'ใช้แสงสว่างเพียงพอ — ใบหน้าชัด tracking ดีขึ้น' },
  { icon: Smile, text: 'มองตรงหน้ากล้อง ให้เห็นใบหน้าทั้งหมด' },
  { icon: Sparkles, text: 'เลือกเอฟเฟกต์ด้านล่าง: แว่น แว่น 3D ลิป บลัช มงกุฎ แมว สติกเกอร์' },
  { icon: Camera, text: 'กดปุ่มวงกลมสีขาวตรงกลางเพื่อถ่ายภาพ' },
  { icon: Share2, text: 'แชร์รูปไปยัง Facebook, Line หรือ Instagram' },
]

export interface FaceMeshInstructionsProps {
  open: boolean
  onClose: () => void
}

/** Side sheet with Face Mesh usage tips */
export default function FaceMeshInstructions({ open, onClose }: FaceMeshInstructionsProps) {
  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20"
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 h-full w-80 bg-gray-950/95 border-l border-rose-500/30 z-30 flex flex-col overflow-y-auto"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-rose-500/20">
          <h2 className="text-white font-semibold text-lg">วิธีใช้ Face Mesh</h2>
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
            <p className="text-rose-300 text-xs font-medium uppercase tracking-widest">
              Face Effects
            </p>
            <div className="w-full bg-black rounded-2xl border border-rose-500/20 flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="text-5xl">👤</div>
                <p className="text-rose-400/60 text-xs">แสดงหน้ากล้องเพื่อเห็นเอฟเฟกต์</p>
              </div>
            </div>
          </div>
          <div className="border-t border-rose-500/20" />
          <div>
            <p className="text-rose-300 text-xs font-medium uppercase tracking-widest mb-3">
              เคล็ดลับ
            </p>
            <ul className="space-y-3">
              {tips.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0 mt-0.5 border border-rose-500/20">
                    <Icon size={13} className="text-rose-400" />
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-rose-500/20" />
          <div className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20">
            <p className="text-rose-300 text-xs font-medium mb-2">เอฟเฟกต์ที่มี</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              MediaPipe Face Landmarker track ใบหน้า real-time — แว่น 2D/3D (OBJ) ลิปสติก บลัช มงกุฎ
              หน้าแมว และสติกเกอร์เรืองแสง
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
