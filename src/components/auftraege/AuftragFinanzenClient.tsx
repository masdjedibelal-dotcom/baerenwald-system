'use client'
import { DateInput } from '@/components/ui/DateInput'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'

import { MockBtn, MockTable } from '@/components/mock-ui'
import { MockField, MockInput, MockSelect } from '@/components/mock-ui/MockForm'
import { openActionConfirm } from '@/components/ui/ConfirmPopup'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useLocalTransition } from '@/components/ui/action-busy'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { DetailHead } from '@/components/layout/EntityDetailLayout'
import { toast } from '@/components/ui/app-toast'
import {
  createBuergschaft,
  createEinbehalt,
  createEingangsrechnung,
  freigebenEinbehalt,
  toggleEingangsrechnungBezahlt,
} from '@/app/(dashboard)/auftraege/auftraege-finanz-actions'
import { Card } from '@/components/ui/Card'
import type {
  AuftragHandwerkerRow,
  Eingangsrechnung,
  EingangsrechnungKategorie,
  Einbehalt,
} from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'
import { formatEuro } from '@/lib/format/geld-datum'
import { TOAST } from '@/lib/copy'

const LIEFERANTEN = ['Hornbach', 'OBI', 'Toom', 'Hagebaumarkt', 'Bauhaus', 'Globus', 'Hellweg', 'Sonstiges']

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
  if (k === 'material') return 'bg-[var(--bg-soft)] text-[var(--text)]'
  if (k === 'lohn') return 'bg-[var(--bw-green-bg)] text-[var(--bw-success)]'
  if (k === 'geraete') return 'bg-[var(--yel-bg)] text-[var(--yel-tx)]'
  if (k === 'entsorgung') return 'bg-[var(--bg-2)] text-[var(--text-2)]'
  return 'bg-[var(--bg-soft)] text-[var(--text-2)]'
}

