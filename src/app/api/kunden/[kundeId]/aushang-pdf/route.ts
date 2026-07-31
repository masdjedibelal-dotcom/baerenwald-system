import { NextResponse } from 'next/server'
import { renderHvMeldeAushangPdf } from '@/lib/org/render-melde-aushang-pdf'

/** GET /api/kunden/[kundeId]/aushang-pdf — Mieter-Aushang für die ganze HV */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ kundeId: string }> }
) {
  const { kundeId } = await ctx.params
  const r = await renderHvMeldeAushangPdf(kundeId)
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
