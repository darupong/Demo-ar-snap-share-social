import type { VercelRequest, VercelResponse } from '@vercel/node'

// BytePlus Ark API configuration
const ARK_API_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations'
const ARK_VIDEO_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks'
const ARK_MODEL = 'ep-20260304192227-vj2qh'
const ARK_VIDEO_MODEL = 'ep-20260309233431-xdmw5'

// Second image: fixed scene/theme image for multi-image generation (image 2)
const SCENE_IMAGE_URL =
  'https://imsnap.sgp1.digitaloceanspaces.com/theme/d5996b16-e642-4f45-960b-7f6e373f2006-faceswap1.jpeg'

// Prompts for AI image generation by theme
const AI_PROMPTS: Record<string, string> = {
  man: 'สร้างภาพครึ่งตัวโดยใช้รูปต้นฉบับจากรูปที่ 1 ให้แต่งตัวชุดธีม ธรรมชาติ sustainability ทีมีความเป็นโลกอนาคต สุดแฟนตาซีแสงสีแบบแฟรี่ โดยโพสท่าแบบนางแบบ และยืนในฉากหลังจากภาพที่ 2 , ภาพถ่ายสมจริงขั้นสุด, มีความแฟนตาซีที่ชุดและเสริมให้เข้ากับฉากอย่างสมจริง, ภาพเหมือนถ่ายจากกล้อง dslr lens 50mm, โดยเน้นให้อยู่ในฉากอย่างสมบูรณ์ไม่ผิดเพี้ยน',
  woman:
    'สร้างภาพครึ่งตัวโดยใช้รูปต้นฉบับจากรูปที่ 1 ให้แต่งตัวชุดเดรสธีม ธรรมชาติ sustainability ทีมีความเป็นโลกอนาคต สุดแฟนตาซีแสงสีแบบแฟรี่ โดยโพสท่าแบบนางแบบ และยืนในฉากหลังจากภาพที่ 2 , ภาพถ่ายสมจริงขั้นสุด, มีความแฟนตาซีที่ชุดและเสริมให้เข้ากับฉากอย่างสมจริง, ภาพเหมือนถ่ายจากกล้อง dslr lens 50mm, โดยเน้นให้อยู่ในฉากอย่างสมบูรณ์ไม่ผิดเพี้ยน',
}

// Prompt for video generation (uses the generated image as first frame)
const VIDEO_PROMPT =
  'กล้องนิ่ง,ค่อยๆมีแสงออกร่าแบบ Fairy รอยขึ้นมารอบๆตัว ตัวละครค่อยๆสัมผัสพลังงานรอบข้าง'

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
    const { image, theme } = req.body

    if (!image) {
      return res.status(400).json({ error: 'Image is required' })
    }

    const AI_PROMPT = AI_PROMPTS[theme] ?? AI_PROMPTS.man

    // Multi-image: [image 1 = user photo (base64), image 2 = scene reference URL]
    const imageArray: string[] = Array.isArray(image) ? image : [image]
    if (imageArray.length < 2) {
      imageArray.push(SCENE_IMAGE_URL)
    }

    // Step 1: Call BytePlus Ark API with multi-image input to generate AI photo
    const imageResponse = await fetch(ARK_API_URL, {
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
        stream: false,
        watermark: true,
      }),
    })

    if (!imageResponse.ok) {
      const errorData = await imageResponse.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Image API Error: ${imageResponse.status}`)
    }

    const imageData = await imageResponse.json()

    if (!imageData.data?.[0]?.url) {
      throw new Error('No image URL in response')
    }

    const imageUrl: string = imageData.data[0].url

    // Step 2: Submit video generation task using the generated image as first frame
    // This is non-blocking — if it fails, we still return the image result
    let videoTaskId: string | null = null
    try {
      const videoResponse = await fetch(ARK_VIDEO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: ARK_VIDEO_MODEL,
          content: [
            { type: 'text', text: VIDEO_PROMPT },
            { type: 'image_url', image_url: { url: imageUrl }, role: 'first_frame' },
          ],
          ratio: '9:16',
          duration: 5,
          resolution: '1080p',
        }),
      })

      if (videoResponse.ok) {
        const videoData = await videoResponse.json()
        videoTaskId = videoData.id ?? null
      } else {
        console.error('Video task submission failed:', videoResponse.status)
      }
    } catch (videoErr) {
      console.error('Video task submission error:', videoErr)
    }

    // Return the AI generated image URL and video task ID for frontend polling
    return res.status(200).json({
      success: true,
      imageUrl,
      videoTaskId,
      size: imageData.data[0].size,
    })
  } catch (error) {
    console.error('AI Photo generation error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate AI photo',
    })
  }
}
