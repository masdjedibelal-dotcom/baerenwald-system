'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import type {
  DatenschutzAnfrageKontext,
  DatenschutzAnfrageRow,
  DatenschutzFaelligRow,
  DatenschutzFristRow,
  DatenschutzLoeschlogRow,
  DatenschutzVvtRow,
  MelderLeadKurz,
} from '@/lib/datenschutz/types'
import { DATENSCHUTZ_AVV_REGISTER } from '@/lib/datenschutz/avv-register'
import {
  addDatenschutzAufschub,
  createDatenschutzAnfrage,
  sucheMelderLeads,
  updateDatenschutzAnfrage,
  updateDatenschutzFrist,
} from '@/app/(dashboard)/einstellungen/datenschutz/actions'

function formatMonate(m: number): string {
  if (m >= 12 && m % 12 === 0) {
    const y = m / 12
    return `${y} Jahr${y === 1 ? '' : 'e'}`
  }
  return `${m} Monate`
}

function kategorieLabel(k: string): string {
  const map: Record<string, string> = {
    fotos_auftraege: 'Fotos Auftrag',
    fotos_formulare: 'Fotos Formular',
    leads_abgebrochen: 'Lead abgebrochen',
    leads_abgeschlossen: 'Lead abgelehnt',
    kunden_daten: 'Kundenstamm',
    melder_fotos: 'Melder-Fotos',
    melder_leads_offen: 'Melder-Lead (offen)',
    melder_leads_abgeschlossen: 'Melder-Lead (abgeschlossen)',
  }
  return map[k] ?? k
}

function kontextLabel(k: string | null | undefined): string {
  const map: Record<string, string> = {
    mieter_meldung: 'Mieter-Meldung',
    privatkunde: 'Privatkunde',
    partner: 'Partner',
    sonstiges: 'Sonstiges',
  }
  return k ? (map[k] ?? k) : '—'
}

