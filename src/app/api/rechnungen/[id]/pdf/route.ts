import { NextResponse } from 'next/server'
import { persistPdfForRechnung } from '@/lib/rechnungen/persist-pdf'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const res = await persistPdfForRechnung(params.id)
  if (!res.ok) {
    return NextResponse.json({ message: res.message }, { status: 400 })
  }
  return NextResponse.redirect(res.publicUrl)
}
