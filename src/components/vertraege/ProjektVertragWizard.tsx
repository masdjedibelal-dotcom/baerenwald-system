'use client'

import { useCallback, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileText, Save } from 'lucide-react'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { DocActionBar } from '@/components/surfaces/primitives'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import {
  finalizeHandwerkerAcceptWizard,
  finalizeNachtragVertrag,
  finalizeProjektVertrag,
  saveNachtragDraft,
  saveProjektVertragDraft,
} from '@/app/(dashboard)/vertraege/wizard-actions'
import {
  bauvorhabenAusAuftrag,
  handwerkerAnzeigename,
  leistungsumfangAusPositionen,
  leistungsumfangNachtragAusPositionen,
  verguetungAusPositionen,
  verguetungNachtragAusPositionen,
} from '@/lib/vertraege/build-vertrag-texte'
import { NachtragPositionenEditor } from '@/components/vertraege/NachtragPositionenEditor'
import type { AuftragPosition } from '@/lib/types'
import type { NachtragPositionDraft, ProjektVertragWizardBootstrap, ProjektVertragWizardMeta } from '@/lib/vertraege/types'
import { cn } from '@/lib/utils'

/** Sichtbare Phasen ≤3: Partner · Inhalt (+ Unterlagen bei Accept) · PDF */
const PHASES = [
  { id: 1, label: 'Partner' },
  { id: 2, label: 'Inhalt' },
  { id: 3, label: 'PDF' },
] as const

function positionenFuerAuswahl(
  positionen: AuftragPosition[],
  handwerkerId: string,
  gewerkName: string
): AuftragPosition[] {
  const gn = gewerkName.trim().toLowerCase()
  return positionen.filter(
    (p) =>
      p.handwerker_id === handwerkerId ||
      (gn && p.gewerk_name?.trim().toLowerCase() === gn)
  )
}

