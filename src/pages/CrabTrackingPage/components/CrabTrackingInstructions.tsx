import { X, Camera, Share2, Target, Lightbulb, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'

const tips = [
  { icon: Lightbulb, text: 'ใช้แสงสว่างเพียงพอ — แสงดีช่วยให้ target tracking นิ่งขึ้น' },
  { icon: Target, text: 'ส่องกล้องตั้งฉากกับรูป target ในระยะประมาณ 20–50 ซม.' },
  { icon: Box, text: 'โมเดลปู 3D จะลอยขึ้นบน target เมื่อระบบ track เจอภาพ' },
  { icon: Camera, text: 'กดปุ่มกล้องเพื่อถ่ายภาพ AR พร้อมโมเดลปูและภาพจากกล้อง' },
  { icon: Share2, text: 'แชร์ภาพที่ถ่ายไปยัง Facebook, Line หรือ Instagram ได้ทันที' },
]

export interface CrabTrackingInstructionsProps {
  open: boolean
  onClose: () => void
}

/** Render the side sheet that explains how to use the Crab Tracking AR demo. */
export default function CrabTrackingInstructions({
  open,
  onClose,
}: CrabTrackingInstructionsProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-80 bg-gray-950/95 border-l border-emerald-500/30 z-30 flex flex-col overflow-y-auto"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-emerald-500/20">
          <h2 className="text-white font-semibold text-lg">วิธีใช้ Crab Tracking AR</h2>
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
            <p className="text-emerald-300 text-xs font-medium uppercase tracking-widest">
              MindAR Model Tracking
            </p>
            <div className="w-full bg-black rounded-2xl border border-emerald-500/20 flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="text-5xl">🦀</div>
                <p className="text-emerald-400/60 text-xs">ส่อง target image → ปู 3D ปรากฏบนรูป</p>
              </div>
            </div>
          </div>

          <div className="border-t border-emerald-500/20" />

          <div>
            <p className="text-emerald-300 text-xs font-medium uppercase tracking-widest mb-3">
              ขั้นตอน
            </p>
            <ol className="space-y-3">
              {[
                'กดปุ่ม "เริ่ม AR" และอนุญาตให้เข้าถึงกล้อง',
                'พิมพ์หรือเปิด target image บนอุปกรณ์อีกเครื่อง',
                'ส่องกล้องหลังไปที่ target image ให้เห็นเต็มกรอบ',
                'โมเดล Crab 3D จะลอยขึ้นบน target แบบ real-time',
                'กดปุ่มกล้องเพื่อถ่ายภาพและแชร์ได้ทันที',
              ].map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400 text-xs font-bold">
                    {index + 1}
                  </span>
                  <p className="text-gray-300 text-sm leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="border-t border-emerald-500/20" />

          <div>
            <p className="text-emerald-300 text-xs font-medium uppercase tracking-widest mb-3">
              เคล็ดลับ
            </p>
            <ul className="space-y-3">
              {tips.map(({ icon: Icon, text }, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                    <Icon size={13} className="text-emerald-400" />
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-emerald-500/20" />

          <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
            <p className="text-emerald-300 text-xs font-medium mb-2">เทคโนโลยี</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              MindAR Image Tracking แบบ real-time บน browser
              ตรวจจับ target และแสดงโมเดล 3D ปูซ้อนบนภาพทันทีเมื่อ track สำเร็จ
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
