import type { VercelRequest, VercelResponse } from '@vercel/node'

// BytePlus Ark API configuration
const ARK_API_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations'
const ARK_MODEL = 'ep-20260304192227-vj2qh'

// Second image: fixed scene/theme image for multi-image generation (image 2)
const SCENE_IMAGE_URL =
  'https://imsnap.sgp1.digitaloceanspaces.com/theme/d5996b16-e642-4f45-960b-7f6e373f2006-faceswap1.jpeg'

// Prompt for AI generation (image 1 = user photo, image 2 = scene reference)
const AI_PROMPT =
  'สร้างภาพครึ่งตัวโดยใช้รูปต้นฉบับจากรูปที่ 1 ให้แต่งตัวชุดธีม ธรรมชาติ sustainability ทีมีความเป็นโลกอนาคต สุดแฟนตาซีแสงสีแบบแฟรี่ โดยโพสท่าแบบนางแบบ และยืนในฉากหลังจากภาพที่ 2 , ภาพถ่ายสมจริงขั้นสุด, มีความแฟนตาซีที่ชุดและเสริมให้เข้ากับฉากอย่างสมจริง, ภาพเหมือนถ่ายจากกล้อง dslr lens 50mm, โดยเน้นให้อยู่ในฉากอย่างสมบูรณ์ไม่ผิดเพี้ยน'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get API key from environment variable
  const apiKey = process.env.ARK_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const { image } = req.body

    if (!image) {
      return res.status(400).json({ error: 'Image is required' })
    }

    // Multi-image: [image 1 = user photo (base64), image 2 = scene reference URL]
    const imageArray: string[] = Array.isArray(image) ? image : [image]
    if (imageArray.length < 2) {
      imageArray.push(SCENE_IMAGE_URL)
    }

    // Call BytePlus Ark API with multi-image input
    const response = await fetch(ARK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ARK_MODEL,
        prompt: AI_PROMPT,
        image: imageArray,
        sequential_image_generation: 'disabled',
        response_format: 'url',
        size: '2K',
        output_format: 'png',
        stream: false,
        watermark: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API Error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.data?.[0]?.url) {
      throw new Error('No image URL in response')
    }

    // Return the AI generated image URL
    return res.status(200).json({
      success: true,
      imageUrl: data.data[0].url,
      size: data.data[0].size,
    })
  } catch (error) {
    console.error('AI Photo generation error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate AI photo',
    })
  }
}
