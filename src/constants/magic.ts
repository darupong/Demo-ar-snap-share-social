/** Share text for Magic Hands when sharing to social */
export const MAGIC_SHARE_TEXT = 'มือมายากล! ไฟพุ่งจากปลายนิ้ว ✨🔥 #siampiwat_demo'

export interface FirePreset {
  color: string
  label: string
  emoji: string
}

/** Fire effect color presets for Magic Hands */
export const FIRE_PRESETS: FirePreset[] = [
  { color: '#ff6600', label: 'ไฟ', emoji: '🔥' },
  { color: '#00ccff', label: 'น้ำแข็ง', emoji: '❄️' },
  { color: '#44ff00', label: 'พิษ', emoji: '☣️' },
  { color: '#ffee00', label: 'ฟ้าผ่า', emoji: '⚡' },
  { color: '#cc44ff', label: 'เวทมนตร์', emoji: '🔮' },
  { color: '#ff44aa', label: 'ซากุระ', emoji: '🌸' },
]
