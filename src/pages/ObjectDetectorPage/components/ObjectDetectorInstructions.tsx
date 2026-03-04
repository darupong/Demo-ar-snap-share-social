import { X, Sun, Box, Timer, Camera, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const tips = [
  { icon: Sun, text: 'ใช้แสงสว่างเพียงพอ — วัตถุชัดช่วยให้กรอบตรวจจับนิ่งและแม่นขึ้น' },
  { icon: Box, text: 'ลองส่องของบนโต๊ะ เช่น แก้วน้ำ หนังสือ กล่อง หรือคีย์บอร์ด' },
  { icon: Timer, text: 'ถ้าเริ่มหน่วง ลองหยุดเคลื่อนกล้องชั่วครู่ให้ระบบตามทัน' },
  { icon: Camera, text: 'กดปุ่มวงกลมสีขาวตรงกลางเพื่อถ่ายภาพพร้อมกรอบวัตถุ' },
  { icon: Share2, text: 'แชร์รูปไปยัง Facebook, Line หรือ Instagram' },
]

export interface ObjectDetectorInstructionsProps {
  open: boolean
  onClose: () => void
}

/** Side sheet with bounding-box object detector usage tips */
export default function ObjectDetectorInstructions({
  open,
  onClose,
}: ObjectDetectorInstructionsProps) {
  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20"
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 h-full w-80 bg-gray-950/95 border-l border-cyan-500/30 z-30 flex flex-col overflow-y-auto"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-cyan-500/20">
          <h2 className="text-white font-semibold text-lg">วิธีใช้ Object Detector (มีกรอบ)</h2>
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
              Object Detection (Boxes)
            </p>
            <div className="w-full bg-black rounded-2xl border border-cyan-500/20 flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="text-5xl">🎯</div>
                <p className="text-cyan-400/60 text-xs">
                  ระบบจะวาดกรอบและชื่อวัตถุรอบของที่ตรวจเจอแบบ real-time
                </p>
              </div>
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
            <p className="text-cyan-300 text-xs font-medium mb-2">สิ่งที่จะเห็น</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              MediaPipe Object Detector จะขึ้นกรอบรอบวัตถุ พร้อมชื่อและเปอร์เซ็นต์ความมั่นใจ
              ในแต่ละกรอบแบบ real-time (อาจใช้เวลาชาร์จโมเดลเล็กน้อยตอนเปิดครั้งแรก)
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

