'use client'

import { useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eye, Plus } from 'lucide-react'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { AbnahmeprotokollChecklist } from '@/components/auftraege/AbnahmeprotokollChecklist'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { toast } from '@/components/ui/app-toast'
import {
  downloadAbnahmeprotokollPdf,
  saveAbnahmeprotokollPdfOnly,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import {
  ABNAHME_ERGEBNIS_LABEL,
  emptyAbnahmeProtokollMeta,
  type AbnahmeErgebnis,
  type AbnahmeProtokollMeta,
} from '@/lib/auftraege/abnahme-protokoll-meta'
import {
  buildAbnahmePunkteInitial,
  filterAbnahmePunkteFuerDokument,
  maengelAusPunkten,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { downloadPdfFromBase64, openPdfFromBase64 } from '@/lib/download-pdf-base64'
import type { AngebotPosition, AuftragPosition, Gewerk } from '@/lib/types'
import { cn } from '@/lib/utils'

const ABNAHME_ERGEBNIS_UI: Record<AbnahmeErgebnis, { label: string; cls: string }> = {
  abgenommen: { label: 'Abgenommen', cls: 'abnahme-erg-abgenommen' },
  mit_vorbehalt: { label: 'Mit Vorbehalt', cls: 'abnahme-erg-vorbehalt' },
  verweigert: { label: 'Verweigert', cls: 'abnahme-erg-verweigert' },
}
import { heuteYmd } from '@/lib/angebot-einfach'

const SECTIONS = [
  { id: 'inhalt', label: 'Inhalt' },
  { id: 'pruefen', label: 'Prüfen' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'unterschrift', label: 'Unterschrift' },
  { id: 'fertig', label: 'Fertig' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

function markAllOk(punkte: AbnahmePunkt[]): AbnahmePunkt[] {
  return punkte.map((p) =>
    p.beschreibung?.trim() || p.leistung_name?.trim()
      ? { ...p, status: 'ok' as const, mangel_frist: null }
      : p
  )
}

/** Standard „Ort, Datum“ aus Übergabe-Feldern. */
function defaultUnterschriftOrtDatum(ort: string, datum: string): string {
  const o = ort.trim()
  const d = datum.trim().slice(0, 10)
  if (o && d) return `${o}, ${d}`
  return o || d
}

function StepIntro({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-4">
      <div className="text-[17px] font-semibold tracking-tight text-bw-text">{title}</div>
      <p className="mt-1 text-[13px] text-bw-text-muted">{hint}</p>
    </div>
  )
}

function PhaseSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-bw-border pb-6 last:border-0 last:pb-0">
      <h3 className="mb-3 text-[15px] font-semibold text-bw-text">{title}</h3>
      {children}
    </section>
  )
}

export function AbnahmeprotokollCreateWizard({
  auftragId,
  positionen,
  angebotPositionen,
  gewerke = [],
  kundeName,
  auftragsLabel,
  initialMeta,
  initialPunkte,
  initialAbnahmeDatum,
  initialNotizen,
  isEdit = false,
  protokollId = null,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  angebotPositionen?: AngebotPosition[] | null
  gewerke?: Pick<Gewerk, 'id' | 'name' | 'slug'>[]
  kundeName: string
  auftragsLabel?: string
  initialMeta?: Partial<AbnahmeProtokollMeta>
  initialPunkte?: AbnahmePunkt[]
  initialAbnahmeDatum?: string
  initialNotizen?: string | null
  isEdit?: boolean
  protokollId?: string | null
}) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<SectionId>('inhalt')
  const [pending, startTransition] = useTransition()
  const [previewBusy, setPreviewBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const [punkte, setPunkte] = useState<AbnahmePunkt[]>(() =>
    initialPunkte?.length
      ? initialPunkte
      : markAllOk(buildAbnahmePunkteInitial({ positionen, angebotPositionen, gewerke }))
  )
  const [abnahmeDatum, setAbnahmeDatum] = useState(initialAbnahmeDatum || heuteYmd())
  const [notizen, setNotizen] = useState(initialNotizen?.trim() || '')
  const [meta, setMeta] = useState<AbnahmeProtokollMeta>(() =>
    emptyAbnahmeProtokollMeta(initialMeta)
  )

  const onClose = () => router.push(`/auftraege/${auftragId}?tab=abnahme`)

  const ausgewaehlt = useMemo(
    () => filterAbnahmePunkteFuerDokument(punkte).length,
    [punkte]
  )

  const maengelListe = useMemo(() => maengelAusPunkten(punkte), [punkte])

  function patchMeta(patch: Partial<AbnahmeProtokollMeta>) {
    setMeta((m) => ({ ...m, ...patch }))
  }

  /** Ort/Datum-Zeilen vorfüllen, wenn noch leer. */
  function ensureUnterschriftOrtDatum(m: AbnahmeProtokollMeta = meta): AbnahmeProtokollMeta {
    const fallback = defaultUnterschriftOrtDatum(m.uebergabe_ort, abnahmeDatum)
    if (!fallback) return m
    return {
      ...m,
      unterschrift_ort_datum_an: m.unterschrift_ort_datum_an.trim() || fallback,
      unterschrift_ort_datum_ag: m.unterschrift_ort_datum_ag.trim() || fallback,
      unterschrift_ort_datum_anwesend: m.unterschrift_ort_datum_anwesend.trim() || fallback,
    }
  }

  function validateInhalt(): string | null {
    if (!abnahmeDatum.trim()) return 'Bitte Übergabedatum angeben.'
    if (!meta.uebergabe_ort.trim()) return 'Bitte Übergabeort angeben.'
    if (!meta.vertreter_an.trim()) return 'Bitte Vertreter (Auftragnehmer) angeben.'
    if (!meta.projektbezeichnung.trim()) return 'Bitte Projektbezeichnung angeben.'
    if (ausgewaehlt === 0) return 'Mindestens eine Leistung für die Abnahme auswählen (OK).'
    return null
  }

  function validateBeforeSave(): string | null {
    return validateInhalt()
  }

  function goSection(id: SectionId) {
    if (id !== 'inhalt') {
      const err = validateInhalt()
      if (err) {
        toast.error(err)
        return
      }
      setMeta((m) => ensureUnterschriftOrtDatum(m))
    }
    setActiveSection(id)
    const el = document.getElementById(`abnahme-sec-${id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function uploadFotos(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      const room = Math.max(0, 4 - meta.uebergabe_foto_urls.length)
      for (const file of Array.from(files).slice(0, room)) {
        const fd = new FormData()
        fd.set('file', file)
        fd.set('filename', file.name)
        const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
        urls.push(json.url)
      }
      const nextUrls = [...meta.uebergabe_foto_urls, ...urls].slice(0, 4)
      const nextCaptions = nextUrls.map((_, i) => meta.uebergabe_foto_captions[i] ?? '')
      patchMeta({
        uebergabe_foto_urls: nextUrls,
        uebergabe_foto_captions: nextCaptions,
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removeFoto(url: string) {
    const idx = meta.uebergabe_foto_urls.indexOf(url)
    if (idx < 0) return
    const nextUrls = meta.uebergabe_foto_urls.filter((_, i) => i !== idx)
    const nextCaptions = meta.uebergabe_foto_captions.filter((_, i) => i !== idx)
    patchMeta({
      uebergabe_foto_urls: nextUrls,
      uebergabe_foto_captions: nextCaptions,
    })
  }

  function setFotoCaption(index: number, caption: string) {
    const next = meta.uebergabe_foto_urls.map((_, i) =>
      i === index ? caption : (meta.uebergabe_foto_captions[i] ?? '')
    )
    patchMeta({ uebergabe_foto_captions: next })
  }

  async function vorschauPdf() {
    const err = validateBeforeSave()
    if (err) {
      toast.error(err)
      return
    }
    const metaReady = ensureUnterschriftOrtDatum(meta)
    setMeta(metaReady)
    setPreviewBusy(true)
    try {
      const r = await downloadAbnahmeprotokollPdf({
        auftragId,
        abnahmeDatum,
        punkte,
        maengel: maengelAusPunkten(punkte),
        notizen: notizen.trim() || null,
        meta: metaReady,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      openPdfFromBase64(r.pdfBase64)
      toast.success('Vorschau geöffnet')
    } finally {
      setPreviewBusy(false)
    }
  }

  function erstellen() {
    const err = validateBeforeSave()
    if (err) {
      toast.error(err)
      return
    }
    const metaReady = ensureUnterschriftOrtDatum(meta)
    setMeta(metaReady)
    startTransition(async () => {
      const r = await saveAbnahmeprotokollPdfOnly({
        auftragId,
        abnahmeDatum,
        punkte,
        maengel: maengelAusPunkten(punkte),
        notizen: notizen.trim() || null,
        meta: metaReady,
        protokollId,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      downloadPdfFromBase64(r.pdfBase64, r.filename)
      toast.success(
        r.updated || isEdit
          ? 'Abnahmeprotokoll aktualisiert — PDF neu erzeugt'
          : 'Abnahmeprotokoll erstellt'
      )
      router.push(`/auftraege/${auftragId}?tab=abnahme`)
      router.refresh()
    })
  }

  const subtitle = [auftragsLabel, kundeName, isEdit ? 'Korrektur' : null]
    .filter(Boolean)
    .join(' · ')

  const uebergabeForm = (
    <div className="space-y-3">
      <Input
        label="Übergabedatum"
        type="date"
        value={abnahmeDatum}
        onChange={(e) => setAbnahmeDatum(e.target.value)}
      />
      <Input
        label="Uhrzeit"
        type="time"
        value={meta.uebergabe_uhrzeit}
        onChange={(e) => patchMeta({ uebergabe_uhrzeit: e.target.value })}
      />
      <Input
        label="Übergabeort"
        value={meta.uebergabe_ort}
        onChange={(e) => patchMeta({ uebergabe_ort: e.target.value })}
        placeholder="PLZ Ort / Stadtteil"
      />
    </div>
  )

  const personenForm = (
    <div className="space-y-3">
      <Input
        label="Vertreten durch (Auftragnehmer)"
        value={meta.vertreter_an}
        onChange={(e) => patchMeta({ vertreter_an: e.target.value })}
        placeholder="Name"
      />
      <Input
        label="Ansprechpartner Kunde"
        value={meta.ansprechpartner_kunde}
        onChange={(e) => patchMeta({ ansprechpartner_kunde: e.target.value })}
      />
      <Input
        label="Anwesend bei Übergabe"
        value={meta.anwesend_uebergabe}
        onChange={(e) => patchMeta({ anwesend_uebergabe: e.target.value })}
        placeholder="Optional, dritte Unterschrift"
      />
    </div>
  )

  const bauForm = (
    <div className="space-y-3">
      <Input
        label="Projektbezeichnung"
        value={meta.projektbezeichnung}
        onChange={(e) => patchMeta({ projektbezeichnung: e.target.value })}
      />
      <Input
        label="Projektadresse"
        value={meta.projektadresse}
        onChange={(e) => patchMeta({ projektadresse: e.target.value })}
      />
      <Textarea
        label="Leistungsumfang (Kurz)"
        plain
        rows={4}
        value={meta.leistungsumfang_kurz}
        onChange={(e) => patchMeta({ leistungsumfang_kurz: e.target.value })}
      />
    </div>
  )

  const ergebnisForm = (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Ergebnis</legend>
        <div
          className="pos-segmented abnahme-ergebnis-segmented"
          role="radiogroup"
          aria-label="Abnahmeergebnis"
        >
          {(Object.keys(ABNAHME_ERGEBNIS_LABEL) as AbnahmeErgebnis[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={meta.abnahme_ergebnis === key}
              aria-label={ABNAHME_ERGEBNIS_LABEL[key]}
              className={cn(
                'pos-segmented__btn abnahme-ergebnis-segmented__btn',
                ABNAHME_ERGEBNIS_UI[key].cls,
                meta.abnahme_ergebnis === key && 'pos-segmented__btn--active'
              )}
              onClick={() => patchMeta({ abnahme_ergebnis: key })}
            >
              {ABNAHME_ERGEBNIS_UI[key].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-snug text-bw-text-muted">
          {ABNAHME_ERGEBNIS_LABEL[meta.abnahme_ergebnis]}
        </p>
      </fieldset>
      <Textarea
        label="Hinweis (z. B. nicht Vertragsgegenstand)"
        plain
        rows={3}
        value={meta.hinweis_sonstiges}
        onChange={(e) => patchMeta({ hinweis_sonstiges: e.target.value })}
        placeholder="Optional…"
      />
      <Input
        label="Mängelbeseitigung (global, PDF)"
        value={meta.maengel_beseitigung_spaetestens}
        onChange={(e) => patchMeta({ maengel_beseitigung_spaetestens: e.target.value })}
        placeholder="z. B. spätestens am 15.08.2026"
      />
      <Textarea
        label="Interne / weitere Anmerkungen"
        plain
        rows={3}
        value={notizen}
        onChange={(e) => setNotizen(e.target.value)}
      />
    </div>
  )

  const unterschriftenForm = (
    <div className="space-y-3">
      <p className="text-[13px] text-bw-text-muted">
        Zeile „Ort, Datum“ unter jeder Unterschrift im PDF — leer = aus Übergabe übernommen.
      </p>
      <Input
        label="Auftragnehmer — Ort, Datum"
        value={meta.unterschrift_ort_datum_an}
        onChange={(e) => patchMeta({ unterschrift_ort_datum_an: e.target.value })}
        placeholder={defaultUnterschriftOrtDatum(meta.uebergabe_ort, abnahmeDatum) || 'Ort, Datum'}
      />
      <Input
        label="Auftraggeber — Ort, Datum"
        value={meta.unterschrift_ort_datum_ag}
        onChange={(e) => patchMeta({ unterschrift_ort_datum_ag: e.target.value })}
        placeholder={defaultUnterschriftOrtDatum(meta.uebergabe_ort, abnahmeDatum) || 'Ort, Datum'}
      />
      <Input
        label="Anwesend — Ort, Datum"
        value={meta.unterschrift_ort_datum_anwesend}
        onChange={(e) => patchMeta({ unterschrift_ort_datum_anwesend: e.target.value })}
        placeholder={defaultUnterschriftOrtDatum(meta.uebergabe_ort, abnahmeDatum) || 'Ort, Datum'}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const fallback = defaultUnterschriftOrtDatum(meta.uebergabe_ort, abnahmeDatum)
          patchMeta({
            unterschrift_ort_datum_an: fallback,
            unterschrift_ort_datum_ag: fallback,
            unterschrift_ort_datum_anwesend: fallback,
          })
        }}
      >
        Alle aus Übergabe setzen
      </Button>
    </div>
  )

  const phaseInhalt = (
    <div id="abnahme-sec-inhalt" className="document-canvas-sec space-y-8">
      <StepIntro title="Inhalt" hint="Übergabe, Personen, Projekt und Leistungen für das PDF." />
      <PhaseSection title="Übergabe">
        <Card title="Ort & Zeit">
          <MobileEditableBlock
            sheetTitle="Übergabe bearbeiten"
            overview={
              <dl className="space-y-2.5">
                <MobileOverviewField label="Datum" value={abnahmeDatum || '—'} />
                <MobileOverviewField
                  label="Uhrzeit"
                  value={meta.uebergabe_uhrzeit ? `${meta.uebergabe_uhrzeit} Uhr` : '—'}
                />
                <MobileOverviewField label="Ort" value={meta.uebergabe_ort.trim() || '—'} />
              </dl>
            }
          >
            {uebergabeForm}
          </MobileEditableBlock>
        </Card>
      </PhaseSection>
      <PhaseSection title="Personen">
        <Card title="Beteiligte">
          <MobileEditableBlock
            sheetTitle="Personen bearbeiten"
            overview={
              <dl className="space-y-2.5">
                <MobileOverviewField label="Vertreter AN" value={meta.vertreter_an.trim() || '—'} />
                <MobileOverviewField
                  label="Kunde"
                  value={meta.ansprechpartner_kunde.trim() || '—'}
                />
                <MobileOverviewField
                  label="Anwesend"
                  value={meta.anwesend_uebergabe.trim() || '—'}
                />
              </dl>
            }
          >
            {personenForm}
          </MobileEditableBlock>
        </Card>
      </PhaseSection>
      <PhaseSection title="Bauvorhaben">
        <Card title="Projekt">
          <MobileEditableBlock
            sheetTitle="Bauvorhaben bearbeiten"
            overview={
              <dl className="space-y-2.5">
                <MobileOverviewField
                  label="Bezeichnung"
                  value={meta.projektbezeichnung.trim() || '—'}
                />
                <MobileOverviewField label="Adresse" value={meta.projektadresse.trim() || '—'} />
                <MobileOverviewField
                  label="Umfang"
                  value={meta.leistungsumfang_kurz.trim() || '—'}
                />
              </dl>
            }
          >
            {bauForm}
          </MobileEditableBlock>
        </Card>
      </PhaseSection>
      <PhaseSection title="Leistungen">
        <p className="mb-3 text-[13px] text-bw-text-muted">
          OK / Mangel / Weg steuert das PDF — Drag zum Sortieren.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setPunkte(markAllOk(punkte))}>
            Alle OK
          </Button>
        </div>
        <AbnahmeprotokollChecklist
          punkte={punkte}
          onChange={setPunkte}
          mode="edit"
          gewerke={gewerke}
        />
      </PhaseSection>
    </div>
  )

  const phasePruefen = (
    <div id="abnahme-sec-pruefen" className="document-canvas-sec space-y-8">
      <StepIntro
        title="Prüfen"
        hint="Ergebnis, Mängel-Fristen, Fotos mit Beschriftung und Unterschriften."
      />
      <PhaseSection title="Ergebnis">
        <Card title="Abnahmeergebnis">
          <MobileEditableBlock
            sheetTitle="Ergebnis bearbeiten"
            overview={
              <dl className="space-y-2.5">
                <MobileOverviewField
                  label="Ergebnis"
                  value={ABNAHME_ERGEBNIS_LABEL[meta.abnahme_ergebnis]}
                />
                <MobileOverviewField
                  label="Hinweis"
                  value={meta.hinweis_sonstiges.trim() || '—'}
                />
                <MobileOverviewField
                  label="Mängelbeseitigung"
                  value={meta.maengel_beseitigung_spaetestens.trim() || '—'}
                />
                <MobileOverviewField label="Anmerkungen" value={notizen.trim() || '—'} />
              </dl>
            }
          >
            {ergebnisForm}
          </MobileEditableBlock>
        </Card>
      </PhaseSection>

      <PhaseSection title="Mängel">
        <Card title="Festgestellte Hinweise">
          {maengelListe.length === 0 ? (
            <p className="text-sm text-bw-text-muted">Keine Mängel markiert.</p>
          ) : (
            <ul className="space-y-3">
              {maengelListe.map((m) => {
                const punkt = punkte.find((p) => p.id === m.punkt_id)
                return (
                  <li
                    key={m.punkt_id}
                    className="rounded-lg border border-red-200 bg-red-50/40 p-3 space-y-2"
                  >
                    <p className="text-[14px] font-medium text-bw-text">{m.beschreibung}</p>
                    {punkt ? (
                      <>
                        <Input
                          label="Mangel-Beschreibung (PDF)"
                          value={punkt.notiz ?? ''}
                          onChange={(e) =>
                            setPunkte((prev) =>
                              prev.map((p) =>
                                p.id === punkt.id ? { ...p, notiz: e.target.value } : p
                              )
                            )
                          }
                          placeholder={punkt.beschreibung || 'Was ist mangelhaft?'}
                        />
                        <Input
                          label="Beseitigung bis"
                          type="date"
                          value={punkt.mangel_frist?.slice(0, 10) ?? ''}
                          onChange={(e) =>
                            setPunkte((prev) =>
                              prev.map((p) =>
                                p.id === punkt.id
                                  ? { ...p, mangel_frist: e.target.value.trim() || null }
                                  : p
                              )
                            )
                          }
                        />
                      </>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
          {maengelListe.length > 0 ? (
            <div className="mt-3">
              <Input
                label="Mängelbeseitigung (global, PDF)"
                value={meta.maengel_beseitigung_spaetestens}
                onChange={(e) => patchMeta({ maengel_beseitigung_spaetestens: e.target.value })}
                placeholder="z. B. spätestens am …"
              />
            </div>
          ) : null}
        </Card>
      </PhaseSection>

      <PhaseSection title="Fotos"><span id="abnahme-sec-fotos" className="sr-only" />
        <Card title="Übergabe-Fotos">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void uploadFotos(e.target.files)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            disabled={uploading || meta.uebergabe_foto_urls.length >= 4}
            onClick={() => fileRef.current?.click()}
          >
            <Plus className="h-3.5 w-3.5" />
            {uploading ? 'Lädt…' : 'Fotos hinzufügen'}
          </Button>
          {meta.uebergabe_foto_urls.length > 0 ? (
            <div className="mt-3 space-y-3">
              {meta.uebergabe_foto_urls.map((url, i) => (
                <div
                  key={url}
                  className="flex flex-col gap-2 rounded-xl border border-bw-border p-2 sm:flex-row sm:items-start"
                >
                  <button
                    type="button"
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-bw-border"
                    title="Entfernen"
                    onClick={() => removeFoto(url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <Input
                      label={`Beschriftung Foto ${i + 1}`}
                      value={meta.uebergabe_foto_captions[i] ?? ''}
                      onChange={(e) => setFotoCaption(i, e.target.value)}
                      placeholder="z. B. Ansicht Südseite"
                    />
                    <button
                      type="button"
                      className="mt-1 text-[12px] text-bw-text-muted underline"
                      onClick={() => removeFoto(url)}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-bw-text-muted">Noch keine Fotos.</p>
          )}
        </Card>
      </PhaseSection>

      <PhaseSection title="Unterschriften"><span id="abnahme-sec-unterschrift" className="sr-only" />
        <Card title="Ort & Datum">
          <MobileEditableBlock
            sheetTitle="Unterschriften bearbeiten"
            overview={
              <dl className="space-y-2.5">
                <MobileOverviewField
                  label="AN"
                  value={meta.unterschrift_ort_datum_an.trim() || '—'}
                />
                <MobileOverviewField
                  label="AG"
                  value={meta.unterschrift_ort_datum_ag.trim() || '—'}
                />
                <MobileOverviewField
                  label="Anwesend"
                  value={meta.unterschrift_ort_datum_anwesend.trim() || '—'}
                />
              </dl>
            }
          >
            {unterschriftenForm}
          </MobileEditableBlock>
        </Card>
      </PhaseSection>
    </div>
  )

  const phaseFertig = (
    <div id="abnahme-sec-fertig" className="document-canvas-sec">
      <StepIntro
        title="Fertig"
        hint={
          isEdit
            ? 'Vorschau prüfen, dann speichern — PDF wird neu erzeugt.'
            : 'PDF-Vorschau, dann abschließen.'
        }
      />
      <Card title="Zusammenfassung">
        <dl className="space-y-2.5">
          <MobileOverviewField
            label="Übergabe"
            value={`${abnahmeDatum}${meta.uebergabe_uhrzeit ? ` · ${meta.uebergabe_uhrzeit} Uhr` : ''} · ${meta.uebergabe_ort || '—'}`}
          />
          <MobileOverviewField label="Vertreter" value={meta.vertreter_an || '—'} />
          <MobileOverviewField label="Projekt" value={meta.projektbezeichnung || '—'} />
          <MobileOverviewField label="Leistungen im PDF" value={`${ausgewaehlt} Punkte`} />
          <MobileOverviewField
            label="Ergebnis"
            value={ABNAHME_ERGEBNIS_LABEL[meta.abnahme_ergebnis]}
          />
          <MobileOverviewField label="Fotos" value={String(meta.uebergabe_foto_urls.length)} />
          <MobileOverviewField
            label="Mängel"
            value={
              maengelListe.length
                ? `${maengelListe.length}${meta.maengel_beseitigung_spaetestens.trim() ? ` · ${meta.maengel_beseitigung_spaetestens.trim()}` : ''}`
                : 'Keine'
            }
          />
          <MobileOverviewField
            label="Unterschrift Ort/Datum"
            value={
              meta.unterschrift_ort_datum_an.trim() ||
              meta.unterschrift_ort_datum_ag.trim() ||
              '—'
            }
          />
        </dl>
      </Card>
      <Card title="Rechtshinweise" className="mt-3">
        <MobileEditableBlock
          sheetTitle="Rechtshinweise"
          overview={
            <p className="line-clamp-4 whitespace-pre-wrap text-sm text-bw-text-mid">
              {meta.rechtshinweise.trim() || '—'}
            </p>
          }
        >
          <Textarea
            label="Weitere Hinweise (Rechtstext)"
            plain
            rows={6}
            value={meta.rechtshinweise}
            onChange={(e) => patchMeta({ rechtshinweise: e.target.value })}
          />
        </MobileEditableBlock>
      </Card>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          loading={previewBusy}
          disabled={pending}
          onClick={() => void vorschauPdf()}
        >
          <Eye className="h-4 w-4" />
          Vorschau
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="gap-1.5"
          loading={pending}
          disabled={previewBusy}
          onClick={erstellen}
        >
          <Check className="h-4 w-4" />
          Fertig
        </Button>
      </div>
    </div>
  )

  return (
    <DocumentCanvas
      portal={false}
      title="Abnahme"
      onClose={onClose}
      onSave={erstellen}
      saveBusy={pending}
      className="wizard-flow"
    >
      {subtitle ? (
        <p className="mb-3 text-[13px] text-bw-text-muted">{subtitle}</p>
      ) : null}

      <nav className="document-section-nav" aria-label="Abschnitte">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={cn(
              'document-section-nav__chip',
              activeSection === s.id && 'document-section-nav__chip--active'
            )}
            onClick={() => goSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {pending || uploading || previewBusy ? (
        <p className="mb-3 text-[12px] text-bw-text-muted">
          {pending ? 'Erzeugt PDF…' : previewBusy ? 'Vorschau…' : 'Lädt Fotos…'}
        </p>
      ) : null}

      {phaseInhalt}
      {phasePruefen}
      {phaseFertig}
    </DocumentCanvas>
  )
}
