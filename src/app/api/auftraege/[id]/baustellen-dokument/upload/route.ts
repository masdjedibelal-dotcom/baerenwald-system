import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createBaustellenDokumentEintrag } from '@/app/(dashboard)/auftraege/baustelle-actions'
import type { BaustellenDokumentTyp } from '@/lib/auftraege/baustelle-types'

const ERLAUBTE_TYPEN: BaustellenDokumentTyp[] = [
  'tagesbericht',
  'wochenbericht',
  'regiebericht',
  'sonstiges',
]

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const { data: auf } = await supabase.from('auftraege').select('id').eq('id', params.id).maybeSingle()
  if (!auf) {
    return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Datei fehlt' }, { status: 400 })
  }

  const typRaw = String(formData.get('typ') ?? 'sonstiges')
  const typ = ERLAUBTE_TYPEN.includes(typRaw as BaustellenDokumentTyp)
    ? (typRaw as BaustellenDokumentTyp)
    : 'sonstiges'
  const titel = String(formData.get('titel') ?? '').trim() || 'Baustellen-Dokument'
  const kw = formData.get('kalenderwoche') ? Number(formData.get('kalenderwoche')) : null
  const jahr = formData.get('jahr') ? Number(formData.get('jahr')) : null
  const wochenNummer = formData.get('wochen_nummer') ? Number(formData.get('wochen_nummer')) : null

  const buf = Buffer.from(await file.arrayBuffer())
  const name = (formData.get('filename') as string) || file.name || 'dokument.pdf'
  const safe = name.replace(/[^\w.\-äöüÄÖÜß]+/g, '_')
  const path = `baustellen-dokumente/${params.id}/${Date.now()}-${safe}`

  const { error: upErr } = await supabaseAdmin.storage
    .from('protokolle')
    .upload(path, buf, { contentType: file.type || 'application/pdf', upsert: true })

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from('protokolle').getPublicUrl(path)

  const result = await createBaustellenDokumentEintrag({
    auftragId: params.id,
    typ,
    titel,
    datei_url: pub.publicUrl,
    kalenderwoche: kw,
    jahr,
    wochen_nummer: wochenNummer,
    quelle: 'upload',
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  return NextResponse.json({ url: pub.publicUrl, id: result.id })
}
