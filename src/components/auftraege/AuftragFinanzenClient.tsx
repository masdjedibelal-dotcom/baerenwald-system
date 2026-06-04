'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { DetailHead } from '@/components/layout/DetailHead'
import { toast } from '@/components/ui/app-toast'
import {
  createBuergschaft,
  createEinbehalt,
  createEingangsrechnung,
  freigebenEinbehalt,
  toggleEingangsrechnungBezahlt,
} from '@/app/(dashboard)/auftraege/auftraege-finanz-actions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import type {
  AuftragHandwerkerRow,
  Eingangsrechnung,
  EingangsrechnungKategorie,
  Einbehalt,
} from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'

const LIEFERANTEN = ['Hornbach', 'OBI', 'Toom', 'Hagebaumarkt', 'Bauhaus', 'Globus', 'Hellweg', 'Sonstiges']

function fmtEuro(n: number) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function addDays(iso: string | null, days: number): string {
  const s = iso?.trim()
  const d0 = s ? new Date(s.includes('T') ? s : `${s}T12:00:00`) : new Date()
  const d = new Date(d0)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function tageBis(iso: string): number {
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - t.getTime()) / 86400000)
}

function katLabel(k: EingangsrechnungKategorie) {
  if (k === 'material') return 'Material'
  if (k === 'lohn') return 'Lohn'
  if (k === 'geraete') return 'Geräte & Miete'
  if (k === 'entsorgung') return 'Entsorgung'
  return 'Sonstiges'
}

function katBadgeClass(k: EingangsrechnungKategorie) {
  if (k === 'material') return 'bg-blue-100 text-blue-900'
  if (k === 'lohn') return 'bg-emerald-100 text-emerald-900'
  if (k === 'geraete') return 'bg-amber-100 text-amber-950'
  if (k === 'entsorgung') return 'bg-zinc-200 text-zinc-900'
  return 'bg-slate-100 text-slate-800'
}

function einbehaltStatusBadge(s: Einbehalt['status']) {
  if (s === 'einbehalten') return 'bg-amber-100 text-amber-950'
  if (s === 'buergschaft') return 'bg-blue-100 text-blue-900'
  return 'bg-emerald-100 text-emerald-900'
}

