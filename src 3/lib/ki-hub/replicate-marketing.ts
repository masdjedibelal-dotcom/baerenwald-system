import 'server-only'

const REPLICATE_MODEL_API =
  'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions'
const POLL_MS = 2000
const TIMEOUT_MS = 120_000

function replicateToken(): string {
  const token = process.env.REPLICATE_API_TOKEN?.trim()
  if (!token) throw new Error('REPLICATE_API_TOKEN fehlt')
  return token.replace(/^["']|["']$/g, '').replace(/\s/g, '')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

export async function generateMarketingImage(prompt: string): Promise<string> {
  const token = replicateToken()
  const trimmed = prompt.trim()
  if (!trimmed) throw new Error('Bild-Prompt fehlt')

  const createRes = await fetch(REPLICATE_MODEL_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=60',
    },
    body: JSON.stringify({
      input: {
        prompt: trimmed,
        num_outputs: 1,
        aspect_ratio: '1:1',
        output_format: 'webp',
        output_quality: 85,
        go_fast: true,
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
      throw new Error('Bildgenerierung dauert zu lange — bitte später erneut versuchen.')
    }
    if (prediction.status === 'starting' || prediction.status === 'processing') {
      await sleep(POLL_MS)
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!pollRes.ok) throw new Error(`Replicate Polling fehlgeschlagen (${pollRes.status})`)
      prediction = (await pollRes.json()) as Prediction
      continue
    }
    break
  }

  if (prediction.status !== 'succeeded') {
    throw new Error(prediction.error?.trim() || 'Bildgenerierung fehlgeschlagen')
  }

  const url = extractOutputUrl(prediction.output)
  if (!url) throw new Error('Replicate: kein Output-URL')
  return url
}
