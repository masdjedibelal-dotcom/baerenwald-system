'use client'

import Link from 'next/link'
import { useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { RecordLayout } from '@/components/layout/RecordLayout'
import { Accordion } from '@/components/ui/Accordion'
import { PropertyRow } from '@/components/ui/PropertyRow'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { DocCard } from '@/components/ui/DocCard'
import { PdfViewer } from '@/components/ui/PdfViewer'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { AngebotStatusBadge } from '@/components/ui/AngebotStatusBadge'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { CustomFieldRenderer } from '@/components/ui/CustomFieldRenderer'
import { KundenZeitstrahl } from '@/components/kunden/KundenZeitstrahl'
import { kundenAvatarClass, kundenInitialen, TypBadge } from '@/components/kunden/TypBadge'
import { addKundenNotiz, deleteKundenNotiz, saveKundeCustomFieldValue } from '@/app/actions/kunden'
import type { KundeDetailPayload } from '@/lib/kunden/load-kunde-detail'
import type { CustomFieldDefinition, CustomFieldValueRow } from '@/lib/custom-fields'
import type { AngebotStatus, AuftragStatus, LeadStatus } from '@/lib/types'
import { formatDatum, formatRelativeDate, formatPreis } from '@/lib/utils'
import { cn } from '@/lib/utils'

const QUELLE_LABELS: Record<string, string> = {
  website: 'Website',
  empfehlung: 'Empfehlung',
  telefon: 'Telefon',
  social: 'Social Media',
  sonstiges: 'Sonstiges',
}

function formatEur(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

function mapsUrl(k: KundeDetailPayload) {
  const q = [k.adresse, k.plz, k.ort].filter(Boolean).join(', ')
  if (!q.trim()) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

function angebotAgg(
  a: { angebote?: { gesamt_min: number | null; gesamt_max: number | null } | { gesamt_min: number | null; gesamt_max: number | null }[] | null } | null
) {
  const ag = a?.angebote
  if (!ag) return null
  return Array.isArray(ag) ? ag[0] : ag
}

export function KundeDetailClient({
  kunde,
  customFieldDefs,
  customValues: initialValues,
}: {
  kunde: KundeDetailPayload
  customFieldDefs: CustomFieldDefinition[]
  customValues: CustomFieldValueRow[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState('uebersicht')
  const [notizNeu, setNotizNeu] = useState('')
  const [pending, startTransition] = useTransition()
  const [customValues, setCustomValues] = useState(initialValues)
  const customSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [pdfOpen, setPdfOpen] = useState<{ url: string; title: string } | null>(null)
  const [kommModal, setKommModal] = useState(false)
  const [kommTyp, setKommTyp] = useState('notiz')
  const [kommText, setKommText] = useState('')
  const [kommDt, setKommDt] = useState('')
  const [projFilter, setProjFilter] = useState<'alle' | 'anfragen' | 'angebote' | 'auftraege' | 'abgeschlossen'>(
    'alle'
  )
  const [docFilter, setDocFilter] = useState<'alle' | 'angebot' | 'rechnung' | 'protokoll' | 'sonstiges'>('alle')
  const [kommFilter, setKommFilter] = useState<'alle' | 'mail' | 'notiz' | 'anruf'>('alle')

  const rechnungen = useMemo(() => kunde.rechnungen ?? [], [kunde.rechnungen])
  const bezahltSumme = useMemo(
    () => rechnungen.filter((r) => r.status === 'bezahlt').reduce((s, r) => s + (Number(r.brutto) || 0), 0),
    [rechnungen]
  )
  const offenSumme = useMemo(
    () =>
      rechnungen
        .filter((r) => r.status !== 'bezahlt' && r.status !== 'storniert')
        .reduce((s, r) => s + (Number(r.brutto) || 0), 0),
    [rechnungen]
  )

  const einbehalteFlat = useMemo(() => {
    const rows: { id: string; label: string; betrag: number; freigabe: string }[] = []
    for (const a of kunde.auftraege ?? []) {
      for (const e of a.einbehalte ?? []) {
        const hw = e.handwerker
        const label = hw?.firma?.trim() || hw?.name?.trim() || 'Handwerker'
        rows.push({
          id: e.id,
          label: `${label}`,
          betrag: Number(e.einbehalt_betrag) || 0,
          freigabe: e.freigabe_datum,
        })
      }
    }
    return rows
  }, [kunde.auftraege])

  const einbehaltSumme = useMemo(() => einbehalteFlat.reduce((s, e) => s + e.betrag, 0), [einbehalteFlat])

  const ueberfaellig = useMemo(() => {
    const now = Date.now()
    return rechnungen.filter((r) => {
      if (r.status === 'bezahlt' || r.status === 'storniert') return false
      if (!r.faellig_am) return false
      const t = new Date(r.faellig_am).getTime()
      return t < now
    })
  }, [rechnungen])

  function refresh() {
    router.refresh()
  }

  function speichernNotiz() {
    const t = notizNeu.trim()
    if (!t) return
    startTransition(async () => {
      const r = await addKundenNotiz(kunde.id, t)
      if (r.ok) {
        setNotizNeu('')
        refresh()
      }
    })
  }

  function removeNotiz(id: string) {
    startTransition(async () => {
      await deleteKundenNotiz(id, kunde.id)
      refresh()
    })
  }

  function saveKomm() {
    const text = kommText.trim()
    if (!text) return
    const prefix =
      kommTyp === 'notiz'
        ? ''
        : kommTyp === 'anruf'
          ? '[Anruf] '
          : kommTyp === 'termin'
            ? '[Termin] '
            : '[Sonstiges] '
    const zeile = kommDt ? `${prefix}${text} (${kommDt})` : `${prefix}${text}`
    startTransition(async () => {
      const r = await addKundenNotiz(kunde.id, zeile)
      if (r.ok) {
        setKommModal(false)
        setKommText('')
        setKommDt('')
        refresh()
      }
    })
  }

  const projekteCards = useMemo(() => {
    type Card = {
      key: string
      sort: number
      kind: 'lead' | 'angebot' | 'auftrag'
      monat: string
      titel: string
      meta: string
      betrag: string
      href: string
      badge: ReactNode
      progress?: number | null
      abgeschlossen: boolean
    }
    const out: Card[] = []
    for (const l of kunde.leads ?? []) {
      const abg = l.status === 'abgeschlossen' || l.status === 'abgebrochen'
      const d = new Date(l.created_at)
      const monat = d.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }).toUpperCase()
      out.push({
        key: `lead-${l.id}`,
        sort: d.getTime(),
        kind: 'lead',
        monat,
        titel: l.situation?.trim() || (l.bereiche?.length ? l.bereiche.join(' + ') : 'Anfrage'),
        meta: '',
        betrag: '',
        href: `/anfragen/${l.id}`,
        badge: <LeadStatusBadge status={l.status as LeadStatus} />,
        abgeschlossen: abg,
      })
      for (const ang of l.angebote ?? []) {
        const ad = new Date(ang.created_at ?? l.created_at)
        const am = ad.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }).toUpperCase()
        out.push({
          key: `ang-${ang.id}`,
          sort: ad.getTime(),
          kind: 'angebot',
          monat: am,
          titel: l.situation?.trim() || 'Angebot',
          meta: '',
          betrag: formatPreis(ang.gesamt_min, ang.gesamt_max),
          href: `/angebote/${ang.id}`,
          badge: <AngebotStatusBadge status={ang.status as AngebotStatus} />,
          abgeschlossen: ang.status === 'abgelehnt',
        })
      }
    }
    for (const a of kunde.auftraege ?? []) {
      const d = new Date(a.created_at)
      const monat = d.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }).toUpperCase()
      const agg = angebotAgg(a)
      out.push({
        key: `auf-${a.id}`,
        sort: d.getTime(),
        kind: 'auftrag',
        monat,
        titel: a.titel?.trim() || 'Auftrag',
        meta: a.end_datum ? `bis ${formatDatum(a.end_datum)}` : '',
        betrag: formatPreis(agg?.gesamt_min ?? null, agg?.gesamt_max ?? null),
        href: `/auftraege/${a.id}`,
        badge: <AuftragStatusBadge status={a.status as AuftragStatus} />,
        progress: a.fortschritt,
        abgeschlossen: a.status === 'abgeschlossen' || a.status === 'storniert',
      })
    }
    return out.sort((x, y) => y.sort - x.sort)
  }, [kunde.leads, kunde.auftraege])

  const projekteFiltered = useMemo(() => {
    return projekteCards.filter((c) => {
      if (projFilter === 'alle') return true
      if (projFilter === 'anfragen') return c.kind === 'lead'
      if (projFilter === 'angebote') return c.kind === 'angebot'
      if (projFilter === 'auftraege') return c.kind === 'auftrag' && !c.abgeschlossen
      if (projFilter === 'abgeschlossen') return c.abgeschlossen
      return true
    })
  }, [projekteCards, projFilter])

  const kommEintraege = useMemo(() => {
    type Row = { id: string; sort: number; icon: string; titel: string; sub?: string; datum: string }
    const rows: Row[] = []
    for (const m of kunde.email_logs ?? []) {
      rows.push({
        id: `mail-${m.id}`,
        sort: new Date(m.created_at).getTime(),
        icon: '✉️',
        titel: m.subject?.trim() || 'E-Mail',
        sub: m.to_email ? `An ${m.to_email}` : undefined,
        datum: formatDatum(m.created_at),
      })
    }
    for (const n of kunde.kunden_notizen ?? []) {
      const raw = n.inhalt
      let icon = '📝'
      if (raw.startsWith('[Anruf]')) icon = '📞'
      if (raw.startsWith('[Termin]')) icon = '📅'
      rows.push({
        id: `n-${n.id}`,
        sort: new Date(n.created_at).getTime(),
        icon,
        titel: 'Notiz',
        sub: raw,
        datum: formatDatum(n.created_at),
      })
    }
    rows.sort((a, b) => b.sort - a.sort)
    return rows.filter((r) => {
      if (kommFilter === 'alle') return true
      if (kommFilter === 'mail') return r.id.startsWith('mail-')
      if (kommFilter === 'notiz') return r.id.startsWith('n-') && r.icon === '📝'
      if (kommFilter === 'anruf') return r.icon === '📞'
      return true
    })
  }, [kunde.email_logs, kunde.kunden_notizen, kommFilter])

  const sidebar = (
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center md:items-start md:text-left">
        <div
          className={cn(
            'mb-3 flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold',
            kundenAvatarClass(kunde.typ)
          )}
        >
          {kundenInitialen(kunde.name)}
        </div>
        <h1 className="text-[22px] font-semibold leading-tight text-bw-text">{kunde.name}</h1>
        <p className="mt-1 text-sm text-bw-light">{kunde.kundennummer ?? '—'}</p>
        <div className="mt-2">
          <TypBadge typ={kunde.typ} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Link href={`/anfragen/neu?kunde_id=${kunde.id}`} className="btn btn-primary btn-sm w-full justify-center">
          + Neue Anfrage
        </Link>
        {kunde.email ? (
          <a href={`mailto:${encodeURIComponent(kunde.email)}`} className="btn btn-secondary btn-sm w-full justify-center">
            📧 Mail senden
          </a>
        ) : null}
        {kunde.telefon ? (
          <a href={`tel:${kunde.telefon.replace(/\s/g, '')}`} className="btn btn-secondary btn-sm w-full justify-center">
            📞 Anrufen
          </a>
        ) : null}
      </div>

      <Accordion title="Kontakt" defaultOpen>
        <div className="space-y-1 pt-1">
          <PropertyRow label="Telefon" value={kunde.telefon ?? '—'} editable={false} />
          <PropertyRow label="E-Mail" value={kunde.email ?? '—'} editable={false} />
          <PropertyRow label="Webseite" value={kunde.webseite ?? '—'} editable={false} />
          <PropertyRow label="Ansprechpartner" value={kunde.ansprechpartner ?? '—'} editable={false} />
          <PropertyRow label="Kundentyp" value={<TypBadge typ={kunde.typ} />} editable={false} />
          <PropertyRow
            label="Quelle"
            value={kunde.quelle ? (QUELLE_LABELS[kunde.quelle] ?? kunde.quelle) : '—'}
            editable={false}
          />
        </div>
      </Accordion>

      <Accordion title="Adresse">
        <div className="space-y-1 pt-1">
          <PropertyRow label="Straße" value={kunde.adresse ?? '—'} editable={false} />
          <PropertyRow
            label="PLZ / Ort"
            value={[kunde.plz, kunde.ort].filter(Boolean).join(' ') || '—'}
            editable={false}
          />
          {mapsUrl(kunde) ? (
            <a href={mapsUrl(kunde)!} target="_blank" rel="noreferrer" className="text-sm font-medium text-bw-link">
              Google Maps öffnen →
            </a>
          ) : null}
        </div>
      </Accordion>

      <Accordion title="Statistik">
        <div className="rounded-lg border border-bw-border bg-bw-bg p-3 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-bw-mid">Projekte</span>
            <span className="font-medium">{(kunde.leads?.length ?? 0) + (kunde.auftraege?.length ?? 0)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-bw-mid">Umsatz</span>
            <span className="font-medium">{formatEur(kunde.gesamt_umsatz)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-bw-mid">Offen</span>
            <span className="font-medium">{formatEur(offenSumme)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-bw-mid">Erster Kontakt</span>
            <span className="font-medium">{formatDatum(kunde.created_at)}</span>
          </div>
        </div>
      </Accordion>

      <Accordion title="Eigene Felder">
        <div className="space-y-3 pt-1">
          {customFieldDefs.length === 0 ? (
            <p className="text-sm text-bw-mid">Noch keine Felder definiert.</p>
          ) : (
            customFieldDefs.map((def) => {
              const row = customValues.find((v) => v.definition_id === def.id)
              return (
                <CustomFieldRenderer
                  key={def.id}
                  def={def}
                  value={row?.wert ?? ''}
                  onChange={(wert) => {
                    setCustomValues((prev) => {
                      const next = [...prev]
                      const i = next.findIndex((x) => x.definition_id === def.id)
                      const stub: CustomFieldValueRow = {
                        id: row?.id ?? 'local',
                        definition_id: def.id,
                        objekt_id: kunde.id,
                        wert,
                        created_at: row?.created_at ?? new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        custom_field_definitions: def,
                      }
                      if (i >= 0) next[i] = { ...next[i], wert }
                      else next.push(stub)
                      return next
                    })
                    const prevT = customSaveTimers.current[def.id]
                    if (prevT) clearTimeout(prevT)
                    customSaveTimers.current[def.id] = setTimeout(() => {
                      void (async () => {
                        await saveKundeCustomFieldValue(def.id, kunde.id, wert)
                        refresh()
                      })()
                    }, 600)
                  }}
                />
              )
            })
          )}
          <p className="text-xs text-bw-mid">Felder unter Einstellungen pflegen.</p>
        </div>
      </Accordion>
    </div>
  )

  const tabUebersicht = (
    <div className="space-y-8 p-4 md:p-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bw-mid">Zeitstrahl</h2>
        <KundenZeitstrahl kunde={kunde} />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bw-mid">Notizen</h2>
        <div className="space-y-3">
          <Textarea
            placeholder="Notiz hinzufügen…"
            value={notizNeu}
            onChange={(e) => setNotizNeu(e.target.value)}
            rows={3}
          />
          {notizNeu.trim() ? (
            <div className="flex justify-end">
              <Button type="button" onClick={speichernNotiz} loading={pending}>
                Speichern
              </Button>
            </div>
          ) : null}
          <ul className="space-y-3">
            {(kunde.kunden_notizen ?? []).map((n) => (
              <li key={n.id} className="rounded-lg border border-bw-border bg-bw-card p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-bw-light">
                      {formatRelativeDate(n.created_at)} · Notiz
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-bw-text">{n.inhalt}</p>
                  </div>
                  <button
                    type="button"
                    className="text-bw-light hover:text-status-cancel-text"
                    onClick={() => removeNotiz(n.id)}
                    aria-label="Löschen"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )

  const tabProjekte = (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['alle', 'Alle'],
            ['anfragen', 'Anfragen'],
            ['angebote', 'Angebote'],
            ['auftraege', 'Aufträge'],
            ['abgeschlossen', 'Abgeschlossen'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setProjFilter(id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              projFilter === id
                ? 'border-bw-primary bg-bw-primary/10 text-bw-text'
                : 'border-bw-border text-bw-mid hover:bg-bw-hover'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {projekteFiltered.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="block rounded-lg border border-bw-border bg-bw-card p-4 shadow-card transition-colors hover:bg-bw-hover"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-bw-mid">
              <span>
                {c.kind === 'auftrag' ? 'AUFTRAG' : c.kind === 'angebot' ? 'ANGEBOT' : 'ANFRAGE'} · {c.monat}
              </span>
              {c.badge}
            </div>
            <p className="mt-1 font-medium text-bw-text">{c.titel}</p>
            {c.progress != null && c.kind === 'auftrag' ? (
              <div className="mt-2">
                <ProgressBar value={c.progress} />
              </div>
            ) : null}
            {c.meta ? <p className="mt-1 text-xs text-bw-mid">{c.meta}</p> : null}
            {c.betrag ? <p className="mt-2 text-sm font-medium text-bw-text">{c.betrag}</p> : null}
            <p className="mt-3 text-right text-sm font-medium text-bw-link">→ Öffnen</p>
          </Link>
        ))}
      </div>
      <Link href={`/anfragen/neu?kunde_id=${kunde.id}`} className="btn btn-secondary btn-sm inline-flex">
        + Neue Anfrage für diesen Kunden
      </Link>
    </div>
  )

  const angeboteDocs = useMemo(() => {
    const list: { id: string; titel: string; nr: string; betrag: string; datum: string; url: string | null }[] = []
    for (const l of kunde.leads ?? []) {
      for (const ang of l.angebote ?? []) {
        list.push({
          id: ang.id,
          titel: l.situation?.trim() || 'Angebot',
          nr: ang.id.slice(0, 8),
          betrag: formatPreis(ang.gesamt_min, ang.gesamt_max),
          datum: formatDatum(ang.created_at ?? l.created_at),
          url: ang.pdf_url ?? null,
        })
      }
    }
    return list
  }, [kunde.leads])

  const tabDokumente = (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['alle', 'Alle'],
            ['angebot', 'Angebote'],
            ['rechnung', 'Rechnungen'],
            ['protokoll', 'Protokolle'],
            ['sonstiges', 'Sonstiges'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setDocFilter(id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              docFilter === id
                ? 'border-bw-primary bg-bw-primary/10 text-bw-text'
                : 'border-bw-border text-bw-mid hover:bg-bw-hover'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {(docFilter === 'alle' || docFilter === 'angebot') && angeboteDocs.length ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-bw-text">Angebote</h3>
          <div className="space-y-2">
            {angeboteDocs.map((d) => (
              <DocCard
                key={d.id}
                type="offer"
                title={`Angebot ${d.titel}`}
                subtitle={`${d.nr} · ${d.betrag} · ${d.datum}`}
                onView={d.url ? () => setPdfOpen({ url: d.url!, title: d.titel }) : undefined}
                onDownload={d.url ? () => window.open(d.url!, '_blank') : undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      {(docFilter === 'alle' || docFilter === 'rechnung') && rechnungen.length ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-bw-text">Rechnungen</h3>
          <div className="space-y-2">
            {rechnungen.map((r) => (
              <DocCard
                key={r.id}
                type="invoice"
                title={r.rechnungsnummer}
                subtitle={`${formatEur(r.brutto)} · ${r.status} · ${formatDatum(r.rechnungsdatum)}`}
                onView={r.pdf_url ? () => setPdfOpen({ url: r.pdf_url!, title: r.rechnungsnummer }) : undefined}
                onDownload={r.pdf_url ? () => window.open(r.pdf_url!, '_blank') : undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      {(docFilter === 'alle' || docFilter === 'protokoll') ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-bw-text">Protokolle</h3>
          <div className="space-y-2">
            {(kunde.kunden_dokumente ?? [])
              .filter((d) => docFilter === 'alle' || d.typ === 'protokoll')
              .map((d) => (
                <DocCard
                  key={d.id}
                  type="protocol"
                  title={d.name}
                  subtitle={formatDatum(d.created_at)}
                  onView={d.datei_url ? () => setPdfOpen({ url: d.datei_url!, title: d.name }) : undefined}
                  onDownload={d.datei_url ? () => window.open(d.datei_url!, '_blank') : undefined}
                />
              ))}
          </div>
        </section>
      ) : null}

      {(docFilter === 'alle' || docFilter === 'sonstiges') ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-bw-text">Sonstiges</h3>
          <div className="rounded-lg border border-dashed border-bw-border bg-bw-bg px-4 py-8 text-center text-sm text-bw-mid">
            Datei hierher ziehen oder <span className="text-bw-link">Datei auswählen</span>
            <div className="mt-2 text-xs">PDF, JPG, PNG · max 10MB (Upload folgt)</div>
          </div>
          <div className="mt-3 space-y-2">
            {(kunde.kunden_dokumente ?? [])
              .filter((d) => d.typ !== 'protokoll' && (d.typ === 'sonstiges' || docFilter === 'alle'))
              .map((d) => (
                <DocCard
                  key={d.id}
                  type="other"
                  title={d.name}
                  subtitle={formatDatum(d.created_at)}
                  onView={d.datei_url ? () => setPdfOpen({ url: d.datei_url!, title: d.name }) : undefined}
                />
              ))}
          </div>
        </section>
      ) : null}
    </div>
  )

  const tabKommunikation = (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['alle', 'Alle'],
              ['mail', 'Mails'],
              ['notiz', 'Notizen'],
              ['anruf', 'Anrufe'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKommFilter(id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium',
                kommFilter === id
                  ? 'border-bw-primary bg-bw-primary/10 text-bw-text'
                  : 'border-bw-border text-bw-mid hover:bg-bw-hover'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setKommModal(true)}>
          + Notiz / Kontakt erfassen
        </button>
      </div>
      <ul className="space-y-3">
        {kommEintraege.map((e) => (
          <li key={e.id} className="rounded-lg border border-bw-border bg-bw-card p-3 text-sm">
            <div className="text-xs text-bw-light">
              {e.icon} {e.titel} · {e.datum}
            </div>
            {e.sub ? <p className="mt-1 whitespace-pre-wrap text-bw-text">{e.sub}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  )

  const tabFinanzen = (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-lg border border-bw-border bg-bw-card p-4 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-bw-mid">Umsatz gesamt</span>
          <span className="font-medium">{formatEur(kunde.gesamt_umsatz)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-bw-mid">Offen</span>
          <span className="font-medium">{formatEur(offenSumme)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-bw-mid">Bezahlt</span>
          <span className="font-medium">{formatEur(bezahltSumme)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-bw-mid">Einbehalte</span>
          <span className="font-medium">{formatEur(einbehaltSumme)}</span>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Alle Rechnungen</h3>
        <div className="overflow-x-auto rounded-lg border border-bw-border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-bw-bg text-xs text-bw-mid">
              <tr>
                <th className="px-3 py-2">Nummer</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Betrag</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Fällig</th>
              </tr>
            </thead>
            <tbody>
              {rechnungen.map((r) => (
                <tr key={r.id} className="border-t border-bw-border">
                  <td className="px-3 py-2 font-medium">{r.rechnungsnummer}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDatum(r.rechnungsdatum)}</td>
                  <td className="px-3 py-2">{formatEur(r.brutto)}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.faellig_am ? formatDatum(r.faellig_am) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-bw-mid">
          Summe: {formatEur(rechnungen.reduce((s, r) => s + (Number(r.brutto) || 0), 0))}
        </p>
      </section>

      <Accordion title="Einbehalte">
        <ul className="space-y-2 pt-1 text-sm">
          {einbehalteFlat.length === 0 ? (
            <li className="text-bw-mid">Keine Einbehalte erfasst.</li>
          ) : (
            einbehalteFlat.map((e) => (
              <li key={e.id}>
                {e.label} · {formatEur(e.betrag)}
                <span className="text-bw-mid"> — Freigabe: {formatDatum(e.freigabe)}</span>
              </li>
            ))
          )}
        </ul>
      </Accordion>

      <Accordion title="Offene Posten">
        {ueberfaellig.length === 0 ? (
          <p className="pt-1 text-sm text-bw-mid">Keine überfälligen Rechnungen.</p>
        ) : (
          <ul className="space-y-3 pt-1">
            {ueberfaellig.map((r) => (
              <li key={r.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <div className="font-medium">⚠️ Rechnung {r.rechnungsnummer}</div>
                <div>Überfällig · {formatEur(r.brutto)}</div>
                <button type="button" className="mt-1 text-xs font-medium text-bw-link">
                  Erinnerung senden
                </button>
              </li>
            ))}
          </ul>
        )}
      </Accordion>
    </div>
  )

  const tabs = [
    { id: 'uebersicht', label: 'Übersicht' },
    { id: 'projekte', label: 'Projekte' },
    { id: 'dokumente', label: 'Dokumente' },
    { id: 'kommunikation', label: 'Kommunikation' },
    { id: 'finanzen', label: 'Finanzen' },
  ]

  return (
    <>
      <RecordLayout sidebar={sidebar}>
        <div className="min-h-full border-b border-bw-border md:border-b-0">
          <div className="tabs flex flex-wrap gap-1 border-b border-bw-border bg-bw-bg px-2 pt-2 md:px-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                onClick={() => {
                  setTab(t.id)
                }}
                className={cn('tab', tab === t.id && 'active')}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'uebersicht' ? tabUebersicht : null}
          {tab === 'projekte' ? tabProjekte : null}
          {tab === 'dokumente' ? tabDokumente : null}
          {tab === 'kommunikation' ? tabKommunikation : null}
          {tab === 'finanzen' ? tabFinanzen : null}
        </div>
      </RecordLayout>

      <PdfViewer open={!!pdfOpen} onClose={() => setPdfOpen(null)} url={pdfOpen?.url ?? ''} title={pdfOpen?.title ?? ''} />

      <Modal
        open={kommModal}
        onClose={() => setKommModal(false)}
        title="Kontakt erfassen"
        size="md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setKommModal(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={saveKomm} loading={pending}>
              Speichern
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            label="Typ"
            value={kommTyp}
            onChange={(e) => setKommTyp(e.target.value)}
            options={[
              { value: 'notiz', label: 'Notiz' },
              { value: 'anruf', label: 'Anruf' },
              { value: 'termin', label: 'Termin' },
              { value: 'sonstiges', label: 'Sonstiges' },
            ]}
          />
          <Textarea label="Inhalt" value={kommText} onChange={(e) => setKommText(e.target.value)} rows={4} />
          <Input
            label="Datum / Zeit (optional)"
            type="datetime-local"
            value={kommDt}
            onChange={(e) => setKommDt(e.target.value)}
          />
        </div>
      </Modal>
    </>
  )
}