export function ProjektVertragWizard({
  bootstrap,
  onClose,
  onDone,
}: {
  bootstrap: ProjektVertragWizardBootstrap
  onClose: () => void
  onDone?: () => void
}) {
  const acceptMode = bootstrap.accept_mode
  const nachtragMode = bootstrap.nachtrag_mode
  const pdfStep = 3

  const [step, setStep] = useState(1)
  const [meta, setMeta] = useState<ProjektVertragWizardMeta>(() => bootstrap.meta)
  const [complianceSlugs, setComplianceSlugs] = useState<string[]>(
    () => acceptMode?.initial_compliance_slugs ?? []
  )
  const [vertragId, setVertragId] = useState<string | null>(bootstrap.vertrag_id)
  const [vertragsNr, setVertragsNr] = useState(bootstrap.vertrags_nr?.trim() || 'Entwurf')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [positionenAuftragSpeichern, setPositionenAuftragSpeichern] = useState(true)

  const handwerker = useMemo(
    () => bootstrap.handwerker_optionen.find((h) => h.id === meta.handwerker_id) ?? null,
    [bootstrap.handwerker_optionen, meta.handwerker_id]
  )

  const applyHandwerkerGewerk = useCallback(
    (handwerkerId: string, gewerkName: string, gewerkId: string | null) => {
      const pos = positionenFuerAuswahl(bootstrap.positionen, handwerkerId, gewerkName)
      setMeta((m) => ({
        ...m,
        handwerker_id: handwerkerId,
        gewerk_id: gewerkId,
        gewerk_name: gewerkName,
        bauvorhaben: bauvorhabenAusAuftrag({
          titel: bootstrap.auftrag_titel,
          kunde_adresse: bootstrap.kunde_adresse,
          kunde_plz: bootstrap.kunde_plz,
          kunde_ort: bootstrap.kunde_ort,
          gewerk_name: gewerkName,
        }),
        leistungsumfang: leistungsumfangAusPositionen(pos),
        verguetung_text: verguetungAusPositionen(pos),
      }))
    },
    [bootstrap]
  )

  const applyNachtragPositionen = useCallback(
    (positionen: NachtragPositionDraft[]) => {
      if (!nachtragMode) return
      setMeta((m) => ({
        ...m,
        nachtrag_positionen: positionen,
        leistungsumfang: leistungsumfangNachtragAusPositionen(positionen, m.bauvorhaben),
        verguetung_text: verguetungNachtragAusPositionen({
          bezug_vertrag_vom: nachtragMode.parent_vertrag_vom,
          parent_verguetung_text: nachtragMode.parent_verguetung_text,
          positionen,
        }),
      }))
    },
    [nachtragMode]
  )

  const persistDraft = useCallback(
    async (opts?: { notify?: boolean; manageBusy?: boolean }): Promise<string | null> => {
      if (!meta.handwerker_id) {
        toast.error('Bitte Handwerker wählen.')
        return null
      }
      const manageBusy = opts?.manageBusy !== false
      if (manageBusy) {
        setSaving(true)
        actionBusy.show('Wird gespeichert…')
      }
      try {
        const res = nachtragMode
          ? await saveNachtragDraft({
              vertrag_id: vertragId,
              auftrag_id: bootstrap.auftrag_id,
              parent_vertrag_id: nachtragMode.parent_vertrag_id,
              meta,
            })
          : await saveProjektVertragDraft({
              vertrag_id: vertragId,
              auftrag_id: bootstrap.auftrag_id,
              meta,
            })
        if (!res.ok) {
          toast.error(res.message)
          return null
        }
        setVertragId(res.vertrag_id)
        setVertragsNr(res.vertrags_nr)
        if (opts?.notify) toast.success('Entwurf gespeichert')
        return res.vertrag_id
      } finally {
        if (manageBusy) {
          setSaving(false)
          actionBusy.hide()
        }
      }
    },
    [bootstrap.auftrag_id, meta, nachtragMode, vertragId]
  )

  const handleWeiter = async () => {
    if (step === 1) {
      if (!meta.handwerker_id) {
        toast.error('Bitte Handwerker wählen.')
        return
      }
      await persistDraft()
      setStep(2)
      return
    }
    if (step === 2) {
      if (nachtragMode && !meta.nachtrag_positionen?.length) {
        toast.error('Bitte mindestens eine Position für den Nachtrag anlegen.')
        return
      }
      if (!meta.bauvorhaben.trim() || !meta.leistungsumfang.trim()) {
        toast.error('Bauvorhaben und Leistungsumfang ausfüllen.')
        return
      }
      await persistDraft()
      setStep(pdfStep)
    }
  }

  const toggleComplianceSlug = (slug: string) => {
    setComplianceSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  const handlePdfErzeugen = async () => {
    await actionBusy.run('PDF wird erzeugt…', async () => {
      setSaving(true)
      try {
        const res = acceptMode
          ? await finalizeHandwerkerAcceptWizard({
              vertrag_id: vertragId,
              auftrag_id: bootstrap.auftrag_id,
              handwerker_id: meta.handwerker_id,
              meta,
              compliance_slugs: complianceSlugs,
            })
          : nachtragMode
            ? await finalizeNachtragVertrag({
                vertrag_id: vertragId,
                auftrag_id: bootstrap.auftrag_id,
                parent_vertrag_id: nachtragMode.parent_vertrag_id,
                meta,
                positionen_auftrag_speichern: positionenAuftragSpeichern,
              })
            : await finalizeProjektVertrag({
                vertrag_id: vertragId,
                auftrag_id: bootstrap.auftrag_id,
                meta,
              })
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        setVertragId(res.vertrag_id)
        setVertragsNr(res.vertrags_nr)
        setPdfUrl(res.pdf_url)
        if (acceptMode) {
          toast.success('Vertrag erzeugt. Partner sieht ihn im Portal unter Vorgänge.')
        } else if (nachtragMode) {
          const mailTeil =
            'mailGesendet' in res && res.mailGesendet
              ? ' Partner per E-Mail informiert (Neue Änderungsanfrage).'
              : 'mailHinweis' in res && res.mailHinweis
                ? ` (${res.mailHinweis})`
                : ''
          toast.success(`Ergänzungsvereinbarung erzeugt.${mailTeil}`)
        } else {
          toast.success('Vertrag als PDF erzeugt und hochgeladen')
        }
        onDone?.()
      } finally {
        setSaving(false)
      }
    })
  }

  const gewerkOptions = [
    { value: '', label: 'Gewerk wählen…' },
    ...bootstrap.gewerk_optionen.map((g) => ({ value: g.name, label: g.name })),
  ]

  const subtitle = [
    bootstrap.auftrag_titel,
    nachtragMode?.parent_vertrag_vom
      ? `Bezug: Vertrag vom ${nachtragMode.parent_vertrag_vom}`
      : vertragsNr !== 'Entwurf'
        ? vertragsNr
        : null,
    nachtragMode ? 'Ergänzung' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const docActions = (
    <DocActionBar
      actions={[
        {
          id: 'save',
          label: 'Speichern',
          onClick: () => void persistDraft({ notify: true }),
          icon: <Save size={20} strokeWidth={1.75} aria-hidden />,
        },
        {
          id: 'pdf',
          label: acceptMode ? 'Vertrag senden' : 'PDF erzeugen',
          onClick: () => {
            if (step < pdfStep) void handleWeiter()
            else void handlePdfErzeugen()
          },
          icon: <FileText size={20} strokeWidth={1.75} aria-hidden />,
        },
      ]}
    />
  )

  return (
    <DocumentCanvas
      title="Vertrag"
      onClose={onClose}
      onSave={() => void persistDraft({ notify: true })}
      saveBusy={saving}
      docActions={docActions}
      className="wizard-flow"
    >
      {subtitle ? <p className="mb-3 text-[length:var(--fs-text)] text-bw-text-muted">{subtitle}</p> : null}

      <nav className="document-section-nav" aria-label="Abschnitte">
        {PHASES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={cn(
              'document-section-nav__chip',
              step === p.id && 'document-section-nav__chip--active'
            )}
            onClick={() => setStep(p.id)}
          >
            {p.label}
          </button>
        ))}
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {step > 1 ? (
            <Button variant="secondary" size="sm" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Zurück
            </Button>
          ) : null}
          {step < pdfStep ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={saving}
                onClick={() => void persistDraft({ notify: true })}
                className="gap-1.5"
              >
                <Save className="h-4 w-4" aria-hidden />
                Speichern
              </Button>
              <Button size="sm" disabled={saving} onClick={() => void handleWeiter()} className="gap-1.5">
                Weiter
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={saving} onClick={() => void handlePdfErzeugen()} className="gap-1.5">
              <FileText className="h-4 w-4" aria-hidden />
              {acceptMode ? 'Vertrag senden' : 'PDF erzeugen'}
            </Button>
          )}
        </div>
      </nav>

      <div className="wizard-inner max-w-3xl">
        {step === 1 ? (
          <Card
            title={
              nachtragMode
                ? 'Partner & Bezug'
                : acceptMode
                  ? 'Partner & Gewerk (übernommen)'
                  : 'Partner & Gewerk'
            }
          >
            <div className="space-y-4">
              {nachtragMode ? (
                <div className="rounded-lg border border-bw-border bg-bw-primary/5 p-3 text-[length:var(--fs-text)]">
                  <p className="font-medium text-bw-text">Ergänzung zum bestehenden Vertrag</p>
                  <p className="mt-1 text-bw-text-muted">
                    Bezug: Nachunternehmervertrag
                    {nachtragMode.parent_vertrag_vom
                      ? ` vom ${nachtragMode.parent_vertrag_vom}`
                      : nachtragMode.parent_vertrags_nr
                        ? ` (${nachtragMode.parent_vertrags_nr})`
                        : ''}
                  </p>
                </div>
              ) : null}
              {acceptMode || nachtragMode ? (
                <p className="text-[length:var(--fs-text)] text-bw-text-muted">
                  Partner und Gewerk sind für diesen Nachtrag festgelegt.
                </p>
              ) : null}
              <Select
                label="Handwerker"
                required
                disabled={!!acceptMode || !!nachtragMode}
                value={meta.handwerker_id}
                options={[
                  { value: '', label: 'Handwerker wählen…' },
                  ...bootstrap.handwerker_optionen.map((h) => ({
                    value: h.id,
                    label: handwerkerAnzeigename(h),
                  })),
                ]}
                onChange={(e) => {
                  const id = e.target.value
                  const gewerk =
                    bootstrap.gewerk_optionen[0]?.name ??
                    bootstrap.positionen.find((p) => p.handwerker_id === id)?.gewerk_name ??
                    ''
                  const gewerkId =
                    bootstrap.gewerk_optionen.find((g) => g.name === gewerk)?.id ?? null
                  applyHandwerkerGewerk(id, gewerk, gewerkId)
                }}
              />
              <Select
                label="Gewerk"
                disabled={!!acceptMode || !!nachtragMode}
                value={meta.gewerk_name}
                options={gewerkOptions}
                onChange={(e) => {
                  const name = e.target.value
                  const gewerkId = bootstrap.gewerk_optionen.find((g) => g.name === name)?.id ?? null
                  if (meta.handwerker_id) applyHandwerkerGewerk(meta.handwerker_id, name, gewerkId)
                  else setMeta((m) => ({ ...m, gewerk_name: name, gewerk_id: gewerkId }))
                }}
              />
              {handwerker ? (
                <div className="rounded-lg border border-bw-border bg-bw-hover/40 p-3 text-[length:var(--fs-text)] text-bw-text-muted">
                  <p className="font-medium text-bw-text">{handwerkerAnzeigename(handwerker)}</p>
                  {handwerker.adresse ? <p>{handwerker.adresse}</p> : null}
                  {handwerker.telefon ? <p>Tel. {handwerker.telefon}</p> : null}
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            {nachtragMode ? (
              <Card title="Leistungspositionen (Nachtrag)">
                <NachtragPositionenEditor
                  positionen={meta.nachtrag_positionen ?? []}
                  gewerkName={meta.gewerk_name}
                  onChange={applyNachtragPositionen}
                />
              </Card>
            ) : null}
            <Card title={nachtragMode ? 'Vertragstext' : 'Bauvorhaben & Leistung'}>
              <div className="space-y-4">
                <SheetEditableField
                  label="Bauvorhaben"
                  value={meta.bauvorhaben}
                  onSave={(bauvorhaben) => setMeta((m) => ({ ...m, bauvorhaben }))}
                  kiExtraHint="Vertrags-Bauvorhaben (kundensichtbar im PDF)."
                />
                <SheetEditableField
                  label="Leistungsumfang (§2)"
                  value={meta.leistungsumfang}
                  onSave={(leistungsumfang) => setMeta((m) => ({ ...m, leistungsumfang }))}
                  multiline
                  rows={4}
                  kiExtraHint="Vertrags-Leistungsumfang für den Kunden."
                />
                <SheetEditableField
                  label="Vergütung (§3)"
                  value={meta.verguetung_text}
                  onSave={(verguetung_text) => setMeta((m) => ({ ...m, verguetung_text }))}
                  multiline
                  rows={5}
                  kiExtraHint="Vergütungstext im Vertrag für den Kunden."
                />
                {nachtragMode?.parent_verguetung_text ? (
                  <div className="rounded-lg border border-bw-border bg-bw-bg-soft p-3 text-[length:var(--fs-meta)] text-bw-text-muted">
                    <p className="mb-1 font-medium text-bw-text">Ursprüngliche Vergütung (Referenz)</p>
                    <p className="whitespace-pre-wrap">{nachtragMode.parent_verguetung_text}</p>
                  </div>
                ) : null}
              </div>
            </Card>
            {!nachtragMode ? (
              <Card title="Vertragskonditionen">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Regiesatz netto (€/h)"
                    type="number"
                    min={0}
                    step={0.5}
                    value={meta.regiesatz_netto ?? ''}
                    onChange={(e) =>
                      setMeta((m) => ({
                        ...m,
                        regiesatz_netto: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                  <Input
                    label="Sicherheitseinbehalt (%)"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={meta.einbehalt_prozent}
                    onChange={(e) =>
                      setMeta((m) => ({ ...m, einbehalt_prozent: Number(e.target.value) || 0 }))
                    }
                  />
                  <Input
                    label="Zahlungsziel (Tage)"
                    type="number"
                    min={1}
                    value={meta.zahlungsziel_tage}
                    onChange={(e) =>
                      setMeta((m) => ({ ...m, zahlungsziel_tage: Number(e.target.value) || 14 }))
                    }
                  />
                  <Input
                    label="Aufmaß-Rhythmus (Tage)"
                    type="number"
                    min={1}
                    value={meta.aufmass_rhythmus_tage}
                    onChange={(e) =>
                      setMeta((m) => ({
                        ...m,
                        aufmass_rhythmus_tage: Number(e.target.value) || 14,
                      }))
                    }
                  />
                </div>
                <div className="mt-4">
                  <SheetEditableField
                    label="Interne Notizen"
                    value={meta.notizen}
                    onSave={(notizen) => setMeta((m) => ({ ...m, notizen }))}
                    multiline
                    rows={2}
                    placeholder="Interne Notizen…"
                  />
                </div>
              </Card>
            ) : null}

            {acceptMode ? (
              <Card title="Unterlagen für den Partner">
                <div className="space-y-4">
                  <p className="text-[length:var(--fs-text)] text-bw-text-muted">
                    Wähle aus dem Leistungs-Pool, welche Unterlagen der Handwerker für diesen Auftrag
                    verbindlich einreichen muss. Er kann Stamm-Dokumente aus seinem Profil
                    wiederverwenden oder projektbezogen hochladen.
                  </p>
                  {!acceptMode.compliance_pool.length ? (
                    <p className="rounded-lg border border-bw-border bg-bw-bg-soft p-3 text-[length:var(--fs-text)] text-bw-text-muted">
                      Keine passenden Leistungs-Unterlagen im Pool — der Partner muss nur den
                      Projektvertrag bestätigen.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {acceptMode.compliance_pool.map((item) => {
                        const checked = complianceSlugs.includes(item.slug)
                        return (
                          <li key={item.slug}>
                            <label
                              className={cn(
                                'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors',
                                checked
                                  ? 'border-bw-primary/40 bg-bw-primary/5'
                                  : 'border-bw-border hover:bg-bw-hover/40'
                              )}
                            >
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 shrink-0 accent-bw-primary"
                                checked={checked}
                                onChange={() => toggleComplianceSlug(item.slug)}
                              />
                              <span className="min-w-0">
                                <span className="block text-[length:var(--fs-text)] font-medium text-bw-text">
                                  {item.bezeichnung}
                                  {item.default_pflicht ? (
                                    <span className="ml-2 text-[length:var(--fs-meta)] font-normal text-bw-text-muted">
                                      (Standard-Pflicht)
                                    </span>
                                  ) : null}
                                </span>
                                {item.beschreibung?.trim() ? (
                                  <span className="mt-0.5 block text-[length:var(--fs-meta)] text-bw-text-muted">
                                    {item.beschreibung.trim()}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
                    Ausgewählt: {complianceSlugs.length} Unterlage(n). Nach dem PDF-Versand erscheinen
                    Vertrag und Checkliste als To-do im Partner-Portal.
                  </p>
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}

        {step === pdfStep ? (
          <Card
            title={
              acceptMode ? 'Vertrag senden' : nachtragMode ? 'Ergänzung als PDF' : 'PDF erzeugen'
            }
          >
            <div className="space-y-4 text-[length:var(--fs-text)]">
              <p className="text-bw-text-muted">
                {acceptMode
                  ? 'Der Vertrag wird erzeugt. Im Partner-Portal erscheint er unter Vorgänge zum Download bzw. zur verbindlichen Zustimmung sowie die gewählten Unterlagen. Eine separate Vertrags-Mail wird nicht versendet.'
                  : nachtragMode
                    ? 'Die Ergänzungsvereinbarung wird erzeugt. Der Nachunternehmervertrag wird still aktualisiert. Der Partner erhält dieselbe Auftrags-Mail wie bei einer neuen Zuweisung — Betreff: „Neue Änderungsanfrage“.'
                    : 'Der Vertrag wird im Bärenwald-Design erzeugt und automatisch in den Auftragsdokumenten gespeichert.'}
              </p>
              {nachtragMode ? (
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-bw-border p-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-bw-primary"
                    checked={positionenAuftragSpeichern}
                    onChange={(e) => setPositionenAuftragSpeichern(e.target.checked)}
                  />
                  <span>
                    <span className="block font-medium text-bw-text">
                      Positionen im Auftrag speichern
                    </span>
                    <span className="text-bw-text-muted">
                      Neue und geänderte Leistungspositionen werden in den Auftrag übernommen.
                    </span>
                  </span>
                </label>
              ) : null}
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-bw-text-muted">Vertrags-Nr.</dt>
                  <dd className="font-medium">{vertragsNr}</dd>
                </div>
                <div>
                  <dt className="text-bw-text-muted">Partner</dt>
                  <dd className="font-medium">
                    {handwerker ? handwerkerAnzeigename(handwerker) : '—'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-bw-text-muted">Bauvorhaben</dt>
                  <dd className="font-medium">{meta.bauvorhaben || '—'}</dd>
                </div>
                {acceptMode ? (
                  <div className="sm:col-span-2">
                    <dt className="text-bw-text-muted">Pflicht-Unterlagen</dt>
                    <dd className="font-medium">
                      {complianceSlugs.length
                        ? acceptMode.compliance_pool
                            .filter((p) => complianceSlugs.includes(p.slug))
                            .map((p) => p.bezeichnung)
                            .join(', ')
                        : 'Keine — nur Projektvertrag'}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {pdfUrl ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn primary sm inline-flex gap-1.5"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    PDF öffnen
                  </a>
                  <Button variant="secondary" onClick={onClose}>
                    Schließen
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>
    </DocumentCanvas>
  )
}
