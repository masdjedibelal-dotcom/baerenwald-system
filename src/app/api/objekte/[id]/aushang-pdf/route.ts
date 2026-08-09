import { NextResponse } from 'next/server'
import { renderMeldeAushangPdf } from '@/lib/org/render-melde-aushang-pdf'

/** GET /api/objekte/[id]/aushang-pdf — einseitiger Mieter-Aushang */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const r = await renderMeldeAushangPdf(id)
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
