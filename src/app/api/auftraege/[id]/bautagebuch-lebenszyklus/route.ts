import { NextResponse } from 'next/server'
import { renderBautagebuchFromLebenszyklus } from '@/app/(dashboard)/auftraege/bautagebuch-lebenszyklus-actions'

/** GET /api/auftraege/[id]/bautagebuch-lebenszyklus — gleiche Quelle wie Regiebericht */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const r = await renderBautagebuchFromLebenszyklus(id)
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
