import { X, Camera, Share2, Target, Lightbulb, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'

const tips = [
  { icon: Lightbulb, text: 'ใช้แสงสว่างเพียงพอ — ยิ่งสว่างยิ่ง track ได้ดี' },
  { icon: Target, text: 'ส่องกล้องตั้งฉากกับรูป target ในระยะ 20–50 ซม.' },
  { icon: Video, text: 'วิดีโอจะเล่นอัตโนมัติเมื่อพบ target และหยุดเมื่อเสียจากกล้อง' },
  { icon: Camera, text: 'กดปุ่มกล้องเพื่อถ่ายภาพ AR ขณะวิดีโอกำลังเล่น' },
  { icon: Share2, text: 'แชร์ภาพไปยัง Facebook, Line หรือ Instagram' },
]

export interface ImageTrackingInstructionsProps {
  open: boolean
  onClose: () => void
}

export default function ImageTrackingInstructions({ open, onClose }: ImageTrackingInstructionsProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-80 bg-gray-950/95 border-l border-teal-500/30 z-30 flex flex-col overflow-y-auto"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-teal-500/20">
          <h2 className="text-white font-semibold text-lg">วิธีใช้ Image Tracking AR</h2>
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
            <p className="text-teal-300 text-xs font-medium uppercase tracking-widest">
              MindAR Image Tracking
            </p>
            <div className="w-full bg-black rounded-2xl border border-teal-500/20 flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="text-5xl">🐟</div>
                <p className="text-teal-400/60 text-xs">ส่อง target image → วิดีโอปรากฎบนรูป</p>
              </div>
            </div>
          </div>

          <div className="border-t border-teal-500/20" />

          <div>
            <p className="text-teal-300 text-xs font-medium uppercase tracking-widest mb-3">
              ขั้นตอน
            </p>
            <ol className="space-y-3">
              {[
                'กดปุ่ม "เริ่ม AR" และอนุญาตการเข้าถึงกล้อง',
                'พิมพ์หรือแสดง target image บนหน้าจออื่น',
                'ส่องกล้อง (กล้องหลัง) ไปที่รูป target',
                'วิดีโอ Fish จะแสดงทับบน target แบบ real-time',
                'กดปุ่มกล้องเพื่อถ่ายภาพและแชร์',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0 mt-0.5 text-teal-400 text-xs font-bold">
                    {i + 1}
                  </span>
                  <p className="text-gray-300 text-sm leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="border-t border-teal-500/20" />

          <div>
            <p className="text-teal-300 text-xs font-medium uppercase tracking-widest mb-3">
              เคล็ดลับ
            </p>
            <ul className="space-y-3">
              {tips.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-teal-500/15 flex items-center justify-center shrink-0 mt-0.5 border border-teal-500/20">
                    <Icon size={13} className="text-teal-400" />
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-teal-500/20" />

          <div className="bg-teal-500/10 rounded-xl p-4 border border-teal-500/20">
            <p className="text-teal-300 text-xs font-medium mb-2">เทคโนโลยี</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Image Tracking แบบ real-time บน browser
              ตรวจจับ target และแสดงวิดีโอซ้อนทับบน target image ทันที
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
