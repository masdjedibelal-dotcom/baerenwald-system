import { NextResponse } from 'next/server'
import { requireCrmAngebotAccess } from '@/lib/visualize/auth'
import { loadKiVisualisierungenForAngebot } from '@/lib/visualize/queries'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const angebotId = new URL(req.url).searchParams.get('angebot_id')?.trim()
  if (!angebotId) {
    return NextResponse.json({ error: 'angebot_id fehlt' }, { status: 400 })
  }

  const auth = await requireCrmAngebotAccess(angebotId)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const sessions = await loadKiVisualisierungenForAngebot(angebotId)
  return NextResponse.json({ sessions })
}
