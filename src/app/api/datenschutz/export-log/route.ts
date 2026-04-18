import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { loadDatenschutzLog } from '@/lib/datenschutz/queries'

export const dynamic = 'force-dynamic'

function csvEscape(s: string): string {
  const t = s.replace(/"/g, '""')
  if (/[",\n\r]/.test(t)) return `"${t}"`
  return t
}

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await loadDatenschutzLog(5000)
  const header = ['created_at', 'typ', 'referenz_id', 'referenz_typ', 'grund', 'geloescht_von']
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        csvEscape(r.created_at ?? ''),
        csvEscape(r.typ),
        csvEscape(r.referenz_id ?? ''),
        csvEscape(r.referenz_typ ?? ''),
        csvEscape(r.grund),
        csvEscape(r.geloescht_von ?? ''),
      ].join(',')
    ),
  ]

  const csv = lines.join('\n')
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="loeschprotokoll.csv"',
    },
  })
}
