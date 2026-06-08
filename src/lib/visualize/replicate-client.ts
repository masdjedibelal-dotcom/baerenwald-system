import 'server-only'

import { REPLICATE_INTERIOR_MODEL_VERSION } from '@/lib/visualize/constants'

const REPLICATE_API = 'https://api.replicate.com/v1/predictions'
const POLL_MS = 2000
const TIMEOUT_MS = 60_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function replicateToken(): string {
  const token = process.env.REPLICATE_API_TOKEN?.trim()
  if (!token) throw new Error('REPLICATE_API_TOKEN fehlt')
  return token
}

export async function renderInteriorDesign(input: {
  image: string
  prompt: string
}): Promise<string> {
  const token = replicateToken()
  const createRes = await fetch(REPLICATE_API, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: REPLICATE_INTERIOR_MODEL_VERSION,
      input: {
        image: input.image,
        prompt: input.prompt,
        negative_prompt: 'ugly, blurry, low quality, distorted, deformed',
        num_inference_steps: 30,
        guidance_scale: 15,
        prompt_strength: 0.8,
        seed: Math.floor(Math.random() * 1000),
      },
    }),
  })

  if (!createRes.ok) {
    const errText = await createRes.text()
    throw new Error(`Replicate Start fehlgeschlagen: ${errText.slice(0, 240)}`)
  }

  const created = (await createRes.json()) as { id?: string }
  const predictionId = created.id
  if (!predictionId) throw new Error('Replicate: keine Prediction-ID')

  const started = Date.now()
  while (Date.now() - started < TIMEOUT_MS) {
    await sleep(POLL_MS)
    const pollRes = await fetch(`${REPLICATE_API}/${predictionId}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!pollRes.ok) {
      throw new Error(`Replicate Polling fehlgeschlagen (${pollRes.status})`)
    }
    const result = (await pollRes.json()) as {
      status?: string
      output?: string | string[] | null
      error?: string | null
    }
    if (result.status === 'succeeded') {
      const out = result.output
      const url = Array.isArray(out) ? out[0] : out
      if (!url || typeof url !== 'string') throw new Error('Replicate: kein Output-URL')
      return url
    }
    if (result.status === 'failed' || result.status === 'canceled') {
      throw new Error(result.error?.trim() || 'Render fehlgeschlagen')
    }
  }

  throw new Error('Replicate Timeout nach 60 Sekunden')
}
