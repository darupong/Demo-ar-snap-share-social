import { useCallback, useEffect, useState } from 'react'
import { Gift, Copy, Check } from 'lucide-react'

const PRIZES = ['รางวัลที่ 1', 'รางวัลที่ 2', 'รางวัลที่ 3', 'รางวัลที่ 4', 'รางวัลที่ 5', 'รางวัลที่ 6']
const WHEEL_COLORS = ['#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb923c', '#fbbf24']
const N = PRIZES.length
const SEG_DEG = 360 / N

// SVG coordinate space (fixed — viewBox scales to any CSS size)
const VB = 340
const CX = VB / 2
const CY = VB / 2
const R = VB / 2 - 3

function polarToXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function generateRandomCoupon(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  let result = ''
  for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
  return result
}

export interface SpinWheelCouponProps {
  open: boolean
  onClose: () => void
  onSpun?: () => void
}

export default function SpinWheelCoupon({ open, onClose, onSpun }: SpinWheelCouponProps) {
  const [phase, setPhase] = useState<'idle' | 'ready' | 'spinning' | 'congrats'>('idle')
  const [wheelRotation, setWheelRotation] = useState(0)
  const [spinResult, setSpinResult] = useState<number | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) { setPhase('idle'); return }
    setPhase('ready')
    setWheelRotation(0)
    setSpinResult(null)
    setCouponCode('')
    setCopied(false)
  }, [open])

  const handleSpin = useCallback(() => {
    if (phase !== 'ready') return
    const result = Math.floor(Math.random() * N)
    setSpinResult(result)
    setPhase('spinning')
    requestAnimationFrame(() => {
      setWheelRotation(360 * 5 + (360 - result * SEG_DEG - SEG_DEG / 2))
    })
  }, [phase])

  useEffect(() => {
    if (phase !== 'spinning' || !open) return
    const t = setTimeout(() => {
      setCouponCode(generateRandomCoupon())
      setPhase('congrats')
      onSpun?.()
    }, 5500)
    return () => clearTimeout(t)
  }, [phase, open, onSpun])

  const handleCopyCoupon = useCallback(async () => {
    if (!couponCode) return
    try {
      await navigator.clipboard.writeText(couponCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [couponCode])

  const handleCloseCongrats = useCallback(() => {
    setPhase('idle')
    onClose()
  }, [onClose])

  if (!open || phase === 'idle') return null

  const isReady = phase === 'ready'

  return (
    <>
      {/* ── Spin Wheel (ready + spinning) ── */}
      {(phase === 'ready' || phase === 'spinning') && (
        <div className="fixed inset-0 z-60 flex flex-col items-center justify-center gap-4 bg-black/90 backdrop-blur-md px-4">
          {/* Title */}
          <p className="text-white font-bold text-xl sm:text-2xl tracking-wide drop-shadow-lg text-center">
            {isReady ? 'กดตรงกลางเพื่อสุ่ม! 🎯' : 'กำลังสุ่มรางวัล... 🎁'}
          </p>

          {/* Pointer + Wheel stacked */}
          <div className="flex flex-col items-center">
            {/* Pointer arrow — sits above wheel edge */}
            <div style={{ filter: 'drop-shadow(0 2px 6px rgba(251,191,36,0.8))', position: 'relative', zIndex: 20 }}>
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '14px solid transparent',
                  borderRight: '14px solid transparent',
                  borderTop: '26px solid #fbbf24',
                }}
              />
            </div>

            {/* Responsive wheel container — SVG scales via viewBox */}
            <div
              className="relative -mt-1.5"
              style={{ width: 'min(84vw, 340px)', aspectRatio: '1 / 1' }}
            >
              {/* Glow ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: isReady
                    ? '0 0 40px 8px rgba(167,139,250,0.25), 0 0 70px 16px rgba(251,191,36,0.1)'
                    : '0 0 50px 12px rgba(167,139,250,0.45), 0 0 80px 20px rgba(251,191,36,0.2)',
                  transition: 'box-shadow 0.4s ease',
                }}
              />

              {/* Rotatable wheel div */}
              <div
                className="absolute inset-0 rounded-full overflow-hidden"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: phase === 'spinning'
                    ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                    : 'none',
                }}
              >
                {/* SVG uses viewBox — all coords in 340×340 space, scales to any container */}
                <svg
                  viewBox={`0 0 ${VB} ${VB}`}
                  width="100%"
                  height="100%"
                  style={{ display: 'block' }}
                >
                  <defs>
                    <filter id="sw-text-shadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.75" />
                    </filter>
                  </defs>

                  {/* Segments */}
                  {PRIZES.map((label, i) => {
                    const startAngle = i * SEG_DEG
                    const endAngle = (i + 1) * SEG_DEG
                    const start = polarToXY(startAngle, R)
                    const end = polarToXY(endAngle, R)
                    const midAngle = startAngle + SEG_DEG / 2
                    const textPos = polarToXY(midAngle, R * 0.62)
                    const path = `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 0 1 ${end.x} ${end.y} Z`
                    return (
                      <g key={i}>
                        <path d={path} fill={WHEEL_COLORS[i]} stroke="#0d0d1f" strokeWidth={2.5} />
                        <text
                          x={textPos.x}
                          y={textPos.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${midAngle}, ${textPos.x}, ${textPos.y})`}
                          fill="white"
                          fontSize={13}
                          fontWeight="800"
                          fontFamily="system-ui, sans-serif"
                          filter="url(#sw-text-shadow)"
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {label}
                        </text>
                      </g>
                    )
                  })}

                  {/* Spoke dividers */}
                  {PRIZES.map((_, i) => {
                    const p = polarToXY(i * SEG_DEG, R)
                    return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#0d0d1f" strokeWidth={2} />
                  })}

                  {/* Center hub (SVG circles — scale with viewBox) */}
                  <circle cx={CX} cy={CY} r={40} fill="#0d0d1f" />
                  <circle cx={CX} cy={CY} r={40} fill="none" stroke="#fbbf24" strokeWidth={3} />
                  <circle cx={CX} cy={CY} r={36} fill="none" stroke="#a78bfa" strokeWidth={1} strokeOpacity={0.5} />
                </svg>
              </div>

              {/* Center button — percentage-based so it scales with container */}
              {isReady ? (
                <button
                  onClick={handleSpin}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center justify-center rounded-full active:scale-90 transition-transform"
                  style={{
                    width: '23.5%',
                    aspectRatio: '1 / 1',
                    background: 'radial-gradient(circle, #1c1030 0%, #0d0d1f 100%)',
                    border: '3px solid #fbbf24',
                    boxShadow: '0 0 16px 4px rgba(251,191,36,0.5), inset 0 0 12px rgba(167,139,250,0.2)',
                  }}
                >
                  {/* Icon scaled to ~40% of button */}
                  <Gift
                    className="text-amber-400"
                    style={{ width: '42%', height: '42%', marginBottom: 2 }}
                  />
                  <span
                    className="text-amber-300 font-bold leading-none"
                    style={{ fontSize: '9px' }}
                  >
                    SPIN
                  </span>
                </button>
              ) : (
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center rounded-full pointer-events-none"
                  style={{
                    width: '23.5%',
                    aspectRatio: '1 / 1',
                    background: '#0d0d1f',
                    border: '3px solid #fbbf24',
                  }}
                >
                  <Gift
                    className="text-amber-400 animate-pulse"
                    style={{
                      width: '46%',
                      height: '46%',
                      filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.9))',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Color legend */}
          <div className="flex gap-2">
            {PRIZES.map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: WHEEL_COLORS[i] }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Congratulations Modal ── */}
      {phase === 'congrats' && spinResult !== null && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-gray-950 shadow-2xl">
            {/* Radial glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(251,191,36,0.12) 0%, transparent 70%)',
              }}
            />

            {/* Top color strip */}
            <div
              className="h-1 w-full"
              style={{
                background: `linear-gradient(to right, ${WHEEL_COLORS[spinResult]}, #fbbf24, ${WHEEL_COLORS[(spinResult + 1) % N]})`,
              }}
            />

            <div className="relative px-5 py-6 sm:px-8 sm:py-8 text-center">
              {/* Icon */}
              <div
                className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-4"
                style={{
                  background: `radial-gradient(circle, ${WHEEL_COLORS[spinResult]}22 0%, transparent 70%)`,
                  border: `2px solid ${WHEEL_COLORS[spinResult]}66`,
                }}
              >
                <Gift
                  size={32}
                  style={{
                    color: WHEEL_COLORS[spinResult],
                    filter: `drop-shadow(0 0 8px ${WHEEL_COLORS[spinResult]}99)`,
                  }}
                />
              </div>

              <h2 className="text-white font-extrabold text-xl sm:text-2xl mb-1 tracking-tight">
                ยินดีด้วย! 🎉
              </h2>
              <p className="font-bold text-lg sm:text-xl mb-1" style={{ color: WHEEL_COLORS[spinResult] }}>
                {PRIZES[spinResult]}
              </p>
              <p className="text-gray-500 text-sm mb-5">บันทึกโค้ดด้านล่างเพื่อรับส่วนลด</p>

              {/* Coupon code */}
              <div className="flex items-stretch gap-2 mb-5 rounded-2xl bg-white/5 border border-white/10 p-1">
                <div className="flex-1 flex items-center justify-center px-3 py-2.5 sm:px-4 sm:py-3">
                  <code className="text-amber-300 font-mono text-lg sm:text-xl font-bold tracking-[0.15em]">
                    {couponCode}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCoupon}
                  className="shrink-0 flex items-center justify-center px-3 sm:px-4 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 active:scale-95 transition-all"
                  title="Copy coupon"
                >
                  {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                </button>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={handleCloseCongrats}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-base tracking-wide active:scale-[0.98] transition-all"
                style={{
                  background: `linear-gradient(135deg, ${WHEEL_COLORS[spinResult]}, #f59e0b)`,
                  boxShadow: `0 4px 20px ${WHEEL_COLORS[spinResult]}55`,
                }}
              >
                รับทราบ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
