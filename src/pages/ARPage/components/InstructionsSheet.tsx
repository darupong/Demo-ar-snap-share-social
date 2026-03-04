import { X, Sun, Smartphone, Eye, Camera, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HIRO_MARKER_URL } from '@/constants'

const tips = [
  { icon: Sun, text: 'ใช้แสงสว่างเพียงพอ — อย่าถ่ายในที่มืด' },
  { icon: Smartphone, text: 'ถือกล้องห่างจาก marker ประมาณ 25–60 ซม.' },
  { icon: Eye, text: 'ให้ marker อยู่ในเฟรมทั้งหมด ไม่ถูกบัง' },
  { icon: Camera, text: 'กดปุ่มวงกลมสีขาวตรงกลางเพื่อถ่ายภาพ' },
  { icon: Printer, text: 'พิมพ์ marker หรือแสดงบนหน้าจออื่น' },
]

export interface InstructionsSheetProps {
  open: boolean
  onClose: () => void
}

/** Side sheet with AR marker usage tips and Hiro marker image */
export default function InstructionsSheet({ open, onClose }: InstructionsSheetProps) {
  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20"
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 h-full w-80 bg-gray-950/95 border-l border-violet-500/30 z-30 flex flex-col overflow-y-auto"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-violet-500/20">
          <h2 className="text-white font-semibold text-lg">วิธีใช้</h2>
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
              Hiro Marker
            </p>
            <div className="bg-white p-4 rounded-2xl shadow-xl shadow-violet-500/20 border border-violet-400/20">
              <img
                src={HIRO_MARKER_URL}
                alt="Hiro AR marker"
                className="w-36 h-36 object-contain"
                loading="lazy"
              />
            </div>
            <p className="text-gray-500 text-xs text-center leading-relaxed">
              ส่องกล้องตรง marker นี้เพื่อให้ 3D ปรากฎ
            </p>
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
            <p className="text-violet-300 text-xs font-medium mb-2">3D Object ที่จะเห็น</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              เพชร Icosahedron สีม่วง ลอยและหมุนบน marker พร้อมวงแหวน Cyan
              และดาวเคราะห์สีทองโคจรรอบ
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
