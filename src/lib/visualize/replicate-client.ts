import 'server-only'

import { REPLICATE_INTERIOR_MODEL_VERSION } from '@/lib/visualize/constants'

const REPLICATE_API = 'https://api.replicate.com/v1/predictions'
const POLL_MS = 2000
const TIMEOUT_MS = 120_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function replicateToken(): string {
  const token = process.env.REPLICATE_API_TOKEN?.trim()
  if (!token) throw new Error('REPLICATE_API_TOKEN fehlt')
  return token.replace(/^["']|["']$/g, '').replace(/\s/g, '')
}

type Prediction = {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[] | null
  error?: string | null
}

function extractOutputUrl(output: Prediction['output']): string | null {
  if (!output) return null
  if (typeof output === 'string') return output
  if (Array.isArray(output) && typeof output[0] === 'string') return output[0]
  return null
}

export async function renderInteriorDesign(input: {
  image: string
  prompt: string
  prompt_strength?: number
  guidance_scale?: number
  negative_prompt?: string
}): Promise<string> {
  const token = replicateToken()

  const createRes = await fetch(REPLICATE_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=60',
    },
    body: JSON.stringify({
      version: REPLICATE_INTERIOR_MODEL_VERSION,
      input: {
        image: input.image,
        prompt: input.prompt,
        num_inference_steps: 40,
        guidance_scale: input.guidance_scale ?? 10,
        prompt_strength: input.prompt_strength ?? 0.45,
        ...(input.negative_prompt ? { negative_prompt: input.negative_prompt } : {}),
      },
    }),
  })

  if (!createRes.ok) {
    const errText = await createRes.text()
    throw new Error(`Replicate Start fehlgeschlagen: ${errText.slice(0, 240)}`)
  }

  let prediction = (await createRes.json()) as Prediction

  const deadline = Date.now() + TIMEOUT_MS
  while (
    prediction.status !== 'succeeded' &&
    prediction.status !== 'failed' &&
    prediction.status !== 'canceled'
  ) {
    if (Date.now() > deadline) {
      throw new Error('Render dauert zu lange — bitte später erneut versuchen.')
    }
    if (prediction.status === 'starting' || prediction.status === 'processing') {
      await sleep(POLL_MS)
      const pollRes = await fetch(`${REPLICATE_API}/${prediction.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!pollRes.ok) throw new Error(`Replicate Polling fehlgeschlagen (${pollRes.status})`)
      prediction = (await pollRes.json()) as Prediction
      continue
    }
    break
  }

  if (prediction.status !== 'succeeded') {
    throw new Error(prediction.error?.trim() || 'Render fehlgeschlagen')
  }

  const url = extractOutputUrl(prediction.output)
  if (!url) throw new Error('Replicate: kein Output-URL')
  return url
}
