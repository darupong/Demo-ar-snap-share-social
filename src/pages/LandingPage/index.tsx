import { useNavigate } from 'react-router-dom'
import { Camera, Eye, Share2, Smartphone, Sparkles, ChevronRight, Flame, Smile, Box, PersonStanding, Pencil, HandMetal, Film } from 'lucide-react'
import { ROUTES, HIRO_MARKER_URL } from '@/constants'

const steps = [
  {
    icon: Smartphone,
    step: '01',
    title: 'แสดง Marker',
    description:
      'เปิด marker ด้านล่างในหน้าจออื่น หรือพิมพ์ออกมา เพื่อใช้สำหรับส่อง AR',
    color: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/30',
  },
  {
    icon: Camera,
    step: '02',
    title: 'เปิดกล้อง AR',
    description:
      'กดปุ่ม "เริ่มใช้งาน AR" แล้วอนุญาตการเข้าถึงกล้อง จากนั้นส่องกล้องไปที่ marker',
    color: 'from-cyan-500 to-teal-600',
    glow: 'shadow-cyan-500/30',
  },
  {
    icon: Eye,
    step: '03',
    title: 'เห็น 3D ปรากฎ',
    description:
      'เพชร 3D จะลอยขึ้นมาบน marker! กดปุ่มถ่ายภาพเพื่อบันทึกและแชร์',
    color: 'from-pink-500 to-rose-600',
    glow: 'shadow-pink-500/30',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0015] text-white overflow-x-hidden">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full bg-purple-800/15 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-10 max-w-2xl">

        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-300 text-sm font-medium">
            <Sparkles size={14} className="text-violet-400" />
            AR Experience
            <span className="text-violet-400 font-semibold">#demo</span>
          </div>
        </div>

        {/* Hero */}
        <div className="text-center mb-10 space-y-4">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            <span className="bg-linear-to-r from-violet-300 via-purple-200 to-cyan-300 bg-clip-text text-transparent">
              AR Snap
            </span>
            <br />
            <span className="text-white">Share Social</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-sm mx-auto leading-relaxed">
            ส่องกล้องไปที่ Hiro marker แล้วเห็นโลก 3D ปรากฎขึ้นมา
            ถ่ายรูปและแชร์ให้เพื่อน!
          </p>
        </div>

        {/* How to play */}
        <div className="mb-10">
          <h2 className="text-center text-gray-400 text-sm font-medium uppercase tracking-widest mb-5">
            วิธีเล่น
          </h2>
          <div className="space-y-3">
            {steps.map(({ icon: Icon, step, title, description, color, glow }) => (
              <div
                key={step}
                className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-linear-to-br ${color} flex items-center justify-center shrink-0 shadow-lg ${glow}`}
                >
                  <Icon size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-500 font-mono">{step}</span>
                    <span className="text-white font-semibold">{title}</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marker section */}
        <div className="mb-10">
          <h2 className="text-center text-gray-400 text-sm font-medium uppercase tracking-widest mb-5">
            วิธีส่อง Marker
          </h2>

          <div className="bg-white/5 border border-violet-500/30 rounded-3xl p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Marker image */}
              <div className="shrink-0">
                <div className="bg-white p-5 rounded-2xl shadow-2xl shadow-violet-500/20 border-2 border-violet-400/30">
                  <img
                    src={HIRO_MARKER_URL}
                    alt="Hiro AR Marker"
                    className="w-44 h-44 object-contain"
                  />
                </div>
                <p className="text-center text-violet-400 text-xs mt-2 font-medium">
                  Hiro Marker
                </p>
              </div>

              {/* Instructions */}
              <div className="flex-1 space-y-3">
                <h3 className="text-white font-semibold text-lg">วิธีใช้ Marker</h3>
                <ul className="space-y-2">
                  {[
                    'เปิด marker นี้บนหน้าจออีกเครื่อง หรือพิมพ์ออกมาบนกระดาษ A4',
                    'วาง marker บนพื้นผิวเรียบ มีแสงส่องชัดเจน',
                    'ส่องกล้องจากมุมตรง 30–60 ซม. ให้เห็น marker ทั้งหมด',
                    'รอให้แถบสถานะเปลี่ยนเป็น "พบ Marker" แล้ว 3D จะปรากฎ',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight
                        size={14}
                        className="text-violet-400 mt-0.5 shrink-0"
                      />
                      <span className="text-gray-300 text-sm leading-relaxed">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Share section */}
        <div className="mb-10 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Share2 size={18} className="text-white" />
          </div>
          <p className="text-blue-300 text-sm leading-relaxed">
            หลังถ่ายรูปแล้ว กดปุ่ม <strong className="text-white">Share</strong> เพื่อแชร์ไปยัง{' '}
            <strong className="text-white">Facebook</strong> พร้อม hashtag{' '}
            <strong className="text-blue-300">#demo</strong> อัตโนมัติ
          </p>
        </div>

        {/* Demo selection */}
        <div className="mb-8">
          <h2 className="text-center text-gray-400 text-sm font-medium uppercase tracking-widest mb-5">
            เลือก Demo
          </h2>
          <div className="grid grid-cols-2 gap-4">

            {/* AR Marker Demo */}
            <button
              onClick={() => navigate(ROUTES.AR)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl
                bg-white/5 border border-violet-500/30
                hover:bg-violet-500/10 hover:border-violet-500/60
                active:scale-[0.97] transition-all duration-150
                text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Camera size={22} className="text-white" />
              </div>
              <div className="w-full">
                <p className="text-white font-semibold text-sm">🎯 AR Marker</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  ส่อง Hiro marker เห็น 3D ปรากฎ
                </p>
              </div>
              <div className="w-full flex items-center gap-1 text-violet-400 text-xs font-medium">
                เริ่มเลย <ChevronRight size={12} />
              </div>
            </button>

            {/* Magic Hands Demo */}
            <button
              onClick={() => navigate(ROUTES.MAGIC)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl
                bg-white/5 border border-orange-500/30
                hover:bg-orange-500/10 hover:border-orange-500/60
                active:scale-[0.97] transition-all duration-150
                text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Flame size={22} className="text-white" />
              </div>
              <div className="w-full">
                <p className="text-white font-semibold text-sm">🔥 Magic Hands</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  แสดงมือ เห็นไฟพุ่งจากนิ้ว
                </p>
              </div>
              <div className="w-full flex items-center gap-1 text-orange-400 text-xs font-medium">
                เริ่มเลย <ChevronRight size={12} />
              </div>
            </button>

            {/* Face Mesh Demo */}
            <button
              onClick={() => navigate(ROUTES.FACEMESH)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl
                bg-white/5 border border-rose-500/30
                hover:bg-rose-500/10 hover:border-rose-500/60
                active:scale-[0.97] transition-all duration-150
                text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                <Smile size={22} className="text-white" />
              </div>
              <div className="w-full">
                <p className="text-white font-semibold text-sm">👤 Face Mesh</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  แสดงหน้า เอฟเฟกต์แว่น ลิป มงกุฎ
                </p>
              </div>
              <div className="w-full flex items-center gap-1 text-rose-400 text-xs font-medium">
                เริ่มเลย <ChevronRight size={12} />
              </div>
            </button>

            {/* Object Detector (Image Classifier) Demo */}
            <button
              onClick={() => navigate(ROUTES.OBJECTS)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl
                bg-white/5 border border-cyan-500/30
                hover:bg-cyan-500/10 hover:border-cyan-500/60
                active:scale-[0.97] transition-all duration-150
                text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Box size={22} className="text-white" />
              </div>
              <div className="w-full">
                <p className="text-white font-semibold text-sm">🔍 Object Classifier</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  โหมดเบา ส่องของบนโต๊ะแล้วเห็นชื่อวัตถุแบบ real-time (ไม่มีกรอบ)
                </p>
              </div>
              <div className="w-full flex items-center gap-1 text-cyan-400 text-xs font-medium">
                เริ่มเลย <ChevronRight size={12} />
              </div>
            </button>

            {/* Object Detector (Boxes) Demo */}
            <button
              onClick={() => navigate(ROUTES.OBJECTS_DETECTOR)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl
                bg-white/5 border border-emerald-500/30
                hover:bg-emerald-500/10 hover:border-emerald-500/60
                active:scale-[0.97] transition-all duration-150
                text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500 to-lime-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Box size={22} className="text-white" />
              </div>
              <div className="w-full">
                <p className="text-white font-semibold text-sm">📦 Object Detector (Boxes)</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  โหมดมีกรอบ ล้อมรอบวัตถุพร้อมชื่อและเปอร์เซ็นต์ความมั่นใจแบบ real-time
                </p>
              </div>
              <div className="w-full flex items-center gap-1 text-emerald-400 text-xs font-medium">
                เริ่มเลย <ChevronRight size={12} />
              </div>
            </button>

            {/* AI Photo Demo */}
            <button
              onClick={() => navigate(ROUTES.AIPHOTO)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl
                bg-white/5 border border-purple-500/30
                hover:bg-purple-500/10 hover:border-purple-500/60
                active:scale-[0.97] transition-all duration-150
                text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Sparkles size={22} className="text-white" />
              </div>
              <div className="w-full">
                <p className="text-white font-semibold text-sm">✨ AI Photo</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  ถ่ายภาพแล้วให้ AI แปลงเป็นงานศิลปะสุดพิเศษ
                </p>
              </div>
              <div className="w-full flex items-center gap-1 text-purple-400 text-xs font-medium">
                เริ่มเลย <ChevronRight size={12} />
              </div>
            </button>

            {/* Pose Skeleton Demo */}
            <button
              onClick={() => navigate(ROUTES.POSE)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl
                bg-white/5 border border-violet-500/30
                hover:bg-violet-500/10 hover:border-violet-500/60
                active:scale-[0.97] transition-all duration-150
                text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <PersonStanding size={22} className="text-white" />
              </div>
              <div className="w-full">
                <p className="text-white font-semibold text-sm">🦴 Pose Skeleton</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  ส่องกล้องหน้า เห็น skeleton ร่างกาย 33 จุดเรืองแสง real-time
                </p>
              </div>
              <div className="w-full flex items-center gap-1 text-violet-400 text-xs font-medium">
                เริ่มเลย <ChevronRight size={12} />
              </div>
            </button>

            {/* Air Drawing Demo */}
            <button
              onClick={() => navigate(ROUTES.DRAW)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl
                bg-white/5 border border-cyan-500/30
                hover:bg-cyan-500/10 hover:border-cyan-500/60
                active:scale-[0.97] transition-all duration-150
                text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Pencil size={22} className="text-white" />
              </div>
              <div className="w-full">
                <p className="text-white font-semibold text-sm">✍️ Air Drawing</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  วาดภาพในอากาศด้วยนิ้วมือ pinch เพื่อยกปากกา เลือกสีได้
                </p>
              </div>
              <div className="w-full flex items-center gap-1 text-cyan-400 text-xs font-medium">
                เริ่มเลย <ChevronRight size={12} />
              </div>
            </button>

            {/* Gesture Emoji Demo */}
            <button
              onClick={() => navigate(ROUTES.GESTURE)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl
                bg-white/5 border border-amber-500/30
                hover:bg-amber-500/10 hover:border-amber-500/60
                active:scale-[0.97] transition-all duration-150
                text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <HandMetal size={22} className="text-white" />
              </div>
              <div className="w-full">
                <p className="text-white font-semibold text-sm">✌️ Gesture Emoji</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  ทำท่ามือ → emoji ยักษ์โชว์พร้อม combo! รองรับ 7 ท่า
                </p>
              </div>
              <div className="w-full flex items-center gap-1 text-amber-400 text-xs font-medium">
                เริ่มเลย <ChevronRight size={12} />
              </div>
            </button>

            {/* Color Splash Demo */}
            <button
              onClick={() => navigate(ROUTES.SPLASH)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl
                bg-white/5 border border-pink-500/30
                hover:bg-pink-500/10 hover:border-pink-500/60
                active:scale-[0.97] transition-all duration-150
                text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
                <Sparkles size={22} className="text-white" />
              </div>
              <div className="w-full">
                <p className="text-white font-semibold text-sm">🎨 Color Splash</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  คนมีสี พื้นหลัง grayscale/ดำ — เอฟเฟกต์สุดเท่ถ่ายรูปได้
                </p>
              </div>
              <div className="w-full flex items-center gap-1 text-pink-400 text-xs font-medium">
                เริ่มเลย <ChevronRight size={12} />
              </div>
            </button>

            {/* Image Tracking AR Demo */}
            <button
              onClick={() => navigate(ROUTES.IMAGE_TRACKING)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl
                bg-white/5 border border-teal-500/30
                hover:bg-teal-500/10 hover:border-teal-500/60
                active:scale-[0.97] transition-all duration-150
                text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Film size={22} className="text-white" />
              </div>
              <div className="w-full">
                <p className="text-white font-semibold text-sm">🐟 Image Tracking AR</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  ส่อง target image เห็นวิดีโอลอยขึ้นแบบ AR ด้วย MindAR
                </p>
              </div>
              <div className="w-full flex items-center gap-1 text-teal-400 text-xs font-medium">
                เริ่มเลย <ChevronRight size={12} />
              </div>
            </button>

            {/* Crab Tracking AR Demo */}
            <button
              onClick={() => navigate(ROUTES.CRAB_TRACKING)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl
                bg-white/5 border border-emerald-500/30
                hover:bg-emerald-500/10 hover:border-emerald-500/60
                active:scale-[0.97] transition-all duration-150
                text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500 to-lime-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Box size={22} className="text-white" />
              </div>
              <div className="w-full">
                <p className="text-white font-semibold text-sm">🦀 Crab Tracking AR</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  ส่อง target image เห็นโมเดลปู 3D ลอยขึ้นแบบ AR ด้วย MindAR
                </p>
              </div>
              <div className="w-full flex items-center gap-1 text-emerald-400 text-xs font-medium">
                เริ่มเลย <ChevronRight size={12} />
              </div>
            </button>

          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          ต้องการสิทธิ์เข้าถึงกล้อง และรองรับ HTTPS หรือ localhost
        </p>
      </div>
    </div>
  )
}

