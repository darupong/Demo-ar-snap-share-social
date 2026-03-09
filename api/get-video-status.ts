import type { VercelRequest, VercelResponse } from '@vercel/node'

const ARK_VIDEO_TASKS_URL =
  'https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ARK_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const { taskId } = req.query
  if (!taskId || typeof taskId !== 'string') {
    return res.status(400).json({ error: 'taskId is required' })
  }

  try {
    const response = await fetch(`${ARK_VIDEO_TASKS_URL}/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API Error: ${response.status}`)
    }

    const data = await response.json()

    // status: queued | running | succeeded | failed | expired
    return res.status(200).json({
      status: data.status,
      videoUrl: data.content?.video_url ?? null,
    })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get video status',
    })
  }
}