function einbehaltStatusBadge(s: Einbehalt['status']) {
  if (s === 'einbehalten') return 'bg-[var(--yel-bg)] text-[var(--yel-tx)]'
  if (s === 'buergschaft') return 'bg-[var(--bg-soft)] text-[var(--text)]'
  return 'bg-[var(--bw-green-bg)] text-[var(--bw-success)]'
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
  const [pending, startTransition] = useLocalTransition()
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
        <h2 className="mb-3 text-[length:var(--fs-head)] font-semibold text-ink">Projektmarge</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="p-3 text-[length:var(--fs-text)]">
            <p className="text-muted">Kundenrechnung</p>
            <p className="mt-1 text-[length:var(--fs-head)] font-semibold text-ink">
              {metrics.kundenBrutto != null ? `${formatEuro(metrics.kundenBrutto)}` : 'Noch keine Rechnung'}
            </p>
          </Card>
          <Card className="p-3 text-[length:var(--fs-text)]">
            <p className="text-muted">Kosten gesamt</p>
            <p className="mt-1 text-[length:var(--fs-head)] font-semibold text-ink">{formatEuro(metrics.kostenGesamt)}</p>
          </Card>
          <Card className="p-3 text-[length:var(--fs-text)]">
            <p className="text-muted">Echte Marge €</p>
            <p
              className={cn(
                'mt-1 text-[length:var(--fs-head)] font-semibold',
                metrics.margeEuro == null ? 'text-muted' : metrics.margeEuro >= 0 ? 'text-[var(--bw-success)]' : 'text-[var(--red-tx)]'
              )}
            >
              {metrics.margeEuro != null ? `${formatEuro(metrics.margeEuro)}` : '—'}
            </p>
          </Card>
          <Card className="p-3 text-[length:var(--fs-text)]">
            <p className="text-muted">Echte Marge %</p>
            <p
              className={cn(
                'mt-1 text-[length:var(--fs-head)] font-semibold',
                metrics.margePct == null
                  ? 'text-muted'
                  : metrics.margePct >= 15
                    ? 'text-[var(--bw-success)]'
                    : metrics.margePct >= 5
                      ? 'text-[var(--yel-tx)]'
                      : 'text-[var(--red-tx)]'
              )}
            >
              {metrics.margePct != null ? `${metrics.margePct.toFixed(1)} %` : '—'}
            </p>
          </Card>
        </div>

        <MockTable
          wrapClassName="mt-4 overflow-x-auto rounded-card border border-border"
          className="w-full min-w-[480px] text-left text-[length:var(--fs-text)]"
        >
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
                <td className="px-3 py-2 text-right">{formatEuro(r.betrag)}</td>
                <td className="px-3 py-2 text-right">{r.pct.toFixed(1)} %</td>
              </tr>
            ))}
            <tr className="bg-canvas font-semibold">
              <td className="px-3 py-2">Gesamt Kosten</td>
              <td className="px-3 py-2 text-right">{formatEuro(metrics.breakdownGesamt)}</td>
              <td className="px-3 py-2 text-right">100 %</td>
            </tr>
          </tbody>
        </MockTable>

        {metrics.hatEingang ? (
          <Card className="mt-4 p-3 text-[length:var(--fs-text)]">
            <p className="font-medium text-ink">Kalkuliert vs. echte Marge</p>
            <p className="mt-1 text-muted">
              Kalkuliert (Angebot): <strong>{formatEuro(metrics.kalkMargeMitte)}</strong>
            </p>
            <p className="text-muted">
              Tatsächlich:{' '}
              <strong>{metrics.margeEuro != null ? `${formatEuro(metrics.margeEuro)}` : '—'}</strong>
            </p>
            {metrics.abweichung != null ? (
              <p className="text-muted">
                Abweichung:{' '}
                <strong className={metrics.abweichung >= 0 ? 'text-[var(--bw-success)]' : 'text-[var(--red-tx)]'}>
                  {metrics.abweichung >= 0 ? '+' : ''}
                  {formatEuro(metrics.abweichung)}
                </strong>
              </p>
            ) : null}
          </Card>
        ) : null}
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[length:var(--fs-head)] font-semibold text-ink">Eingangsrechnungen</h2>
          <MockBtn type="button" kind="primary" onClick={() => setErModal(true)}>
            + Eingangsrechnung
          </MockBtn>
        </div>

        <MockTable
          wrapClassName="hidden overflow-x-auto rounded-card border border-border md:block"
          className="w-full min-w-[720px] text-left text-[length:var(--fs-text)]"
        >
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
                  <span className={cn('rounded-card px-2 py-0.5 text-[length:var(--fs-meta)]', katBadgeClass(e.kategorie))}>
                    {katLabel(e.kategorie)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{formatEuro(e.betrag_netto)}</td>
                <td className="px-3 py-2 text-right">{e.mwst_satz} %</td>
                <td className="px-3 py-2 text-right">{formatEuro(e.betrag_brutto)}</td>
                <td className="px-3 py-2 text-muted">{e.rechnungsdatum ? formatDatum(e.rechnungsdatum) : '—'}</td>
                <td className="px-3 py-2">
                  <MockCheckbox
                    checked={e.bezahlt}
                    disabled={pending}
                    onChange={(ev) => {
                      startTransition(async () => {
                        const r = await toggleEingangsrechnungBezahlt(e.id, auftragId, ev.target.checked)
                        if (!r.ok) toast.systemError(r)
                        else toast.success(ev.target.checked ? 'Als bezahlt markiert' : 'Bezahlt zurückgenommen')
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
              <td className="px-3 py-2 text-right">{formatEuro(eingangsrechnungen.reduce((s, e) => s + e.betrag_netto, 0))}</td>
              <td />
              <td className="px-3 py-2 text-right">{formatEuro(metrics.summeEingangsBrutto)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </MockTable>

        <div className="space-y-2 md:hidden">
          {eingangsrechnungen.map((e) => (
            <Card key={e.id} className="p-3 text-[length:var(--fs-text)]">
              <p className="font-semibold text-ink">{e.lieferant}</p>
              {e.beschreibung ? <p className="text-muted">{e.beschreibung}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={cn('rounded-card px-2 py-0.5 text-[length:var(--fs-meta)]', katBadgeClass(e.kategorie))}>{katLabel(e.kategorie)}</span>
                <span className="font-medium">{formatEuro(e.betrag_brutto)} brutto</span>
                {e.rechnungsdatum ? <span className="text-[length:var(--fs-meta)] text-muted">{formatDatum(e.rechnungsdatum)}</span> : null}
              </div>
              <label className="mt-2 flex items-center gap-2 text-[length:var(--fs-meta)]">
                <MockCheckbox
                  checked={e.bezahlt}
                  disabled={pending}
                  onChange={(ev) => {
                    startTransition(async () => {
                      const r = await toggleEingangsrechnungBezahlt(e.id, auftragId, ev.target.checked)
                      if (!r.ok) toast.systemError(r)
                      else toast.success(ev.target.checked ? 'Als bezahlt markiert' : 'Bezahlt zurückgenommen')
                    })
                  }}
                />
                Bezahlt
              </label>
              {e.beleg_url ? (
                <Link href={e.beleg_url} target="_blank" className="mt-1 inline-block text-[length:var(--fs-meta)] text-primary underline">
                  Beleg anzeigen
                </Link>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[length:var(--fs-head)] font-semibold text-ink">Sicherheitseinbehalte</h2>
          <MockBtn type="button" kind="secondary" onClick={() => setEbModal(true)}>
            + Einbehalt erfassen
          </MockBtn>
        </div>
        <Card className="mb-4 border-[color-mix(in_srgb,var(--yel-tx)_35%,var(--border))] bg-[var(--yel-bg)] p-3 text-[length:var(--fs-text)] text-[var(--yel-tx)]">
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
              <Card key={e.id} className={cn('p-4 text-[length:var(--fs-text)]', e.status === 'freigegeben' && 'opacity-70')}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      {e.handwerker?.name ?? '—'}
                      {e.handwerker?.firma ? <span className="text-muted"> · {e.handwerker.firma}</span> : null}
                    </p>
                    <span className={cn('mt-1 inline-block rounded-card px-2 py-0.5 text-[length:var(--fs-meta)]', einbehaltStatusBadge(e.status))}>
                      {e.status === 'einbehalten' ? 'Einbehalten' : e.status === 'buergschaft' ? 'Bürgschaft' : 'Freigegeben'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 grid gap-1 text-muted md:grid-cols-2">
                  <p>Rechnung Brutto: {formatEuro(e.rechnung_brutto)}</p>
                  <p>
                    Einbehalt ({e.einbehalt_prozent}%): {formatEuro(e.einbehalt_betrag)}
                  </p>
                  <p>Ausgezahlt: {formatEuro(e.bezahlt_betrag)}</p>
                  <p>Freigabe am: {formatDatum(e.freigabe_datum)}</p>
                  <p>
                    {tFrei >= 0 ? `Noch ca. ${tFrei} Tag(e) bis Freigabe` : 'Freigabedatum liegt in der Vergangenheit'}
                  </p>
                </div>

                {e.status === 'einbehalten' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MockBtn type="button" kind="secondary" onClick={() => setBuModal(e)}>
                      Bürgschaft hinterlegen
                    </MockBtn>
                    <MockBtn
                      type="button"
                      kind="primary"
                      onClick={() => {
                        openActionConfirm({
                          title: 'Einbehalt freigeben?',
                          body: `Einbehalt von ${formatEuro(e.einbehalt_betrag)} an ${e.handwerker?.name ?? 'Partner'} freigeben?`,
                          confirmLabel: 'Freigeben',
                          cancelLabel: 'Abbrechen',
                          busyLabel: null,
                          onConfirm: () => {
                            startTransition(async () => {
                              const r = await freigebenEinbehalt(e.id, auftragId)
                              if (!r.ok) toast.systemError(r)
                              else toast.success(TOAST.freigegeben)
                            })
                          },
                        })
                      }}
                    >
                      Freigeben
                    </MockBtn>
                  </div>
                ) : null}

                {e.status === 'buergschaft' && b ? (
                  <div className="mt-3 rounded-card border border-border bg-canvas p-2 text-[length:var(--fs-meta)]">
                    <p>Urkunden-Nr.: {b.urkunden_nummer}</p>
                    <p>Bank: {b.bank ?? '—'}</p>
                    <p>Gültig bis: {formatDatum(b.gueltig_bis)}</p>
                    <span
                      className={cn(
                        'mt-2 inline-block rounded-card px-2 py-0.5',
                        buerTage > 30
                          ? 'bg-[var(--bw-green-bg)] text-[var(--bw-success)]'
                          : buerTage > 0
                            ? 'bg-[var(--yel-bg)] text-[var(--yel-tx)]'
                            : 'bg-[var(--red-bg)] text-[var(--red-tx)]'
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
                  <p className="mt-2 text-[length:var(--fs-meta)] text-muted">Freigegeben am {formatDatum(e.freigegeben_at.slice(0, 10))}</p>
                ) : null}
              </Card>
            )
          })}
        </div>

        <Card className="mt-4 p-3 text-[length:var(--fs-text)]">
          <p>Einbehalten gesamt: {formatEuro(summenEin.ein)}</p>
          <p>Mit Bürgschaft: {formatEuro(summenEin.buer)}</p>
          <p>Freigegeben: {formatEuro(summenEin.frei)}</p>
        </Card>
      </section>

      <EditorSheet open={erModal} onClose={() => setErModal(false)} title="Eingangsrechnung" size="md">
            <div className="space-y-3 text-[length:var(--fs-text)] max-h-[60vh] overflow-y-auto">
              <label className="block">
                Lieferant *
                <MockInput list="lief" value={lieferant} onChange={(e) => setLieferant(e.target.value)} className="mt-1 w-full rounded-card border border-border px-3 py-2" />
                <datalist id="lief">
                  {LIEFERANTEN.map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                Beschreibung
                <MockField label="Beschreibung"><RichTextEditor value={typeof (beschreibung) === 'string' ? (beschreibung) : ''} onChange={(__v) => setBeschreibung(__v)} minHeight={120} aria-label="Beschreibung" /></MockField>
              </label>
              <label className="block">
                Kategorie *
                <MockSelect value={kat} onChange={(e) => setKat(e.target.value as EingangsrechnungKategorie)} className="mt-1 w-full rounded-card border border-border px-3 py-2">
                  <option value="material">Material</option>
                  <option value="lohn">Lohn</option>
                  <option value="geraete">Geräte &amp; Miete</option>
                  <option value="entsorgung">Entsorgung</option>
                  <option value="sonstiges">Sonstiges</option>
                </MockSelect>
              </label>
              <label className="block">
                Betrag Netto *
                <MockInput value={netto} onChange={(e) => setNetto(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-card border border-border px-3 py-2" />
              </label>
              <label className="block">
                MwSt
                <MockSelect value={mwst} onChange={(e) => setMwst(Number(e.target.value))} className="mt-1 w-full rounded-card border border-border px-3 py-2">
                  <option value={19}>19 %</option>
                  <option value={7}>7 %</option>
                  <option value={0}>0 %</option>
                </MockSelect>
              </label>
              <p className="text-muted">
                Brutto (auto): <strong>{formatEuro(bruttoPreview)}</strong>
              </p>
              <label className="block">
                Rechnungsdatum
                <DateInput value={rdatum} onChange={(e) => setRdatum(e.target.value)} className="mt-1 w-full rounded-card border border-border px-3 py-2" />
              </label>
              <label className="block">
                Fällig am
                <DateInput value={faellig} onChange={(e) => setFaellig(e.target.value)} className="mt-1 w-full rounded-card border border-border px-3 py-2" />
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
                        toast.success(TOAST.beleg_hochgeladen)
                      } catch (err) {
                        toast.systemError(err, 'ui', 'Upload fehlgeschlagen')
                      }
                    })
                  }}
                  className="mt-1 w-full text-[length:var(--fs-meta)]"
                />
              </label>
              <label className="block">
                Notizen
                <MockField label="Notizen"><RichTextEditor value={typeof (erNotiz) === 'string' ? (erNotiz) : ''} onChange={(__v) => setErNotiz(__v)} minHeight={120} aria-label="Notizen" /></MockField>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <MockBtn kind="secondary" onClick={() => setErModal(false)}>
                Abbrechen
              </MockBtn>
              <MockBtn
                kind="primary"
                loading={pending}
                onClick={() => {
                  if (!lieferant.trim()) {
                    toast.error(TOAST.lieferant_ausfuellen)
                    return
                  }
                  const n = Number(String(netto).replace(',', '.'))
                  if (!Number.isFinite(n) || n <= 0) {
                    toast.error(TOAST.netto_betrag_pruefen)
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
                    if (!r.ok) toast.systemError(r)
                    else {
                      toast.success(TOAST.gespeichert)
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
              </MockBtn>
            </div>
      </EditorSheet>

      <EditorSheet open={ebModal} onClose={() => setEbModal(false)} title="Einbehalt" size="md">
            <div className="space-y-3 text-[length:var(--fs-text)]">
              <label className="block">
                Partner
                <MockSelect value={ebHw} onChange={(e) => setEbHw(e.target.value)} className="mt-1 w-full rounded-card border border-border px-3 py-2">
                  {zuweisungen.map((z) => (
                    <option key={z.id} value={z.handwerker_id}>
                      {z.handwerker?.name ?? z.handwerker_id}
                    </option>
                  ))}
                </MockSelect>
              </label>
              <label className="block">
                Rechnung Brutto *
                <MockInput value={ebBrutto} onChange={(e) => setEbBrutto(e.target.value)} className="mt-1 w-full rounded-card border border-border px-3 py-2" />
              </label>
              <label className="block">
                Einbehalt %
                <MockInput value={ebPct} onChange={(e) => setEbPct(e.target.value)} className="mt-1 w-full rounded-card border border-border px-3 py-2" />
              </label>
              <p className="text-muted">
                Einbehalt: <strong>{formatEuro(einbehaltPreview.einbehalt)}</strong> · Ausgezahlt:{' '}
                <strong>{formatEuro(einbehaltPreview.bezahlt)}</strong>
              </p>
              <label className="block">
                Freigabe am
                <DateInput value={ebFreigabe} onChange={(e) => setEbFreigabe(e.target.value)} className="mt-1 w-full rounded-card border border-border px-3 py-2" />
              </label>
              <label className="block">
                Notizen
                <MockField label="Notizen"><RichTextEditor value={typeof (ebNotiz) === 'string' ? (ebNotiz) : ''} onChange={(__v) => setEbNotiz(__v)} minHeight={120} aria-label="Notizen" /></MockField>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <MockBtn kind="secondary" onClick={() => setEbModal(false)}>
                Abbrechen
              </MockBtn>
              <MockBtn
                kind="primary"
                loading={pending}
                onClick={() => {
                  const b = Number(String(ebBrutto).replace(',', '.'))
                  if (!ebHw || !Number.isFinite(b) || b <= 0) {
                    toast.error(TOAST.pflichtfelder_pruefen)
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
                    if (!r.ok) toast.systemError(r)
                    else {
                      toast.success(TOAST.einbehalt_gespeichert)
                      setEbModal(false)
                    }
                  })
                }}
              >
                Speichern
              </MockBtn>
            </div>
      </EditorSheet>

      <EditorSheet
        open={!!buModal}
        onClose={() => setBuModal(null)}
        title="Bürgschaft"
        size="md"
      >
        {buModal ? (
          <>
            <p className="-mt-1 mb-3 text-[length:var(--fs-text)] text-muted">
              Partner: {buModal.handwerker?.name ?? '—'} · Einbehalt: {formatEuro(buModal.einbehalt_betrag)}
            </p>
            <div className="space-y-3 text-[length:var(--fs-text)]">
              <label className="block">
                Urkunden-Nummer *
                <MockInput value={buNr} onChange={(e) => setBuNr(e.target.value)} className="mt-1 w-full rounded-card border border-border px-3 py-2" />
                <span className="text-[length:var(--fs-meta)] text-muted">Von der Bank ausgestellt</span>
              </label>
              <label className="block">
                Bank
                <MockInput value={buBank} onChange={(e) => setBuBank(e.target.value)} className="mt-1 w-full rounded-card border border-border px-3 py-2" />
              </label>
              <label className="block">
                Betrag *
                <MockInput value={buBetrag} onChange={(e) => setBuBetrag(e.target.value)} placeholder={String(buModal.einbehalt_betrag)} className="mt-1 w-full rounded-card border border-border px-3 py-2" />
              </label>
              <label className="block">
                Gültig bis * (mind. bis {formatDatum(buModal.freigabe_datum)})
                <DateInput value={buBis} onChange={(e) => setBuBis(e.target.value)} className="mt-1 w-full rounded-card border border-border px-3 py-2" />
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
                        toast.success(TOAST.dokumentHochgeladen)
                      } catch (err) {
                        toast.systemError(err, 'ui', 'Upload fehlgeschlagen')
                      }
                    })
                  }}
                  className="mt-1 w-full text-[length:var(--fs-meta)]"
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <MockBtn kind="secondary" onClick={() => setBuModal(null)}>
                Abbrechen
              </MockBtn>
              <MockBtn
                kind="primary"
                loading={pending}
                onClick={() => {
                  const bet = Number(String(buBetrag || buModal.einbehalt_betrag).replace(',', '.'))
                  if (!buNr.trim() || !buBis) {
                    toast.error(TOAST.pflichtfelder_ausfuellen)
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
                    if (!r.ok) toast.systemError(r)
                    else {
                      toast.success(TOAST.buergschaft_gespeichert)
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
              </MockBtn>
            </div>
          </>
        ) : null}
      </EditorSheet>
    </div>
  )
}
