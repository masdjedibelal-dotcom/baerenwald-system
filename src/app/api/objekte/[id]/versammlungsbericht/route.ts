import { NextResponse } from 'next/server'
import { renderVersammlungsberichtPdf } from '@/lib/org/render-versammlungsbericht-pdf'

/** GET /api/objekte/[id]/versammlungsbericht — Versammlungsbericht-PDF */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: objektId } = await ctx.params
  const url = new URL(req.url)
  const kundeId = url.searchParams.get('kundeId')?.trim() || ''
  const von = url.searchParams.get('von')?.trim() || ''
  const bis = url.searchParams.get('bis')?.trim() || ''
  const einzelpreise = url.searchParams.get('einzelpreise') !== '0'

  if (!kundeId) {
    return NextResponse.json({ error: 'kundeId fehlt.' }, { status: 400 })
  }

  const r = await renderVersammlungsberichtPdf({
    kundeId,
    objektId,
    von,
    bis,
    einzelpreise,
  })

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
