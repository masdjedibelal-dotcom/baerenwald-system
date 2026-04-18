import type { AuftragDetail, FormularEintrag, FormularTemplate, PunchListRow } from '@/lib/types'

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function subtypOf(e: FormularEintrag): string | null {
  return (e.formular_templates as FormularTemplate | null)?.subtyp ?? null
}

function regieBrutto(e: FormularEintrag): { stunden: number; brutto: number } {
  const daten = (e.daten ?? {}) as Record<string, unknown>
  const st =
    e.gesamtstunden != null ? Number(e.gesamtstunden) : num(daten.stunden_gesamt)
  const satz = num(daten.stundensatz)
  const lohn = st * satz
  const matDb = e.material_kosten != null ? Number(e.material_kosten) : null
  const mat = matDb != null && !Number.isNaN(matDb) ? matDb : num(daten.material_kosten)
  const net = lohn + mat
  const brutto = net * 1.19
  return { stunden: st, brutto }
}

export type AbnahmePdfZusatz = {
  pruefprotokolle: {
    gewerk: string
    titel: string
    datum: string
    pruefer: string
    ergebnis: string
    ok: boolean
  }[]
  regieberichte: {
    datum: string
    beschreibung: string
    grund: string
    stunden: number
    brutto: number
  }[]
  regieSummeStunden: number
  regieSummeBrutto: number
  bautagebuchAnzahl: number
  bautagebuchStundenSumme: number
  bautagebuchErste: string | null
  bautagebuchLetzte: string | null
  behinderungen: { datum: string; grund: string; verzug: number }[]
  behinderungVerzugSumme: number
  punchList: { gewerk: string; beschreibung: string; status: string }[]
  planStart: string | null
  planEnde: string | null
  tatsStart: string | null
  tatsEnde: string | null
  vorBaubeginn: {
    datum: string
    bereiche: string[]
    schaeden: string
    besonderheiten: string
    fotoUrls: string[]
  } | null
  baustopps: { beginn: string; ende: string | null; typ: string; grund: string; verzug: number }[]
  baustoppVerzugSumme: number
  /** Sicherheitseinbehalte für PDF-Abschnitt „Finanzielle Vereinbarungen“ */
  finanzEinbehalte: { handwercher: string; einbehaltBetrag: number; freigabeDatum: string }[]
}

export function buildAbnahmePdfZusatz(detail: AuftragDetail): AbnahmePdfZusatz {
  const eintraege = (detail.formular_eintraege ?? []).filter((e) => e.submitted_at) as FormularEintrag[]

  const regieberichte: AbnahmePdfZusatz['regieberichte'] = []
  const pruefprotokolle: AbnahmePdfZusatz['pruefprotokolle'] = []
  const bauDaten: { datum: string; stunden: number }[] = []
  const behinderungen: AbnahmePdfZusatz['behinderungen'] = []

  for (const e of eintraege) {
    const st = subtypOf(e)
    const daten = (e.daten ?? {}) as Record<string, unknown>
    const tplName = e.formular_templates?.name ?? 'Formular'
    const gw = e.gewerke?.name ?? '—'

    if (st === 'regiebericht') {
      const { stunden, brutto } = regieBrutto(e)
      regieberichte.push({
        datum: str(daten.datum),
        beschreibung: str(daten.beschreibung),
        grund: str(daten.grund),
        stunden,
        brutto,
      })
    } else if (st === 'pruefprotokoll') {
      const ergebnis = str(daten.ergebnis)
      const lower = ergebnis.toLowerCase()
      const ok = !lower.includes('nicht bestanden') && !lower.includes('leckage')
      pruefprotokolle.push({
        gewerk: gw,
        titel: tplName,
        datum: str(daten.datum_pruefung),
        pruefer: str(daten.pruefer),
        ergebnis,
        ok,
      })
    } else if (st === 'bautagebuch') {
      const d = str(daten.datum)
      bauDaten.push({ datum: d, stunden: num(daten.arbeitsstunden) })
    } else if (st === 'behinderung') {
      behinderungen.push({
        datum: str(daten.datum),
        grund: str(daten.grund),
        verzug: Math.round(num(daten.geschaetzter_verzug)),
      })
    }
  }

  const datums = bauDaten.map((b) => b.datum).filter(Boolean).sort()
  const bautagebuchStundenSumme = bauDaten.reduce((s, b) => s + b.stunden, 0)

  const punchList = (detail.punch_list ?? []).map((p: PunchListRow) => ({
    gewerk: p.gewerke?.name ?? '—',
    beschreibung: p.beschreibung,
    status: p.status,
  }))

  let regieSummeStunden = 0
  let regieSummeBrutto = 0
  for (const r of regieberichte) {
    regieSummeStunden += r.stunden
    regieSummeBrutto += r.brutto
  }

  let behinderungVerzugSumme = 0
  for (const b of behinderungen) behinderungVerzugSumme += b.verzug

  const planStart = detail.start_datum ?? null
  const planEnde = detail.end_datum ?? null
  const tatsStart = datums.length ? datums[0] : null
  const tatsEnde = datums.length ? datums[datums.length - 1] : detail.abnahme_datum ?? null

  const vbRows = [...(detail.vor_baubeginn_protokolle ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const vb = vbRows.find((r) => r.abgeschlossen)
  const vorBaubeginn = vb
    ? {
        datum: vb.datum,
        bereiche: vb.bereiche_dokumentiert ?? [],
        schaeden: vb.vorhandene_schaeden ?? '',
        besonderheiten: vb.besonderheiten ?? '',
        fotoUrls: vb.foto_urls ?? [],
      }
    : null

  const baustopps = (detail.baustopps ?? []).map((b) => ({
    beginn: b.beginn_datum,
    ende: b.ende_datum,
    typ: b.typ,
    grund: b.grund,
    verzug: Math.max(0, Number(b.verzoegerung_tage ?? 0)),
  }))
  let baustoppVerzugSumme = 0
  for (const b of baustopps) baustoppVerzugSumme += b.verzug

  const finanzEinbehalte = (detail.einbehalte ?? []).map((e) => ({
    handwercher: e.handwerker?.name
      ? `${e.handwerker.name}${e.handwerker.firma ? ` (${e.handwerker.firma})` : ''}`
      : '—',
    einbehaltBetrag: Number(e.einbehalt_betrag ?? 0),
    freigabeDatum: e.freigabe_datum,
  }))

  return {
    pruefprotokolle,
    regieberichte,
    regieSummeStunden,
    regieSummeBrutto,
    bautagebuchAnzahl: bauDaten.length,
    bautagebuchStundenSumme,
    bautagebuchErste: datums.length ? datums[0] : null,
    bautagebuchLetzte: datums.length ? datums[datums.length - 1] : null,
    behinderungen,
    behinderungVerzugSumme,
    punchList,
    planStart,
    planEnde,
    tatsStart,
    tatsEnde,
    vorBaubeginn,
    baustopps,
    baustoppVerzugSumme,
    finanzEinbehalte,
  }
}
