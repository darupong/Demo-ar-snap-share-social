/**
 * Converts a base64 data URL to a Blob (e.g. for Web Share API file sharing).
 * Returns null if the data URL format is invalid.
 */
export function dataURLtoBlob(dataURL: string): Blob | null {
  const commaIndex = dataURL.indexOf(',')
  if (commaIndex === -1) return null
  const header = dataURL.slice(0, commaIndex)
  const base64 = dataURL.slice(commaIndex + 1)
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch?.[1] ?? 'image/png'
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}
