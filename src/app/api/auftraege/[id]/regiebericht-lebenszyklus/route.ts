import { NextResponse } from 'next/server'
import { renderRegieberichtFromLebenszyklus } from '@/app/(dashboard)/auftraege/regiebericht-lebenszyklus-actions'

/** GET /api/auftraege/[id]/regiebericht-lebenszyklus?positionId=… */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const url = new URL(req.url)
  const positionId = url.searchParams.get('positionId')
  const r = await renderRegieberichtFromLebenszyklus(id, positionId)
  if (!r.ok) {
    return NextResponse.json({ error: r.message }, { status: 400 })
  }
  return new NextResponse(new Uint8Array(r.buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${r.filename}"`,
    },
  })
}
