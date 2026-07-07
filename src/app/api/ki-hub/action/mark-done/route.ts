import { NextRequest, NextResponse } from 'next/server'
import { markEmpfehlungUmgesetzt } from '@/lib/ki-hub/queries'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { empfehlung_id?: string }
  try {
    body = (await req.json()) as { empfehlung_id?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const id = body.empfehlung_id?.trim()
  if (!id) {
    return NextResponse.json({ error: 'empfehlung_id fehlt' }, { status: 400 })
  }

  const result = await markEmpfehlungUmgesetzt(id)
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
