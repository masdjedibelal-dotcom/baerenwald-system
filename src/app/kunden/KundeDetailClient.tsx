'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Accordion } from '@/components/ui/Accordion'
import { Card } from '@/components/ui/Card'
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
import { TypBadge } from '@/components/kunden/TypBadge'
import { addKundenNotiz, deleteKundenNotiz, saveKunde, saveKundeCustomFieldValue } from '@/app/actions/kunden'
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

const TYP_OPTIONS = [
  { value: 'privat', label: 'Privat' },
  { value: 'gewerbe', label: 'Gewerbe' },
  { value: 'hausverwaltung', label: 'Hausverwaltung' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

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
  a: {
    angebote?:
      | { gesamt_fix: number | null; gesamt_min: number | null; gesamt_max: number | null; pdf_url?: string | null }
      | {
          gesamt_fix: number | null
          gesamt_min: number | null
          gesamt_max: number | null
          pdf_url?: string | null
        }[]
      | null
  } | null
) {
  const ag = a?.angebote
  if (!ag) return null
  return Array.isArray(ag) ? ag[0] : ag
}

function auftragTitelFromRechnung(r: NonNullable<KundeDetailPayload['rechnungen']>[0]): string {
  const rel = r.auftraege
  if (!rel) return '—'
  const t = Array.isArray(rel) ? rel[0]?.titel : rel.titel
  return t?.trim() || '—'
}

export function KundeDetailClient({
  kunde: initialKunde,
  customFieldDefs,
  customValues: initialValues,
}: {
  kunde: KundeDetailPayload
  customFieldDefs: CustomFieldDefinition[]
  customValues: CustomFieldValueRow[]
}) {
  const router = useRouter()
  const [kunde, setKunde] = useState(initialKunde)
  const [tab, setTab] = useState<
    'stammdaten' | 'projekte' | 'dokumente' | 'kommunikation' | 'finanzen'
  >('stammdaten')
  const [notizNeu, setNotizNeu] = useState('')
  const [interneNotiz, setInterneNotiz] = useState(initialKunde.notizen ?? '')
  const [pending, startTransition] = useTransition()
  const [customValues, setCustomValues] = useState(initialValues)
  const customSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const interneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const kundeRef = useRef(kunde)
  kundeRef.current = kunde
  const [pdfOpen, setPdfOpen] = useState<{ url: string; title: string } | null>(null)
  const [kommModal, setKommModal] = useState(false)
  const [kommTyp, setKommTyp] = useState('notiz')
  const [kommText, setKommText] = useState('')
  const [kommDt, setKommDt] = useState('')
  const [projFilter, setProjFilter] = useState<'alle' | 'anfragen' | 'angebote' | 'auftraege' | 'abgeschlossen'>(
    'alle'
  )
  const [kommFilter, setKommFilter] = useState<'alle' | 'mail' | 'notiz' | 'anruf'>('alle')
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: initialKunde.name,
    typ: initialKunde.typ,
    telefon: initialKunde.telefon ?? '',
    email: initialKunde.email ?? '',
    plz: initialKunde.plz ?? '',
    ort: initialKunde.ort ?? '',
    strasse: initialKunde.adresse ?? '',
    webseite: initialKunde.webseite ?? '',
    ansprechpartner: initialKunde.ansprechpartner ?? '',
    quelle: initialKunde.quelle ?? '',
  })

  useEffect(() => {
    setKunde(initialKunde)
    setInterneNotiz(initialKunde.notizen ?? '')
    setEditForm({
      name: initialKunde.name,
      typ: initialKunde.typ,
      telefon: initialKunde.telefon ?? '',
      email: initialKunde.email ?? '',
      plz: initialKunde.plz ?? '',
      ort: initialKunde.ort ?? '',
      strasse: initialKunde.adresse ?? '',
      webseite: initialKunde.webseite ?? '',
      ansprechpartner: initialKunde.ansprechpartner ?? '',
      quelle: initialKunde.quelle ?? '',
    })
  }, [initialKunde])

  useEffect(() => {
    if (interneTimer.current) clearTimeout(interneTimer.current)
    interneTimer.current = setTimeout(() => {
      const k = kundeRef.current
      const t = interneNotiz.trim()
      if (t === (k.notizen ?? '').trim()) return
      void (async () => {
        const r = await saveKunde(
          {
            name: k.name,
            typ: k.typ,
            telefon: k.telefon,
            email: k.email,
            plz: k.plz,
            ort: k.ort,
            adresse: k.adresse,
            webseite: k.webseite,
            ansprechpartner: k.ansprechpartner,
            quelle: k.quelle,
            notizen: t || null,
          },
          k.id
        )
        if (r.ok) router.refresh()
      })()
    }, 800)
    return () => {
      if (interneTimer.current) clearTimeout(interneTimer.current)
    }
  }, [interneNotiz, router])

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

  const projektZahl = useMemo(() => {
    const leads = kunde.leads?.length ?? 0
    const auf = kunde.auftraege?.length ?? 0
    return leads + auf
  }, [kunde.leads, kunde.auftraege])

  const letzterKontakt = useMemo(() => {
    const dates: number[] = []
    if (kunde.letzte_aktivitaet) dates.push(new Date(kunde.letzte_aktivitaet).getTime())
    for (const m of kunde.email_logs ?? []) dates.push(new Date(m.created_at).getTime())
    for (const n of kunde.kunden_notizen ?? []) dates.push(new Date(n.created_at).getTime())
    if (!dates.length) return '—'
    const max = Math.max(...dates)
    return formatDatum(new Date(max).toISOString())
  }, [kunde.email_logs, kunde.kunden_notizen, kunde.letzte_aktivitaet])

  const einbehalteFlat = useMemo(() => {
    const rows: { id: string; label: string; betrag: number; freigabe: string; auftrag: string }[] = []
    for (const a of kunde.auftraege ?? []) {
      const atitel = a.titel?.trim() || 'Auftrag'
      for (const e of a.einbehalte ?? []) {
        const hw = e.handwerker
        const label = hw?.firma?.trim() || hw?.name?.trim() || 'Handwerker'
        rows.push({
          id: e.id,
          label,
          betrag: Number(e.einbehalt_betrag) || 0,
          freigabe: e.freigabe_datum,
          auftrag: atitel,
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

  const angebotIdToAnfrage = useMemo(() => {
    const m = new Map<string, string>()
    for (const l of kunde.leads ?? []) {
      const lab = l.situation?.trim() || (l.bereiche?.length ? l.bereiche.join(' + ') : 'Anfrage')
      for (const ang of l.angebote ?? []) {
        m.set(ang.id, lab)
      }
    }
    return m
  }, [kunde.leads])

  const projektLabelFromAngebotId = useCallback(
    (angebotId: string | null | undefined) => {
      if (!angebotId) return null
      const v = angebotIdToAnfrage.get(angebotId)
      return v ? `Anfrage: ${v}` : null
    },
    [angebotIdToAnfrage]
  )

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

  function saveKundeModal() {
    if (!editForm.name.trim()) return
    startTransition(async () => {
      const r = await saveKunde(
        {
          name: editForm.name.trim(),
          typ: editForm.typ,
          telefon: editForm.telefon || null,
          email: editForm.email || null,
          plz: editForm.plz || null,
          ort: editForm.ort || null,
          adresse: editForm.strasse || null,
          webseite: editForm.webseite || null,
          ansprechpartner: editForm.ansprechpartner || null,
          quelle: editForm.quelle || null,
          notizen: interneNotiz.trim() || null,
        },
        kunde.id
      )
      if (r.ok) {
        setEditOpen(false)
        setKunde((k) => ({
          ...k,
          name: editForm.name.trim(),
          typ: editForm.typ,
          telefon: editForm.telefon || null,
          email: editForm.email || null,
          plz: editForm.plz || null,
          ort: editForm.ort || null,
          adresse: editForm.strasse || null,
          webseite: editForm.webseite || null,
          ansprechpartner: editForm.ansprechpartner || null,
          quelle: editForm.quelle || null,
          notizen: interneNotiz.trim() || null,
        }))
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
      cta: string
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
        cta: '→ Zur Anfrage',
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
          betrag: formatPreis(ang.gesamt_fix ?? null, ang.gesamt_min, ang.gesamt_max),
          href: `/angebote/${ang.id}`,
          badge: <AngebotStatusBadge status={ang.status as AngebotStatus} />,
          abgeschlossen: ang.status === 'abgelehnt',
          cta: '→ Zum Angebot',
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
        betrag: formatPreis(agg?.gesamt_fix ?? null, agg?.gesamt_min ?? null, agg?.gesamt_max ?? null),
        href: `/auftraege/${a.id}`,
        badge: <AuftragStatusBadge status={a.status as AuftragStatus} />,
        progress: a.fortschritt,
        abgeschlossen: a.status === 'abgeschlossen' || a.status === 'storniert',
        cta: '→ Zum Auftrag',
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
    type Row = {
      id: string
      sort: number
      icon: string
      titel: string
      sub?: string
      datum: string
      projekt?: string | null
      mail?: boolean
    }
    const rows: Row[] = []
    for (const m of kunde.email_logs ?? []) {
      rows.push({
        id: `mail-${m.id}`,
        sort: new Date(m.created_at).getTime(),
        icon: '✉️',
        titel: m.subject?.trim() || 'E-Mail',
        sub: m.to_email ? `An ${m.to_email}` : undefined,
        datum: formatDatum(m.created_at),
        projekt: projektLabelFromAngebotId(m.angebot_id),
        mail: true,
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
        projekt: 'Kunde',
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
  }, [kunde.email_logs, kunde.kunden_notizen, kommFilter, projektLabelFromAngebotId])

  const tabs = [
    { id: 'stammdaten' as const, label: 'Stammdaten' },
    { id: 'projekte' as const, label: 'Projekte' },
    { id: 'dokumente' as const, label: 'Dokumente' },
    { id: 'kommunikation' as const, label: 'Kommunikation' },
    { id: 'finanzen' as const, label: 'Finanzen' },
  ]

  const tabStammdaten = (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-bw-text">Kontakt</h2>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              Bearbeiten
            </Button>
          </div>
          <div className="space-y-0">
            <PropertyRow label="Name" value={kunde.name} editable={false} />
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
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-bw-text">Adresse</h2>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              Bearbeiten
            </Button>
          </div>
          <div className="space-y-0">
            <PropertyRow label="Straße" value={kunde.adresse ?? '—'} editable={false} />
            <PropertyRow label="PLZ + Ort" value={[kunde.plz, kunde.ort].filter(Boolean).join(' ') || '—'} editable={false} />
          </div>
          {mapsUrl(kunde) ? (
            <a
              href={mapsUrl(kunde)!}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-medium text-bw-link"
            >
              Google Maps öffnen →
            </a>
          ) : null}
        </Card>
      </div>
      <div className="space-y-6">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-bw-text">Statistik</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-bw-border bg-bw-bg p-3">
              <div className="text-xs text-bw-mid">Projekte gesamt</div>
              <div className="mt-1 font-semibold text-bw-text">{projektZahl}</div>
            </div>
            <div className="rounded-lg border border-bw-border bg-bw-bg p-3">
              <div className="text-xs text-bw-mid">Umsatz gesamt</div>
              <div className="mt-1 font-semibold text-bw-text">{formatEur(kunde.gesamt_umsatz)}</div>
            </div>
            <div className="rounded-lg border border-bw-border bg-bw-bg p-3">
              <div className="text-xs text-bw-mid">Offener Betrag</div>
              <div className="mt-1 font-semibold text-bw-text">{formatEur(offenSumme)}</div>
            </div>
            <div className="rounded-lg border border-bw-border bg-bw-bg p-3">
              <div className="text-xs text-bw-mid">Letzter Kontakt</div>
              <div className="mt-1 font-semibold text-bw-text">{letzterKontakt}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-bw-text">Notizen</h2>
          <p className="mb-2 text-xs text-bw-mid">Interne Notiz (wird automatisch gespeichert)</p>
          <Textarea
            placeholder="Interne Kundennotiz…"
            value={interneNotiz}
            onChange={(e) => setInterneNotiz(e.target.value)}
            rows={4}
          />
          <div className="mt-4 border-t border-bw-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-bw-mid">Aktivitäten / Notizen</p>
            <Textarea
              placeholder="Neue Notiz hinzufügen…"
              value={notizNeu}
              onChange={(e) => setNotizNeu(e.target.value)}
              rows={3}
            />
            {notizNeu.trim() ? (
              <div className="mt-2 flex justify-end">
                <Button type="button" onClick={speichernNotiz} loading={pending}>
                  Notiz speichern
                </Button>
              </div>
            ) : null}
            <ul className="mt-4 space-y-3">
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
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-bw-text">Custom Fields</h2>
          <div className="space-y-3">
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
        </Card>
      </div>
    </div>
  )

  const tabProjekte = (
    <div className="space-y-4">
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
            <p className="mt-3 text-right text-sm font-medium text-bw-link">{c.cta}</p>
          </Link>
        ))}
      </div>
      <Link href={`/anfragen/neu?kunde_id=${kunde.id}`} className="btn btn-secondary btn-sm inline-flex">
        + Neue Anfrage für diesen Kunden
      </Link>
    </div>
  )

  const tabDokumente = (
    <div className="space-y-10">
      {(kunde.leads ?? []).filter((l) => (l.angebote ?? []).length > 0).map((l) => {
        const titel = l.situation?.trim() || (l.bereiche?.length ? l.bereiche.join(' + ') : 'Anfrage')
        const angebote = l.angebote ?? []
        return (
          <section key={l.id}>
            <h3 className="mb-3 border-b border-bw-border pb-2 text-sm font-semibold uppercase tracking-wide text-bw-text">
              Anfrage: {titel}
            </h3>
            <div className="space-y-2">
              {angebote.map((ang) => (
                <DocCard
                  key={ang.id}
                  type="offer"
                  title={`Angebot ${ang.id.slice(0, 8).toUpperCase()}`}
                  subtitle={`${formatPreis(ang.gesamt_fix ?? null, ang.gesamt_min, ang.gesamt_max)} · ${formatDatum(ang.created_at ?? l.created_at)}`}
                  onView={ang.pdf_url ? () => setPdfOpen({ url: ang.pdf_url!, title: titel }) : undefined}
                  onDownload={ang.pdf_url ? () => window.open(ang.pdf_url!, '_blank') : undefined}
                />
              ))}
            </div>
          </section>
        )
      })}

      {kunde.auftraege?.map((a) => {
        const atitel = a.titel?.trim() || 'Auftrag'
        const agg = angebotAgg(a)
        const angSingle = Array.isArray(a.angebote) ? a.angebote[0] : a.angebote
        const pdf = angSingle?.pdf_url ?? null
        const aufRechnungen = rechnungen.filter((r) => r.auftrag_id === a.id)
        return (
          <section key={a.id}>
            <h3 className="mb-3 border-b border-bw-border pb-2 text-sm font-semibold uppercase tracking-wide text-bw-text">
              Auftrag: {atitel}
            </h3>
            <div className="space-y-2">
              {pdf ? (
                <DocCard
                  type="offer"
                  title="Angebot (Auftrag)"
                  subtitle={formatPreis(agg?.gesamt_fix ?? null, agg?.gesamt_min ?? null, agg?.gesamt_max ?? null)}
                  onView={() => setPdfOpen({ url: pdf, title: atitel })}
                  onDownload={() => window.open(pdf, '_blank')}
                />
              ) : null}
              {aufRechnungen.map((r) => (
                <DocCard
                  key={r.id}
                  type="invoice"
                  title={r.rechnungsnummer}
                  subtitle={`${formatEur(r.brutto)} · ${r.status} · ${formatDatum(r.rechnungsdatum)}`}
                  onView={r.pdf_url ? () => setPdfOpen({ url: r.pdf_url!, title: r.rechnungsnummer }) : undefined}
                  onDownload={r.pdf_url ? () => window.open(r.pdf_url!, '_blank') : undefined}
                />
              ))}
              {a.abnahme_protokoll_url ? (
                <DocCard
                  type="protocol"
                  title="Abnahmeprotokoll"
                  subtitle={atitel}
                  onView={() => setPdfOpen({ url: a.abnahme_protokoll_url!, title: 'Abnahme' })}
                  onDownload={() => window.open(a.abnahme_protokoll_url!, '_blank')}
                />
              ) : null}
              {!pdf && aufRechnungen.length === 0 && !a.abnahme_protokoll_url ? (
                <p className="text-sm text-bw-mid">Keine Dokumente für diesen Auftrag.</p>
              ) : null}
            </div>
          </section>
        )
      })}

      <section>
        <h3 className="mb-3 border-b border-bw-border pb-2 text-sm font-semibold uppercase tracking-wide text-bw-text">
          Sonstige Dokumente
        </h3>
        <div className="rounded-lg border border-dashed border-bw-border bg-bw-bg px-4 py-8 text-center text-sm text-bw-mid">
          Datei hierher ziehen oder <span className="text-bw-link">Datei auswählen</span>
          <div className="mt-2 text-xs">PDF, JPG, PNG · max 10MB (Upload folgt)</div>
        </div>
        <div className="mt-3 space-y-2">
          {(kunde.kunden_dokumente ?? [])
            .filter((d) => d.typ !== 'protokoll')
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
    </div>
  )

  const tabKommunikation = (
    <div className="space-y-4">
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
          + Notiz hinzufügen
        </button>
      </div>
      <ul className="space-y-3">
        {kommEintraege.map((e) => (
          <li key={e.id} className="rounded-lg border border-bw-border bg-bw-card p-3 text-sm">
            <div className="text-xs text-bw-light">
              {e.icon} {e.titel} · {e.datum}
            </div>
            {e.projekt ? (
              <p className="mt-1 text-xs font-medium text-bw-primary">
                {e.projekt === 'Kunde' ? 'Kunde (allgemein)' : e.projekt}
              </p>
            ) : null}
            {e.sub ? <p className="mt-1 whitespace-pre-wrap text-bw-text">{e.sub}</p> : null}
            {e.mail ? (
              <p className="mt-2 text-xs text-bw-link">Protokoll siehe E-Mail-Archiv (Ansehen folgt)</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )

  const tabFinanzen = (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Umsatz', formatEur(kunde.gesamt_umsatz)],
          ['Offen', formatEur(offenSumme)],
          ['Bezahlt', formatEur(bezahltSumme)],
          ['Einbehalte', formatEur(einbehaltSumme)],
        ].map(([a, b]) => (
          <div key={a} className="rounded-lg border border-bw-border bg-bw-card p-3 text-sm">
            <div className="text-xs text-bw-mid">{a}</div>
            <div className="mt-1 font-semibold text-bw-text">{b}</div>
          </div>
        ))}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Rechnungen</h3>
        <div className="overflow-x-auto rounded-lg border border-bw-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-bw-bg text-xs text-bw-mid">
              <tr>
                <th className="px-3 py-2">Nummer</th>
                <th className="px-3 py-2">Auftrag</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Betrag</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rechnungen.map((r) => (
                <tr key={r.id} className="border-t border-bw-border">
                  <td className="px-3 py-2 font-medium">{r.rechnungsnummer}</td>
                  <td className="px-3 py-2">{auftragTitelFromRechnung(r)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDatum(r.rechnungsdatum)}</td>
                  <td className="px-3 py-2">{formatEur(r.brutto)}</td>
                  <td className="px-3 py-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Accordion title="Einbehalte">
        <ul className="space-y-2 pt-1 text-sm">
          {einbehalteFlat.length === 0 ? (
            <li className="text-bw-mid">Keine Einbehalte erfasst.</li>
          ) : (
            einbehalteFlat.map((e) => (
              <li key={e.id}>
                <span className="font-medium">{e.auftrag}</span> · {e.label} · {formatEur(e.betrag)}
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
                <div>
                  Auftrag: {auftragTitelFromRechnung(r)} · Überfällig · {formatEur(r.brutto)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Accordion>
    </div>
  )

  return (
    <>
      <div className="border-b border-bw-border bg-bw-bg">
        <div className="tabs flex flex-wrap gap-1 px-2 pt-2 md:px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              onClick={() => setTab(t.id)}
              className={cn('tab', tab === t.id && 'active')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 md:px-6 md:py-6">
        {tab === 'stammdaten' ? tabStammdaten : null}
        {tab === 'projekte' ? tabProjekte : null}
        {tab === 'dokumente' ? tabDokumente : null}
        {tab === 'kommunikation' ? tabKommunikation : null}
        {tab === 'finanzen' ? tabFinanzen : null}
      </div>

      <PdfViewer open={!!pdfOpen} onClose={() => setPdfOpen(null)} url={pdfOpen?.url ?? ''} title={pdfOpen?.title ?? ''} />

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Kunde bearbeiten"
        size="md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={saveKundeModal} loading={pending}>
              Speichern
            </Button>
          </div>
        }
      >
        <div className="form-grid-2 grid gap-3 md:grid-cols-2">
          <Input label="Name *" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
          <Select
            label="Typ *"
            name="typ"
            value={editForm.typ}
            onChange={(e) => setEditForm((f) => ({ ...f, typ: e.target.value }))}
            options={TYP_OPTIONS}
          />
          <Input
            label="Telefon"
            type="tel"
            value={editForm.telefon}
            onChange={(e) => setEditForm((f) => ({ ...f, telefon: e.target.value }))}
          />
          <Input
            label="E-Mail"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input label="PLZ" value={editForm.plz} onChange={(e) => setEditForm((f) => ({ ...f, plz: e.target.value }))} />
          <Input label="Ort" value={editForm.ort} onChange={(e) => setEditForm((f) => ({ ...f, ort: e.target.value }))} />
          <Input
            label="Straße"
            value={editForm.strasse}
            onChange={(e) => setEditForm((f) => ({ ...f, strasse: e.target.value }))}
          />
          <Input
            label="Webseite"
            value={editForm.webseite}
            onChange={(e) => setEditForm((f) => ({ ...f, webseite: e.target.value }))}
          />
          <Input
            label="Ansprechpartner"
            value={editForm.ansprechpartner}
            onChange={(e) => setEditForm((f) => ({ ...f, ansprechpartner: e.target.value }))}
          />
          <Select
            label="Quelle"
            name="quelle"
            value={editForm.quelle}
            onChange={(e) => setEditForm((f) => ({ ...f, quelle: e.target.value }))}
            options={[
              { value: '', label: '—' },
              ...Object.entries(QUELLE_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
        </div>
      </Modal>

      <Modal
        open={kommModal}
        onClose={() => setKommModal(false)}
        title="Notiz / Kontakt"
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
