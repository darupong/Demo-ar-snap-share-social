import type { FaceEffect } from '@/components/FaceMeshCanvas'

/** Share text for Face Mesh when sharing to social */
export const FACEMESH_SHARE_TEXT = 'ลอง Face Effect จาก MediaPipe กัน! ✨ #demo'

export interface FaceEffectPreset {
  effect: FaceEffect
  label: string
  emoji: string
  /** Used for glasses/lipstick; ignored for blush/crown/cat/stickers */
  color: string
}

/** Face effect presets for the effect picker */
export const FACE_EFFECT_PRESETS: FaceEffectPreset[] = [
  { effect: 'glasses', label: 'แว่น', emoji: '👓', color: '#1a1a1a' },
  { effect: 'nerd_glasses_3d', label: 'แว่น 3D', emoji: '🤓', color: '#1a1a1a' },
  { effect: 'lipstick', label: 'ลิปสติก', emoji: '💄', color: '#c41e3a' },
  { effect: 'blush', label: 'บลัช', emoji: '🌸', color: '#ff6980' },
  { effect: 'crown', label: 'มงกุฎ', emoji: '👑', color: '#ffb800' },
  { effect: 'cat', label: 'แมว', emoji: '🐱', color: '#f5cfc0' },
  { effect: 'stickers', label: 'สติกเกอร์', emoji: '⭐', color: '#ffcc00' },
]
