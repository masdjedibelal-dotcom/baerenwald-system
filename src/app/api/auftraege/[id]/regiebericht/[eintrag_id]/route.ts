import { logDbError } from '@/lib/errors/log-db-error'
import { formatDatum } from '@/lib/utils'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderRegieberichtPdfBuffer } from '@/lib/pdf/regiebericht-pdf'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { firmZeileAdresse } from '@/lib/einstellungen-keys'
import type { FormularEintrag, FormularTemplate, Kunde } from '@/lib/types'

export async function GET(
  _request: Request,
  { params }: { params: { id: string; eintrag_id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const {data: auf, error: error1} = await supabase.from('auftraege').select('id').eq('id', params.id).maybeSingle()
  if (error1) logDbError('app/api/auftraege/[id]/regiebericht/[eintrag_id]/route:auftraege', error1)
  if (!auf) {
    return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 })
  }

  const { data: raw, error: error2 } = await supabaseAdmin
    .from('formular_eintraege')
    .select(
      `
      *,
      formular_templates(id, name, subtyp, felder),
      handwerker(name, firma),
      gewerke(name),
      auftraege!inner(id, kunden(*))
    `
    )
    .eq('id', params.eintrag_id)
    .eq('auftrag_id', params.id)
    .maybeSingle()
  if (error2) logDbError('app/api/auftraege/[id]/regiebericht/[eintrag_id]/route:formular_eintraege', error2)

  if (error2 || !raw) {
    return NextResponse.json({ error: error2?.message ?? 'Eintrag nicht gefunden' }, { status: 404 })
  }

  const eintrag = raw as FormularEintrag & {
    formular_templates: FormularTemplate | null
    auftraege?: { kunden: Kunde | null } | null
    handwerker?: { name: string; firma: string | null } | null
    gewerke?: { name: string } | null
  }

  const subtyp = eintrag.formular_templates?.subtyp
  if (subtyp !== 'regiebericht') {
    return NextResponse.json({ error: 'Kein Regiebericht-Eintrag' }, { status: 400 })
  }

  const kunde = eintrag.auftraege?.kunden
  if (!kunde) {
    return NextResponse.json({ error: 'Kundendaten fehlen' }, { status: 500 })
  }

  const daten = (eintrag.daten ?? {}) as Record<string, unknown>
  const num = (v: unknown) => {
    const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  const str = (v: unknown) => (v == null ? '' : String(v))

  const stunden =
    eintrag.gesamtstunden != null ? Number(eintrag.gesamtstunden) : num(daten.stunden_gesamt)
  const stundensatz = num(daten.stundensatz)
  const matDb = eintrag.material_kosten != null ? Number(eintrag.material_kosten) : null
  const matDaten = num(daten.material_kosten)
  const materialNetto = matDb != null && !Number.isNaN(matDb) ? matDb : matDaten
  const lohnNetto = stunden * stundensatz
  const netto = lohnNetto + materialNetto
  const mwst = netto * 0.19
  const brutto = netto + mwst

  const datumFormular = str(daten.datum) || formatDatum(new Date().toISOString())
  const beschreibung = str(daten.beschreibung)
  const grund = str(daten.grund)
  const materialBezeichnung = str(daten.material_bezeichnung)

  const firm = await fetchFirmenEinstellungen(supabase)
  const firmenname = firm.firmenname?.trim() || 'Bärenwald München'
  const auftraggeberName = firmenname
  const auftraggeberAdresse = firmZeileAdresse(firm) || 'München'

  try {
    const buffer = Buffer.from(
      await renderRegieberichtPdfBuffer({
        firmenname,
        auftragIdShort: params.id.slice(0, 8).toUpperCase(),
        datumFormular,
        kundeBaustelle: kunde,
        auftraggeberName,
        auftraggeberAdresse,
        handwerkerName: eintrag.handwerker?.name ?? '—',
        handwerkerFirma: eintrag.handwerker?.firma ?? null,
        gewerkName: eintrag.gewerke?.name ?? null,
        beschreibung,
        grund,
        stunden,
        stundensatz,
        lohnNetto,
        materialBezeichnung,
        materialNetto,
        netto,
        mwst,
        brutto,
        fotoUrls: (eintrag.foto_urls ?? []).filter(Boolean),
        unterschriftKunde: eintrag.unterschrift_kunde ?? null,
        unterschriftAt: eintrag.unterschrift_at
          ? formatDatum(eintrag.unterschrift_at)
          : null,
      })
    )
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="regiebericht-${params.eintrag_id}.pdf"`,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'PDF fehlgeschlagen' },
      { status: 500 }
    )
  }
}
