import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const tips = [
  { icon: Sparkles, text: 'ถ่ายภาพตัวเองหรือฉากที่คุณชอบ' },
  { icon: Sparkles, text: 'ระบบจะส่งภาพไปยัง AI เพื่อสร้างภาพศิลปะ' },
  { icon: Sparkles, text: 'รอสักครู่ AI กำลังสร้างภาพสุดพิเศษให้คุณ' },
  { icon: Sparkles, text: 'ดาวน์โหลดหรือแชร์ภาพ AI ที่ได้ไปเลย' },
]

export interface AIPhotoInstructionsProps {
  open: boolean
  onClose: () => void
}

/** Side sheet with AI Photo usage tips */
export default function AIPhotoInstructions({ open, onClose }: AIPhotoInstructionsProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-80 bg-gray-950/95 border-l border-purple-500/30 z-30 flex flex-col overflow-y-auto"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-purple-500/20">
          <h2 className="text-white font-semibold text-lg">วิธีใช้ AI Photo</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full w-8 h-8"
          >
            <span className="text-xl leading-none">&times;</span>
          </Button>
        </div>
        <div className="p-5 space-y-6 flex-1">
          <div className="flex flex-col items-center gap-3">
            <p className="text-purple-300 text-xs font-medium uppercase tracking-widest">
              AI Photo Generation
            </p>
            <div className="w-full bg-black rounded-2xl border border-purple-500/20 flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="text-5xl">✨</div>
                <p className="text-purple-400/60 text-xs">
                  ถ่ายภาพแล้วให้ AI แปลงเป็นงานศิลปะ
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-purple-500/20" />
          <div>
            <p className="text-purple-300 text-xs font-medium uppercase tracking-widest mb-3">
              ขั้นตอน
            </p>
            <ul className="space-y-3">
              {tips.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/20">
                    <Icon size={13} className="text-purple-400" />
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-purple-500/20" />
          <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
            <p className="text-purple-300 text-xs font-medium mb-2">หมายเหตุ</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              การสร้างภาพใช้เวลาประมาณ 10-30 วินาที ขึ้นอยู่กับความซับซ้อนของภาพ
              และต้องใช้ API Key ที่ถูกต้อง
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