export function AuftragFinanzenClient({
  auftragId,
  projektTitel,
  kundeName,
  einbehalte,
  eingangsrechnungen,
  zuweisungen,
  defaultFreigabeDatum,
  metrics,
  embedded = false,
}: {
  auftragId: string
  projektTitel?: string | null
  kundeName?: string | null
  einbehalte: Einbehalt[]
  eingangsrechnungen: Eingangsrechnung[]
  zuweisungen: AuftragHandwerkerRow[]
  defaultFreigabeDatum: string
  embedded?: boolean
  metrics: {
    kundenBrutto: number | null
    kostenGesamt: number
    margeEuro: number | null
    margePct: number | null
    kalkMargeMitte: number
    abweichung: number | null
    hatEingang: boolean
    breakdownRows: { key: string; label: string; betrag: number; pct: number }[]
    breakdownGesamt: number
    summeEingangsBrutto: number
    summeEinbehaltBrutto: number
  }
}) {
  const [pending, startTransition] = useTransition()
  const [erModal, setErModal] = useState(false)
  const [ebModal, setEbModal] = useState(false)
  const [buModal, setBuModal] = useState<Einbehalt | null>(null)

  const [lieferant, setLieferant] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [kat, setKat] = useState<EingangsrechnungKategorie>('material')
  const [netto, setNetto] = useState('')
  const [mwst, setMwst] = useState(19)
  const [rdatum, setRdatum] = useState(() => new Date().toISOString().slice(0, 10))
  const [faellig, setFaellig] = useState(() => addDays(new Date().toISOString().slice(0, 10), 14))
  const [belegUrl, setBelegUrl] = useState<string | null>(null)
  const [erNotiz, setErNotiz] = useState('')

  const [ebHw, setEbHw] = useState(zuweisungen[0]?.handwerker_id ?? '')
  const [ebBrutto, setEbBrutto] = useState('')
  const [ebPct, setEbPct] = useState('5')
  const [ebFreigabe, setEbFreigabe] = useState(defaultFreigabeDatum)
  const [ebNotiz, setEbNotiz] = useState('')

  const [buNr, setBuNr] = useState('')
  const [buBank, setBuBank] = useState('')
  const [buBetrag, setBuBetrag] = useState('')
  const [buBis, setBuBis] = useState('')
  const [buDoc, setBuDoc] = useState<string | null>(null)

  const bruttoPreview = useMemo(() => {
    const n = Math.max(0, Number(String(netto).replace(',', '.')) || 0)
    return Math.round(n * (1 + mwst / 100) * 100) / 100
  }, [netto, mwst])

  const einbehaltPreview = useMemo(() => {
    const b = Math.max(0, Number(String(ebBrutto).replace(',', '.')) || 0)
    const p = Math.max(0, Math.min(100, Number(String(ebPct).replace(',', '.')) || 0))
    const e = Math.round((b * p) / 100 * 100) / 100
    const z = Math.round((b - e) * 100) / 100
    return { einbehalt: e, bezahlt: z }
  }, [ebBrutto, ebPct])

  async function uploadBeleg(file: File, typ: 'eingang' | 'buergschaft') {
    const fd = new FormData()
    fd.set('file', file)
    fd.set('filename', file.name)
    const path = typ === 'eingang' ? 'eingangsrechnungen' : 'buergschaften'
    const res = await fetch(`/api/auftraege/${auftragId}/${path}/upload`, { method: 'POST', body: fd })
    const j = (await res.json()) as { url?: string; error?: string }
    if (!res.ok || !j.url) throw new Error(j.error ?? 'Upload fehlgeschlagen')
    return j.url
  }

  const summenEin = useMemo(() => {
    let ein = 0
    let buer = 0
    let frei = 0
    for (const e of einbehalte) {
      if (e.status === 'einbehalten') ein += e.einbehalt_betrag
      if (e.status === 'buergschaft') buer += e.einbehalt_betrag
      if (e.status === 'freigegeben') frei += e.einbehalt_betrag
    }
    return { ein, buer, frei }
  }, [einbehalte])

  const headSub = [kundeName?.trim(), projektTitel?.trim()].filter(Boolean).join(' · ')

  return (
    <div className={embedded ? 'min-w-0 space-y-6' : 'space-y-6 pb-0'}>
      {!embedded ? (
        <DetailHead
          backHref={`/auftraege/${auftragId}`}
          backLabel="Zurück zum Auftrag"
          title="Finanzen"
          sub={headSub || undefined}
        />
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Projektmarge</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="p-3 text-sm">
            <p className="text-muted">Kundenrechnung</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {metrics.kundenBrutto != null ? `${fmtEuro(metrics.kundenBrutto)} €` : 'Noch keine Rechnung'}
            </p>
          </Card>
          <Card className="p-3 text-sm">
            <p className="text-muted">Kosten gesamt</p>
            <p className="mt-1 text-lg font-semibold text-ink">{fmtEuro(metrics.kostenGesamt)} €</p>
          </Card>
          <Card className="p-3 text-sm">
            <p className="text-muted">Echte Marge €</p>
            <p
              className={cn(
                'mt-1 text-lg font-semibold',
                metrics.margeEuro == null ? 'text-muted' : metrics.margeEuro >= 0 ? 'text-emerald-700' : 'text-red-700'
              )}
            >
              {metrics.margeEuro != null ? `${fmtEuro(metrics.margeEuro)} €` : '—'}
            </p>
          </Card>
          <Card className="p-3 text-sm">
            <p className="text-muted">Echte Marge %</p>
            <p
              className={cn(
                'mt-1 text-lg font-semibold',
                metrics.margePct == null
                  ? 'text-muted'
                  : metrics.margePct >= 15
                    ? 'text-emerald-700'
                    : metrics.margePct >= 5
                      ? 'text-amber-700'
                      : 'text-red-700'
              )}
            >
              {metrics.margePct != null ? `${metrics.margePct.toFixed(1)} %` : '—'}
            </p>
          </Card>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-muted">
                <th className="px-3 py-2">Kategorie</th>
                <th className="px-3 py-2 text-right">Betrag</th>
                <th className="px-3 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {metrics.breakdownRows.map((r) => (
                <tr key={r.key} className="border-b border-border">
                  <td className="px-3 py-2">{r.label}</td>
                  <td className="px-3 py-2 text-right">{fmtEuro(r.betrag)} €</td>
                  <td className="px-3 py-2 text-right">{r.pct.toFixed(1)} %</td>
                </tr>
              ))}
              <tr className="bg-canvas font-semibold">
                <td className="px-3 py-2">Gesamt Kosten</td>
                <td className="px-3 py-2 text-right">{fmtEuro(metrics.breakdownGesamt)} €</td>
                <td className="px-3 py-2 text-right">100 %</td>
              </tr>
            </tbody>
          </table>
        </div>

        {metrics.hatEingang ? (
          <Card className="mt-4 p-3 text-sm">
            <p className="font-medium text-ink">Kalkuliert vs. echte Marge</p>
            <p className="mt-1 text-muted">
              Kalkuliert (Angebot): <strong>{fmtEuro(metrics.kalkMargeMitte)} €</strong>
            </p>
            <p className="text-muted">
              Tatsächlich:{' '}
              <strong>{metrics.margeEuro != null ? `${fmtEuro(metrics.margeEuro)} €` : '—'}</strong>
            </p>
            {metrics.abweichung != null ? (
              <p className="text-muted">
                Abweichung:{' '}
                <strong className={metrics.abweichung >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                  {metrics.abweichung >= 0 ? '+' : ''}
                  {fmtEuro(metrics.abweichung)} €
                </strong>
              </p>
            ) : null}
          </Card>
        ) : null}
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Eingangsrechnungen</h2>
          <Button type="button" variant="primary" onClick={() => setErModal(true)}>
            + Eingangsrechnung
          </Button>
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-muted">
                <th className="px-3 py-2">Lieferant</th>
                <th className="px-3 py-2">Kategorie</th>
                <th className="px-3 py-2 text-right">Netto</th>
                <th className="px-3 py-2 text-right">MwSt</th>
                <th className="px-3 py-2 text-right">Brutto</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Bezahlt</th>
                <th className="px-3 py-2">Beleg</th>
              </tr>
            </thead>
            <tbody>
              {eingangsrechnungen.map((e) => (
                <tr key={e.id} className="border-b border-border">
                  <td className="px-3 py-2 font-medium">{e.lieferant}</td>
                  <td className="px-3 py-2">
                    <span className={cn('rounded px-2 py-0.5 text-xs', katBadgeClass(e.kategorie))}>
                      {katLabel(e.kategorie)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{fmtEuro(e.betrag_netto)} €</td>
                  <td className="px-3 py-2 text-right">{e.mwst_satz} %</td>
                  <td className="px-3 py-2 text-right">{fmtEuro(e.betrag_brutto)} €</td>
                  <td className="px-3 py-2 text-muted">{e.rechnungsdatum ? formatDatum(e.rechnungsdatum) : '—'}</td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={e.bezahlt}
                      disabled={pending}
                      onChange={(ev) => {
                        startTransition(async () => {
                          const r = await toggleEingangsrechnungBezahlt(e.id, auftragId, ev.target.checked)
                          if (!r.ok) toast.error(r.message)
                          else toast.success('Gespeichert')
                        })
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {e.beleg_url ? (
                      <a href={e.beleg_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        PDF
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-canvas font-semibold">
                <td colSpan={2} className="px-3 py-2">
                  Summen
                </td>
                <td className="px-3 py-2 text-right">{fmtEuro(eingangsrechnungen.reduce((s, e) => s + e.betrag_netto, 0))} €</td>
                <td />
                <td className="px-3 py-2 text-right">{fmtEuro(metrics.summeEingangsBrutto)} €</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="space-y-2 md:hidden">
          {eingangsrechnungen.map((e) => (
            <Card key={e.id} className="p-3 text-sm">
              <p className="font-semibold text-ink">{e.lieferant}</p>
              {e.beschreibung ? <p className="text-muted">{e.beschreibung}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={cn('rounded px-2 py-0.5 text-xs', katBadgeClass(e.kategorie))}>{katLabel(e.kategorie)}</span>
                <span className="font-medium">{fmtEuro(e.betrag_brutto)} € brutto</span>
                {e.rechnungsdatum ? <span className="text-xs text-muted">{formatDatum(e.rechnungsdatum)}</span> : null}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={e.bezahlt}
                  disabled={pending}
                  onChange={(ev) => {
                    startTransition(async () => {
                      const r = await toggleEingangsrechnungBezahlt(e.id, auftragId, ev.target.checked)
                      if (!r.ok) toast.error(r.message)
                    })
                  }}
                />
                Bezahlt
              </label>
              {e.beleg_url ? (
                <Link href={e.beleg_url} target="_blank" className="mt-1 inline-block text-xs text-primary underline">
                  Beleg anzeigen
                </Link>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Sicherheitseinbehalte</h2>
          <Button type="button" variant="secondary" onClick={() => setEbModal(true)}>
            + Einbehalt erfassen
          </Button>
        </div>
        <Card className="mb-4 border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950">
          Sicherheitseinbehalte schützen Sie während der Gewährleistungsfrist von 5 Jahren. Standard: 5 % der
          Bruttosumme.
        </Card>

        <div className="space-y-3">
          {einbehalte.map((e) => {
            const tFrei = tageBis(e.freigabe_datum)
            const b = e.buergschaften?.[0]
            let buerTage = 999
            if (b?.gueltig_bis) buerTage = tageBis(b.gueltig_bis)
            return (
              <Card key={e.id} className={cn('p-4 text-sm', e.status === 'freigegeben' && 'opacity-70')}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      {e.handwerker?.name ?? '—'}
                      {e.handwerker?.firma ? <span className="text-muted"> · {e.handwerker.firma}</span> : null}
                    </p>
                    <span className={cn('mt-1 inline-block rounded px-2 py-0.5 text-xs', einbehaltStatusBadge(e.status))}>
                      {e.status === 'einbehalten' ? 'Einbehalten' : e.status === 'buergschaft' ? 'Bürgschaft' : 'Freigegeben'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 grid gap-1 text-muted md:grid-cols-2">
                  <p>Rechnung Brutto: {fmtEuro(e.rechnung_brutto)} €</p>
                  <p>
                    Einbehalt ({e.einbehalt_prozent}%): {fmtEuro(e.einbehalt_betrag)} €
                  </p>
                  <p>Ausgezahlt: {fmtEuro(e.bezahlt_betrag)} €</p>
                  <p>Freigabe am: {formatDatum(e.freigabe_datum)}</p>
                  <p>
                    {tFrei >= 0 ? `Noch ca. ${tFrei} Tag(e) bis Freigabe` : 'Freigabedatum liegt in der Vergangenheit'}
                  </p>
                </div>

                {e.status === 'einbehalten' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setBuModal(e)}>
                      Bürgschaft hinterlegen
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        if (!confirm(`Einbehalt von ${fmtEuro(e.einbehalt_betrag)} € an ${e.handwerker?.name ?? 'Handwerker'} freigeben?`)) return
                        startTransition(async () => {
                          const r = await freigebenEinbehalt(e.id, auftragId)
                          if (!r.ok) toast.error(r.message)
                          else toast.success('Freigegeben')
                        })
                      }}
                    >
                      Freigeben
                    </Button>
                  </div>
                ) : null}

                {e.status === 'buergschaft' && b ? (
                  <div className="mt-3 rounded border border-border bg-canvas p-2 text-xs">
                    <p>Urkunden-Nr.: {b.urkunden_nummer}</p>
                    <p>Bank: {b.bank ?? '—'}</p>
                    <p>Gültig bis: {formatDatum(b.gueltig_bis)}</p>
                    <span
                      className={cn(
                        'mt-2 inline-block rounded px-2 py-0.5',
                        buerTage > 30 ? 'bg-emerald-100 text-emerald-900' : buerTage > 0 ? 'bg-amber-100 text-amber-950' : 'bg-red-100 text-red-900'
                      )}
                    >
                      {buerTage > 30 ? '> 30 Tage gültig' : buerTage > 0 ? `≤ ${buerTage} Tage` : 'Abgelaufen'}
                    </span>
                    {b.dokument_url ? (
                      <a href={b.dokument_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary underline">
                        Dokument
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {e.status === 'freigegeben' && e.freigegeben_at ? (
                  <p className="mt-2 text-xs text-muted">Freigegeben am {formatDatum(e.freigegeben_at.slice(0, 10))}</p>
                ) : null}
              </Card>
            )
          })}
        </div>

        <Card className="mt-4 p-3 text-sm">
          <p>Einbehalten gesamt: {fmtEuro(summenEin.ein)} €</p>
          <p>Mit Bürgschaft: {fmtEuro(summenEin.buer)} €</p>
          <p>Freigegeben: {fmtEuro(summenEin.frei)} €</p>
        </Card>
      </section>

      <Modal open={erModal} onClose={() => setErModal(false)} title="Eingangsrechnung" size="md">
            <div className="space-y-3 text-sm max-h-[60vh] overflow-y-auto">
              <label className="block">
                Lieferant *
                <input list="lief" value={lieferant} onChange={(e) => setLieferant(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2" />
                <datalist id="lief">
                  {LIEFERANTEN.map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                Beschreibung
                <Textarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} rows={2} label="Beschreibung" />
              </label>
              <label className="block">
                Kategorie *
                <select value={kat} onChange={(e) => setKat(e.target.value as EingangsrechnungKategorie)} className="mt-1 w-full rounded border border-border px-3 py-2">
                  <option value="material">Material</option>
                  <option value="lohn">Lohn</option>
                  <option value="geraete">Geräte &amp; Miete</option>
                  <option value="entsorgung">Entsorgung</option>
                  <option value="sonstiges">Sonstiges</option>
                </select>
              </label>
              <label className="block">
                Betrag Netto *
                <input value={netto} onChange={(e) => setNetto(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded border border-border px-3 py-2" />
              </label>
              <label className="block">
                MwSt
                <select value={mwst} onChange={(e) => setMwst(Number(e.target.value))} className="mt-1 w-full rounded border border-border px-3 py-2">
                  <option value={19}>19 %</option>
                  <option value={7}>7 %</option>
                  <option value={0}>0 %</option>
                </select>
              </label>
              <p className="text-muted">
                Brutto (auto): <strong>{fmtEuro(bruttoPreview)} €</strong>
              </p>
              <label className="block">
                Rechnungsdatum
                <input type="date" value={rdatum} onChange={(e) => setRdatum(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2" />
              </label>
              <label className="block">
                Fällig am
                <input type="date" value={faellig} onChange={(e) => setFaellig(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2" />
              </label>
              <label className="block">
                Beleg
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  disabled={pending}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    startTransition(async () => {
                      try {
                        const url = await uploadBeleg(f, 'eingang')
                        setBelegUrl(url)
                        toast.success('Beleg hochgeladen')
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
                      }
                    })
                  }}
                  className="mt-1 w-full text-xs"
                />
              </label>
              <label className="block">
                Notizen
                <Textarea value={erNotiz} onChange={(e) => setErNotiz(e.target.value)} rows={2} label="Notizen" />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => setErModal(false)}>
                Abbrechen
              </Button>
              <Button
                variant="primary"
                loading={pending}
                onClick={() => {
                  if (!lieferant.trim()) {
                    toast.error('Lieferant ausfüllen')
                    return
                  }
                  const n = Number(String(netto).replace(',', '.'))
                  if (!Number.isFinite(n) || n <= 0) {
                    toast.error('Netto-Betrag prüfen')
                    return
                  }
                  startTransition(async () => {
                    const r = await createEingangsrechnung({
                      auftragId,
                      lieferant: lieferant.trim(),
                      beschreibung: beschreibung.trim(),
                      kategorie: kat,
                      betrag_netto: n,
                      mwst_satz: mwst,
                      betrag_brutto: bruttoPreview,
                      rechnungsdatum: rdatum,
                      faellig_am: faellig,
                      beleg_url: belegUrl,
                      notizen: erNotiz,
                    })
                    if (!r.ok) toast.error(r.message)
                    else {
                      toast.success('Gespeichert')
                      setErModal(false)
                      setLieferant('')
                      setBeschreibung('')
                      setNetto('')
                      setBelegUrl(null)
                      setErNotiz('')
                    }
                  })
                }}
              >
                Speichern
              </Button>
            </div>
      </Modal>

      <Modal open={ebModal} onClose={() => setEbModal(false)} title="Einbehalt" size="md">
            <div className="space-y-3 text-sm">
              <label className="block">
                Handwerker
                <select value={ebHw} onChange={(e) => setEbHw(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2">
                  {zuweisungen.map((z) => (
                    <option key={z.id} value={z.handwerker_id}>
                      {z.handwerker?.name ?? z.handwerker_id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Rechnung Brutto *
                <input value={ebBrutto} onChange={(e) => setEbBrutto(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2" />
              </label>
              <label className="block">
                Einbehalt %
                <input value={ebPct} onChange={(e) => setEbPct(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2" />
              </label>
              <p className="text-muted">
                Einbehalt: <strong>{fmtEuro(einbehaltPreview.einbehalt)} €</strong> · Ausgezahlt:{' '}
                <strong>{fmtEuro(einbehaltPreview.bezahlt)} €</strong>
              </p>
              <label className="block">
                Freigabe am
                <input type="date" value={ebFreigabe} onChange={(e) => setEbFreigabe(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2" />
              </label>
              <label className="block">
                Notizen
                <Textarea value={ebNotiz} onChange={(e) => setEbNotiz(e.target.value)} rows={2} label="Notizen" />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => setEbModal(false)}>
                Abbrechen
              </Button>
              <Button
                variant="primary"
                loading={pending}
                onClick={() => {
                  const b = Number(String(ebBrutto).replace(',', '.'))
                  if (!ebHw || !Number.isFinite(b) || b <= 0) {
                    toast.error('Pflichtfelder prüfen')
                    return
                  }
                  startTransition(async () => {
                    const r = await createEinbehalt({
                      auftragId,
                      handwerker_id: ebHw,
                      rechnung_brutto: b,
                      einbehalt_prozent: Number(String(ebPct).replace(',', '.')) || 5,
                      freigabe_datum: ebFreigabe,
                      notizen: ebNotiz,
                    })
                    if (!r.ok) toast.error(r.message)
                    else {
                      toast.success('Einbehalt gespeichert')
                      setEbModal(false)
                    }
                  })
                }}
              >
                Speichern
              </Button>
            </div>
      </Modal>

      <Modal
        open={!!buModal}
        onClose={() => setBuModal(null)}
        title="Bürgschaft"
        size="md"
      >
        {buModal ? (
          <>
            <p className="-mt-1 mb-3 text-sm text-muted">
              Handwerker: {buModal.handwerker?.name ?? '—'} · Einbehalt: {fmtEuro(buModal.einbehalt_betrag)} €
            </p>
            <div className="space-y-3 text-sm">
              <label className="block">
                Urkunden-Nummer *
                <input value={buNr} onChange={(e) => setBuNr(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2" />
                <span className="text-xs text-muted">Von der Bank ausgestellt</span>
              </label>
              <label className="block">
                Bank
                <input value={buBank} onChange={(e) => setBuBank(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2" />
              </label>
              <label className="block">
                Betrag *
                <input
                  value={buBetrag}
                  onChange={(e) => setBuBetrag(e.target.value)}
                  placeholder={String(buModal.einbehalt_betrag)}
                  className="mt-1 w-full rounded border border-border px-3 py-2"
                />
              </label>
              <label className="block">
                Gültig bis * (mind. bis {formatDatum(buModal.freigabe_datum)})
                <input type="date" value={buBis} onChange={(e) => setBuBis(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2" />
              </label>
              <label className="block">
                Dokument (PDF)
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  disabled={pending}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    startTransition(async () => {
                      try {
                        const url = await uploadBeleg(f, 'buergschaft')
                        setBuDoc(url)
                        toast.success('Dokument hochgeladen')
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
                      }
                    })
                  }}
                  className="mt-1 w-full text-xs"
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => setBuModal(null)}>
                Abbrechen
              </Button>
              <Button
                variant="primary"
                loading={pending}
                onClick={() => {
                  const bet = Number(String(buBetrag || buModal.einbehalt_betrag).replace(',', '.'))
                  if (!buNr.trim() || !buBis) {
                    toast.error('Pflichtfelder ausfüllen')
                    return
                  }
                  startTransition(async () => {
                    const r = await createBuergschaft({
                      einbehaltId: buModal.id,
                      auftragId,
                      handwerker_id: buModal.handwerker_id,
                      urkunden_nummer: buNr.trim(),
                      bank: buBank,
                      betrag: bet,
                      gueltig_bis: buBis,
                      dokument_url: buDoc,
                    })
                    if (!r.ok) toast.error(r.message)
                    else {
                      toast.success('Bürgschaft gespeichert')
                      setBuModal(null)
                      setBuNr('')
                      setBuBank('')
                      setBuBetrag('')
                      setBuBis('')
                      setBuDoc(null)
                    }
                  })
                }}
              >
                Speichern
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  )
}