function tageSeit(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

type Props = {
  fristen: DatenschutzFristRow[]
  faellig: DatenschutzFaelligRow[]
  log: DatenschutzLoeschlogRow[]
  anfragen: DatenschutzAnfrageRow[]
  vvt: DatenschutzVvtRow[]
}

export function DatenschutzPageClient({ fristen, faellig, log, anfragen, vvt }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const [fristModal, setFristModal] = useState<DatenschutzFristRow | null>(null)
  const [fristMonate, setFristMonate] = useState('')
  const [fristAktiv, setFristAktiv] = useState(true)

  const [delModal, setDelModal] = useState<DatenschutzFaelligRow | null>(null)

  const [aufschubModal, setAufschubModal] = useState<DatenschutzFaelligRow | null>(null)
  const [aufschubText, setAufschubText] = useState('')

  const [anfrageOpen, setAnfrageOpen] = useState(false)
  const [anfrageTyp, setAnfrageTyp] = useState<'loeschung' | 'auskunft' | 'einschraenkung'>('loeschung')
  const [anfrageName, setAnfrageName] = useState('')
  const [anfrageEmail, setAnfrageEmail] = useState('')
  const [anfrageDesc, setAnfrageDesc] = useState('')
  const [anfrageKontext, setAnfrageKontext] = useState<DatenschutzAnfrageKontext>('sonstiges')

  const [melderSucheEmail, setMelderSucheEmail] = useState('')
  const [melderTreffer, setMelderTreffer] = useState<MelderLeadKurz[]>([])
  const [melderSucheLief, setMelderSucheLief] = useState(false)

  const [editAnfrage, setEditAnfrage] = useState<DatenschutzAnfrageRow | null>(null)
  const [editNotizen, setEditNotizen] = useState('')
  const [editStatus, setEditStatus] = useState<'offen' | 'in_bearbeitung' | 'erledigt'>('offen')

  const [mainTab, setMainTab] = useState<'fristen' | 'faellig' | 'anfragen' | 'vvt' | 'avv'>('fristen')

  const offeneAnfragen = useMemo(() => anfragen.filter((a) => a.status !== 'erledigt'), [anfragen])

  function openFrist(f: DatenschutzFristRow) {
    setFristModal(f)
    setFristMonate(String(f.frist_monate))
    setFristAktiv(f.aktiv)
  }

  async function saveFrist() {
    if (!fristModal) return
    const n = parseInt(fristMonate, 10)
    if (!Number.isFinite(n) || n < 1) {
      toast.error('Bitte gültige Monatszahl eingeben')
      return
    }
    setBusy('frist')
    const r = await updateDatenschutzFrist(fristModal.id, { frist_monate: n, aktiv: fristAktiv })
    setBusy(null)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    toast.success('Frist gespeichert')
    setFristModal(null)
    router.refresh()
  }

  async function toggleAktiv(f: DatenschutzFristRow) {
    setBusy(`aktiv-${f.id}`)
    const r = await updateDatenschutzFrist(f.id, { frist_monate: f.frist_monate, aktiv: !f.aktiv })
    setBusy(null)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    router.refresh()
  }

  async function runLoeschen() {
    if (!delModal) return
    setBusy('del')
    try {
      const res = await fetch('/api/datenschutz/loeschen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kategorie: delModal.kategorie,
          referenz_id: delModal.referenz_id,
          grund: 'aufbewahrungsfrist',
        }),
      })
      const j = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        toast.error(j.error ?? 'Löschen fehlgeschlagen')
        return
      }
      toast.success('Verarbeitet')
      setDelModal(null)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function runAufschub() {
    if (!aufschubModal) return
    setBusy('aufschub')
    const r = await addDatenschutzAufschub({
      kategorie: aufschubModal.kategorie,
      referenz_id: aufschubModal.referenz_id,
      begrundung: aufschubText,
    })
    setBusy(null)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    toast.success('Um 12 Monate zurückgestellt')
    setAufschubModal(null)
    setAufschubText('')
    router.refresh()
  }

  async function runCreateAnfrage() {
    if (!anfrageName.trim() || !anfrageEmail.trim()) {
      toast.error('Name und E-Mail erforderlich')
      return
    }
    setBusy('anfrage')
    const r = await createDatenschutzAnfrage({
      typ: anfrageTyp,
      name: anfrageName,
      email: anfrageEmail,
      beschreibung: anfrageDesc || null,
      kontext: anfrageKontext,
    })
    setBusy(null)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    toast.success('Anfrage erfasst')
    setAnfrageOpen(false)
    setAnfrageName('')
    setAnfrageEmail('')
    setAnfrageDesc('')
    setAnfrageKontext('sonstiges')
    router.refresh()
  }

  async function runMelderSuche() {
    if (!melderSucheEmail.trim()) {
      toast.error('E-Mail eingeben')
      return
    }
    setBusy('melder-suche')
    const rows = await sucheMelderLeads(melderSucheEmail)
    setMelderTreffer(rows)
    setMelderSucheLief(true)
    setBusy(null)
  }

  async function runSaveAnfrage() {
    if (!editAnfrage) return
    setBusy('edit-anfrage')
    const r = await updateDatenschutzAnfrage(editAnfrage.id, {
      notizen: editNotizen || null,
      status: editStatus,
    })
    setBusy(null)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    toast.success('Gespeichert')
    setEditAnfrage(null)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {(
          [
            ['fristen', 'Fristen'],
            ['faellig', 'Fällige Löschungen'],
            ['anfragen', 'Betroffenenanfragen'],
            ['vvt', 'VVT'],
            ['avv', 'AVV-Register'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMainTab(id)}
            className={
              mainTab === id
                ? 'rounded-md border border-bw-primary bg-bw-green-bg px-3 py-1.5 text-sm font-medium text-bw-primary'
                : 'rounded-md px-3 py-1.5 text-sm text-muted hover:bg-canvas'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <strong className="font-semibold">Hinweis:</strong> Alle Löschungen bzw. Anonymisierungen werden protokolliert.
        Steuerlich relevante Daten (Rechnungen, Belege) werden erst nach Ablauf der gesetzlichen Aufbewahrungspflicht
        (typisch 10 Jahre) zur Löschung vorgeschlagen bzw. hier technisch blockiert.
      </div>

      <details className="rounded-lg border border-border bg-canvas/40 px-4 py-3 text-sm text-ink">
        <summary className="cursor-pointer font-medium">Schulung CRM-Nutzer (Melde-Flow)</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>Nur notwendige Melderdaten erfassen (HV-Einladung).</li>
          <li>Keine Screenshots/Fotos außerhalb des Systems speichern.</li>
          <li>Bei Auskunftsanfragen: Frist 1 Monat, Hausverwaltung einbinden.</li>
          <li>Löschungen nur über dieses Datenschutz-Modul — nicht manuell in der Datenbank.</li>
        </ul>
      </details>

      {mainTab === 'fristen' ? (
      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-ink">Aufbewahrungsfristen</h2>
        </div>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-muted">
                <th className="px-3 py-2 font-medium">Kategorie</th>
                <th className="px-3 py-2 font-medium">Frist</th>
                <th className="px-3 py-2 font-medium">Grundlage</th>
                <th className="px-3 py-2 font-medium">Aktiv</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {fristen.map((f) => (
                <tr key={f.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{f.bezeichnung}</div>
                    <div className="text-xs text-muted">{f.kategorie}</div>
                  </td>
                  <td className="px-3 py-2">{formatMonate(f.frist_monate)}</td>
                  <td className="max-w-[220px] px-3 py-2 text-muted">{f.gesetzliche_grundlage ?? '—'}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={busy === `aktiv-${f.id}`}
                      onClick={() => void toggleAktiv(f)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        f.aktiv ? 'bg-emerald-100 text-emerald-900' : 'bg-muted/30 text-muted'
                      }`}
                    >
                      {f.aktiv ? 'Aktiv' : 'Inaktiv'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button type="button" variant="secondary" size="sm" onClick={() => openFrist(f)}>
                      Frist bearbeiten
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
      ) : null}

      {mainTab === 'faellig' ? (
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Zur Löschung vorgeschlagen</h2>
        {faellig.length === 0 ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            Keine fälligen Löschungen
          </div>
        ) : (
          <ul className="space-y-3">
            {faellig.map((row) => (
              <li key={`${row.kategorie}-${row.referenz_id}`} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="mb-1 inline-block rounded bg-canvas px-2 py-0.5 text-xs font-medium text-ink">
                      {kategorieLabel(row.kategorie)}
                    </span>
                    <p className="font-medium text-ink">{row.titel}</p>
                    <p className="text-sm text-muted">
                      Basis: {row.basis_datum} · Fällig seit ca. {row.monate_faellig} Monaten
                    </p>
                    <p className="mt-1 text-sm text-ink">{row.beschreibung}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" variant="danger" size="sm" onClick={() => setDelModal(row)}>
                      Jetzt löschen
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setAufschubModal(row)}>
                      Zurückstellen (+12 M.)
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      ) : null}

      {mainTab === 'fristen' ? (
      <section>
        <h2 className="mb-1 text-lg font-semibold text-ink">Löschprotokoll</h2>
        <p className="mb-3 text-sm text-muted">
          Alle Löschungen werden für die steuerliche Nachvollziehbarkeit protokolliert (mindestens 10 Jahre empfohlen).
        </p>
        <div className="mb-3">
          <a
            href="/api/datenschutz/export-log"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink hover:bg-canvas"
          >
            Löschprotokoll exportieren (CSV)
          </a>
        </div>
        <Card className="max-h-[360px] overflow-auto p-0">
          <table className="w-full min-w-[560px] border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-canvas">
              <tr className="border-b border-border text-muted">
                <th className="px-2 py-2 font-medium">Datum</th>
                <th className="px-2 py-2 font-medium">Typ</th>
                <th className="px-2 py-2 font-medium">Referenz</th>
                <th className="px-2 py-2 font-medium">Grund</th>
              </tr>
            </thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-2 py-1.5 whitespace-nowrap">{l.created_at?.slice(0, 19).replace('T', ' ')}</td>
                  <td className="px-2 py-1.5">{l.typ}</td>
                  <td className="px-2 py-1.5 text-muted">
                    {l.referenz_typ ?? '—'} {l.referenz_id ? l.referenz_id.slice(0, 8) : ''}
                  </td>
                  <td className="px-2 py-1.5">{l.grund}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
      ) : null}

      {mainTab === 'anfragen' ? (
      <section className="space-y-6">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-ink">Betroffenenanfragen (DSGVO)</h2>
          <Button type="button" variant="primary" size="sm" onClick={() => setAnfrageOpen(true)}>
            + Anfrage erfassen
          </Button>
        </div>

        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-ink">Mieter-Meldungen suchen (melder_email)</h3>
          <p className="mb-3 text-xs text-muted">
            Kanäle hv_melder_link und hv_einladung. Bei Auskunft/Löschung primär Hausverwaltung einbinden.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              label="Melder-E-Mail"
              name="melder_suche"
              type="email"
              value={melderSucheEmail}
              onChange={(e) => setMelderSucheEmail(e.target.value)}
              className="min-w-[220px] flex-1"
            />
            <div className="flex items-end">
              <Button type="button" variant="secondary" size="sm" loading={busy === 'melder-suche'} onClick={() => void runMelderSuche()}>
                Suchen
              </Button>
            </div>
          </div>
          {melderSucheLief ? (
            melderTreffer.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Keine Melder-Leads gefunden.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {melderTreffer.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{l.melder_name ?? '—'}</span>
                      <span className="text-muted">
                        {' '}
                        · {l.melder_einheit ?? '—'} · {l.status} · {l.created_at.slice(0, 10)}
                      </span>
                    </div>
                    <a href={`/anfragen/${l.id}`} className="text-bw-primary hover:underline">
                      Lead öffnen →
                    </a>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </Card>

        {offeneAnfragen.map((a) => {
          const t = tageSeit(a.created_at)
          const warn = t > 25
          return (
            <div
              key={a.id}
              className={`mb-2 rounded-lg border px-3 py-2 text-sm ${warn ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-border bg-surface'}`}
            >
              {warn ? (
                <p className="mb-2 font-medium">
                  Anfrage von {a.name} seit {t} Tagen offen — DSGVO-Frist: 30 Tage ab Eingang
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-ink">{a.name}</span>{' '}
                  <span className="text-muted">
                    · {a.typ} · {kontextLabel(a.kontext)} · {a.created_at.slice(0, 10)} · {a.status}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditAnfrage(a)
                    setEditNotizen(a.notizen ?? '')
                    setEditStatus((a.status as typeof editStatus) ?? 'offen')
                  }}
                >
                  Bearbeiten
                </Button>
              </div>
            </div>
          )
        })}

        {anfragen.filter((a) => a.status === 'erledigt').length > 0 ? (
          <details className="mt-4 rounded-lg border border-border bg-canvas/30 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-ink">Erledigte Anfragen</summary>
            <ul className="mt-2 space-y-1 text-muted">
              {anfragen
                .filter((a) => a.status === 'erledigt')
                .map((a) => (
                  <li key={a.id}>
                    {a.name} — {a.typ} — {a.erledigt_at?.slice(0, 10) ?? '—'}
                  </li>
                ))}
            </ul>
          </details>
        ) : null}
      </section>
      ) : null}

      {mainTab === 'vvt' ? (
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Verzeichnis von Verarbeitungstätigkeiten (Art. 30)</h2>
        {vvt.length === 0 ? (
          <p className="text-sm text-muted">
            Noch keine Einträge — Migration <code className="text-xs">20260725120000_datenschutz_melder.sql</code>{' '}
            anwenden.
          </p>
        ) : (
          <div className="space-y-4">
            {vvt.map((e) => (
              <Card key={e.id} className="p-4">
                <h3 className="font-semibold text-ink">{e.titel}</h3>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Zweck</dt>
                    <dd>{e.zweck}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Rechtsgrundlage</dt>
                    <dd>{e.rechtsgrundlage ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Betroffene</dt>
                    <dd>{e.betroffene_kategorien ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Datenarten</dt>
                    <dd>{e.datenarten ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Empfänger</dt>
                    <dd>{e.empfaenger ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Drittland</dt>
                    <dd>{e.drittland ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Löschfrist</dt>
                    <dd>{e.loeschfrist_hinweis ?? '—'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted">TOMs</dt>
                    <dd>{e.toms ?? '—'}</dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        )}
      </section>
      ) : null}

      {mainTab === 'avv' ? (
      <section>
        <h2 className="mb-1 text-lg font-semibold text-ink">AVV-Register — Unterauftragsverarbeiter</h2>
        <p className="mb-3 text-sm text-muted">Manuell pflegen; mit Anwalt und AVV-Anlage abstimmen.</p>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-muted">
                <th className="px-3 py-2 font-medium">Anbieter</th>
                <th className="px-3 py-2 font-medium">Zweck</th>
                <th className="px-3 py-2 font-medium">Standort</th>
                <th className="px-3 py-2 font-medium">Vertrag</th>
              </tr>
            </thead>
            <tbody>
              {DATENSCHUTZ_AVV_REGISTER.map((row) => (
                <tr key={row.name} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2">{row.zweck}</td>
                  <td className="px-3 py-2 text-muted">{row.standort}</td>
                  <td className="px-3 py-2 text-muted">{row.vertrag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
      ) : null}

      <Modal
        open={!!fristModal}
        onClose={() => setFristModal(null)}
        title="Frist bearbeiten"
        size="md"
      >
        {fristModal ? (
          <>
            <p className="mb-3 text-sm text-muted">{fristModal.bezeichnung}</p>
            <Input
              label="Frist (Monate)"
              name="frist_monate"
              type="number"
              min={1}
              value={fristMonate}
              onChange={(e) => setFristMonate(e.target.value)}
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={fristAktiv} onChange={(e) => setFristAktiv(e.target.checked)} />
              Kategorie aktiv (Fälligkeitsprüfung)
            </label>
            <p className="mt-3 text-xs text-muted">
              Gesetzliche Grundlage ist in der Datenbank hinterlegt und wird hier nicht geändert.
            </p>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="primary" loading={busy === 'frist'} onClick={() => void saveFrist()}>
                Speichern
              </Button>
              <Button type="button" variant="secondary" onClick={() => setFristModal(null)}>
                Abbrechen
              </Button>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal open={!!delModal} onClose={() => setDelModal(null)} title="Löschung bestätigen" size="md">
        {delModal ? (
          <>
            <p className="text-sm text-ink">
              {delModal.beschreibung} für <strong>{delModal.titel}</strong> wirklich ausführen? Dieser Vorgang kann nicht
              rückgängig gemacht werden (Fotos werden aus dem Speicher entfernt, personenbezogene Felder anonymisiert).
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="danger" loading={busy === 'del'} onClick={() => void runLoeschen()}>
                Endgültig ausführen
              </Button>
              <Button type="button" variant="secondary" onClick={() => setDelModal(null)}>
                Abbrechen
              </Button>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={!!aufschubModal}
        onClose={() => setAufschubModal(null)}
        title="Zurückstellung +12 Monate"
        size="md"
      >
        {aufschubModal ? (
          <>
            <p className="mb-2 text-sm text-muted">{aufschubModal.titel}</p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">Begründung (Pflicht)</span>
              <Textarea value={aufschubText} onChange={(e) => setAufschubText(e.target.value)} rows={4} />
            </label>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="primary" loading={busy === 'aufschub'} onClick={() => void runAufschub()}>
                Speichern
              </Button>
              <Button type="button" variant="secondary" onClick={() => setAufschubModal(null)}>
                Abbrechen
              </Button>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal open={anfrageOpen} onClose={() => setAnfrageOpen(false)} title="Anfrage erfassen" size="md">
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          <label className="block text-sm font-medium text-ink">
            Typ
            <select
              className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-ink"
              value={anfrageTyp}
              onChange={(e) => setAnfrageTyp(e.target.value as typeof anfrageTyp)}
            >
              <option value="loeschung">Löschungsanfrage (Art. 17)</option>
              <option value="auskunft">Auskunftsanfrage (Art. 15)</option>
              <option value="einschraenkung">Einschränkung (Art. 18)</option>
            </select>
          </label>
          <Input label="Name" name="an_name" value={anfrageName} onChange={(e) => setAnfrageName(e.target.value)} />
          <Input
            label="E-Mail"
            name="an_email"
            type="email"
            value={anfrageEmail}
            onChange={(e) => setAnfrageEmail(e.target.value)}
          />
          <label className="block text-sm font-medium text-ink">
            Kontext
            <select
              className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-ink"
              value={anfrageKontext}
              onChange={(e) => setAnfrageKontext(e.target.value as DatenschutzAnfrageKontext)}
            >
              <option value="mieter_meldung">Mieter-Meldung (HV-Portal)</option>
              <option value="privatkunde">Privatkunde</option>
              <option value="partner">Partner / Handwerker</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Beschreibung</span>
            <Textarea value={anfrageDesc} onChange={(e) => setAnfrageDesc(e.target.value)} rows={3} />
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="primary" loading={busy === 'anfrage'} onClick={() => void runCreateAnfrage()}>
            Speichern
          </Button>
          <Button type="button" variant="secondary" onClick={() => setAnfrageOpen(false)}>
            Abbrechen
          </Button>
        </div>
      </Modal>

      <Modal open={!!editAnfrage} onClose={() => setEditAnfrage(null)} title="Anfrage bearbeiten" size="lg">
        {editAnfrage ? (
          <>
            <p className="mb-3 text-sm text-muted">
              {editAnfrage.name} · {editAnfrage.email} · Eingang {editAnfrage.created_at.slice(0, 10)} — Frist: 30 Tage
              (DSGVO)
            </p>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-ink">Notizen (Prüfung / Mitteilung)</span>
                <Textarea value={editNotizen} onChange={(e) => setEditNotizen(e.target.value)} rows={5} />
              </label>
              <label className="block text-sm font-medium text-ink">
                Status
                <select
                  className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-surface px-3"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as typeof editStatus)}
                >
                  <option value="offen">Offen</option>
                  <option value="in_bearbeitung">In Bearbeitung</option>
                  <option value="erledigt">Erledigt</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="primary" loading={busy === 'edit-anfrage'} onClick={() => void runSaveAnfrage()}>
                Speichern
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditAnfrage(null)}>
                Abbrechen
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  )
}
