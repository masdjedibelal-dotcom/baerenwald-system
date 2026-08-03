'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eye, Plus } from 'lucide-react'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  AbnahmeBegehListe,
  AbnahmeProgressBar,
  countAbgenommeneLeistungen,
} from '@/components/auftraege/AbnahmeBegehListe'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { toast } from '@/components/ui/app-toast'
import {
  downloadAbnahmeprotokollPdf,
  getAbnahmeprotokollMailDefaults,
  saveAbnahmeAndAbschliessen,
  saveAbnahmeprotokollPdfOnly,
  saveAndSendAbnahmeprotokoll,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { updateAuftragStatusFromUi } from '@/app/(dashboard)/auftraege/actions'
import { istAuftragPositionFuerSumme } from '@/lib/auftraege/auftrag-position-aktiv'
import type { AuftragStatus } from '@/lib/types'
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
import { heuteYmd } from '@/lib/angebot-einfach'

const ABNAHME_ERGEBNIS_UI: Record<AbnahmeErgebnis, { label: string; cls: string }> = {
  abgenommen: { label: 'Abgenommen', cls: 'abnahme-erg-abgenommen' },
  mit_vorbehalt: { label: 'Mit Vorbehalt', cls: 'abnahme-erg-vorbehalt' },
  verweigert: { label: 'Verweigert', cls: 'abnahme-erg-verweigert' },
}

/** Spec §8 / Mock: drei Schritte im Abnahme-Canvas */
const SECTIONS = [
  { id: 'checkliste', label: 'Checkliste & Ergebnis' },
  { id: 'angaben', label: 'Angaben' },
  { id: 'pruefen', label: 'Prüfen & PDF' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

/** Standard „Ort, Datum“ aus Übergabe-Feldern. */
function defaultUnterschriftOrtDatum(ort: string, datum: string): string {
  const o = ort.trim()
  const d = datum.trim().slice(0, 10)
  if (o && d) return `${o}, ${d}`
  return o || d
}

function FieldCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="abnahme-field-card">
      <h3 className="abnahme-field-card__title">{title}</h3>
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
  const [activeSection, setActiveSection] = useState<SectionId>('checkliste')
  const [pending, startTransition] = useTransition('Wird gespeichert…')
  const [previewBusy, setPreviewBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const [punkte, setPunkte] = useState<AbnahmePunkt[]>(() =>
    initialPunkte?.length
      ? initialPunkte
      : buildAbnahmePunkteInitial({ positionen, angebotPositionen, gewerke })
  )
  const [abnahmeDatum, setAbnahmeDatum] = useState(initialAbnahmeDatum || heuteYmd())
  const [notizen, setNotizen] = useState(initialNotizen?.trim() || '')
  const [meta, setMeta] = useState<AbnahmeProtokollMeta>(() =>
    emptyAbnahmeProtokollMeta(initialMeta)
  )

  const onClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(`/auftraege/${auftragId}?tab=leistungen`)
  }

  const ausgewaehlt = useMemo(
    () => filterAbnahmePunkteFuerDokument(punkte).length,
    [punkte]
  )

  const progress = useMemo(() => countAbgenommeneLeistungen(punkte), [punkte])

  const maengelListe = useMemo(() => maengelAusPunkten(punkte), [punkte])

  /** Gate: Positionen ohne dokumentierten Abschluss (leistung_status ≠ erledigt). */
  const undokumentiert = useMemo(() => {
    const alle = positionen.filter(istAuftragPositionFuerSumme)
    const offen = alle.filter((p) => String(p.leistung_status ?? '').toLowerCase() !== 'erledigt')
    return { n: offen.length, m: alle.length }
  }, [positionen])

  const hasSignatur = Boolean(
    meta.unterschrift_ort_datum_an.trim() && meta.unterschrift_ort_datum_ag.trim()
  )

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

  function validateAngaben(): string | null {
    if (!abnahmeDatum.trim()) return 'Bitte Übergabedatum angeben.'
    if (!meta.uebergabe_ort.trim()) return 'Bitte Übergabeort angeben.'
    if (!meta.vertreter_an.trim()) return 'Bitte Vertreter (Auftragnehmer) angeben.'
    if (!meta.projektbezeichnung.trim()) return 'Bitte Projektbezeichnung angeben.'
    if (ausgewaehlt === 0) return 'Mindestens eine Leistung für die Abnahme auswählen (OK).'
    return null
  }

  function validateBeforeSave(): string | null {
    return validateAngaben()
  }

  function goSection(id: SectionId) {
    if (id === 'pruefen' || id === 'angaben') {
      if (ausgewaehlt === 0) {
        toast.error('Mindestens eine Leistung für die Abnahme auswählen (OK).')
        return
      }
    }
    if (id === 'pruefen') {
      const err = validateAngaben()
      if (err) {
        toast.error(err)
        setActiveSection('angaben')
        return
      }
      setMeta((m) => ensureUnterschriftOrtDatum(m))
    }
    setActiveSection(id)
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

  function erstellen(opts?: { abschliessen?: boolean; send?: boolean }) {
    const err = validateBeforeSave()
    if (err) {
      toast.error(err)
      return
    }
    const metaReady = ensureUnterschriftOrtDatum(meta)
    setMeta(metaReady)
    const abschliessen = Boolean(opts?.abschliessen ?? hasSignatur)
    const send = Boolean(opts?.send)
    startTransition(async () => {
      const payload = {
        auftragId,
        abnahmeDatum,
        punkte,
        maengel: maengelAusPunkten(punkte),
        notizen: notizen.trim() || null,
        meta: metaReady,
        protokollId,
      }
      if (abschliessen) {
        const r = await saveAbnahmeAndAbschliessen({
          ...payload,
          sendToKunde: send,
        })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        downloadPdfFromBase64(r.pdfBase64, r.filename)
        const prev = r.previousStatus
        if (r.sendWarning) {
          toast.error(
            `Abnahme gespeichert und Auftrag abgeschlossen, Versand fehlgeschlagen: ${r.sendWarning}`,
            {
              action: {
                label: 'Rückgängig',
                onClick: () => {
                  void updateAuftragStatusFromUi(auftragId, prev as AuftragStatus).then((u) => {
                    if (!u.ok) toast.error(u.message)
                    else {
                      toast.success('Abschluss rückgängig gemacht')
                      router.refresh()
                    }
                  })
                },
              },
            }
          )
        } else {
          toast.success(
            r.sentToKunde
              ? 'Abnahme gespeichert und an den Kunden gesendet — Auftrag abgeschlossen'
              : 'Abnahme gespeichert — Auftrag abgeschlossen',
            {
              action: {
                label: 'Rückgängig',
                onClick: () => {
                  void updateAuftragStatusFromUi(auftragId, prev as AuftragStatus).then((u) => {
                    if (!u.ok) toast.error(u.message)
                    else {
                      toast.success('Abschluss rückgängig gemacht')
                      router.refresh()
                    }
                  })
                },
              },
            }
          )
        }
        router.push(`/auftraege/${auftragId}?tab=leistungen`)
        router.refresh()
        return
      }
      if (send) {
        const mailDefaults = await getAbnahmeprotokollMailDefaults(auftragId)
        if (!mailDefaults.ok) {
          toast.error(mailDefaults.message)
          return
        }
        const r = await saveAndSendAbnahmeprotokoll({
          ...payload,
          betreff: mailDefaults.defaultBetreff,
          nachricht: mailDefaults.defaultNachricht,
          anrede: mailDefaults.defaultAnrede,
        })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        toast.success('Abnahmeprotokoll gespeichert und an den Kunden gesendet')
        router.push(`/auftraege/${auftragId}?tab=leistungen`)
        router.refresh()
        return
      }
      const r = await saveAbnahmeprotokollPdfOnly(payload)
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
      router.push(`/auftraege/${auftragId}?tab=leistungen`)
      router.refresh()
    })
  }

  const subtitle = [auftragsLabel, kundeName].filter(Boolean).join(' · ')
  const activeIndex = SECTIONS.findIndex((s) => s.id === activeSection)

  const ergebnisForm = (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 text-[length:var(--fs-text)] font-medium">Ergebnis</legend>
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
        <p className="mt-2 text-[length:var(--fs-meta)] leading-snug text-bw-text-muted">
          {ABNAHME_ERGEBNIS_LABEL[meta.abnahme_ergebnis]}
        </p>
      </fieldset>
      <SheetEditableField
        label="Hinweis (z. B. nicht Vertragsgegenstand)"
        value={meta.hinweis_sonstiges}
        onSave={(hinweis_sonstiges) => patchMeta({ hinweis_sonstiges })}
        multiline
        rows={3}
        kiExtraHint="Abnahmeprotokoll-Hinweis für den Kunden (PDF)."
        placeholder="Optional…"
      />
      <Input
        label="Mängelbeseitigung (global, PDF)"
        value={meta.maengel_beseitigung_spaetestens}
        onChange={(e) => patchMeta({ maengel_beseitigung_spaetestens: e.target.value })}
        placeholder="z. B. spätestens am 15.08.2026"
      />
      <SheetEditableField
        label="Interne / weitere Anmerkungen"
        value={notizen}
        onSave={setNotizen}
        multiline
        rows={3}
        placeholder="Interne Anmerkungen…"
      />
    </div>
  )

  const phaseCheckliste = (
    <div id="abnahme-sec-checkliste" className="document-canvas-sec space-y-5">
      <p className="section-h" style={{ marginBottom: 4 }}>
        Leistungen begehen &amp; abnehmen
      </p>
      <AbnahmeBegehListe
        punkte={punkte}
        onChange={setPunkte}
        katalogPositionen={positionen}
      />

      {maengelListe.length > 0 ? (
        <FieldCard title="Festgestellte Mängel">
          <ul className="space-y-3">
            {maengelListe.map((m) => {
              const punkt = punkte.find((p) => p.id === m.punkt_id)
              return (
                <li key={m.punkt_id} className="abnahme-mangel-row space-y-2">
                  <p className="text-[length:var(--fs-text)] font-medium text-bw-text">
                    {m.beschreibung}
                  </p>
                  {punkt ? (
                    <>
                      <SheetEditableField
                        label="Mangel-Beschreibung (PDF)"
                        value={punkt.notiz ?? ''}
                        onSave={(notiz) =>
                          setPunkte((prev) =>
                            prev.map((p) => (p.id === punkt.id ? { ...p, notiz } : p))
                          )
                        }
                        kiExtraHint="Mangel-Text im Abnahmeprotokoll (kundensichtbar)."
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
        </FieldCard>
      ) : null}

      <FieldCard title="Ergebnis">
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
            </dl>
          }
        >
          {ergebnisForm}
        </MobileEditableBlock>
      </FieldCard>
    </div>
  )

  const phaseAngaben = (
    <div id="abnahme-sec-angaben" className="document-canvas-sec space-y-5">
      <FieldCard title="Übergabe">
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
        </MobileEditableBlock>
      </FieldCard>

      <FieldCard title="Personen">
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
        </MobileEditableBlock>
      </FieldCard>

      <FieldCard title="Bauvorhaben">
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
            <SheetEditableField
              label="Leistungsumfang (Kurz)"
              value={meta.leistungsumfang_kurz}
              onSave={(leistungsumfang_kurz) => patchMeta({ leistungsumfang_kurz })}
              multiline
              rows={4}
              sheetContext="detail"
              placeholder="Leistungsumfang…"
            />
          </div>
        </MobileEditableBlock>
      </FieldCard>

      <FieldCard title="Übergabe-Fotos">
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
                    className="mt-1 text-[length:var(--fs-meta)] text-bw-text-muted underline"
                    onClick={() => removeFoto(url)}
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[length:var(--fs-text)] text-bw-text-muted">Noch keine Fotos.</p>
        )}
      </FieldCard>

      <FieldCard title="Unterschriften">
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
          <div className="space-y-3">
            <p className="text-[length:var(--fs-text)] text-bw-text-muted">
              Zeile „Ort, Datum“ unter jeder Unterschrift im PDF — leer = aus Übergabe übernommen.
            </p>
            <Input
              label="Auftragnehmer — Ort, Datum"
              value={meta.unterschrift_ort_datum_an}
              onChange={(e) => patchMeta({ unterschrift_ort_datum_an: e.target.value })}
              placeholder={
                defaultUnterschriftOrtDatum(meta.uebergabe_ort, abnahmeDatum) || 'Ort, Datum'
              }
            />
            <Input
              label="Auftraggeber — Ort, Datum"
              value={meta.unterschrift_ort_datum_ag}
              onChange={(e) => patchMeta({ unterschrift_ort_datum_ag: e.target.value })}
              placeholder={
                defaultUnterschriftOrtDatum(meta.uebergabe_ort, abnahmeDatum) || 'Ort, Datum'
              }
            />
            <Input
              label="Anwesend — Ort, Datum"
              value={meta.unterschrift_ort_datum_anwesend}
              onChange={(e) => patchMeta({ unterschrift_ort_datum_anwesend: e.target.value })}
              placeholder={
                defaultUnterschriftOrtDatum(meta.uebergabe_ort, abnahmeDatum) || 'Ort, Datum'
              }
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
        </MobileEditableBlock>
      </FieldCard>
    </div>
  )

  const footerActions = (
    <div className="flex flex-wrap gap-2">
      {activeSection !== 'checkliste' ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() =>
            goSection(activeSection === 'pruefen' ? 'angaben' : 'checkliste')
          }
        >
          Zurück
        </Button>
      ) : null}
      {activeSection !== 'pruefen' ? (
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={() => goSection(activeSection === 'checkliste' ? 'angaben' : 'pruefen')}
        >
          Weiter
        </Button>
      ) : (
        <>
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
            variant="secondary"
            size="sm"
            className="gap-1.5"
            loading={pending}
            disabled={previewBusy}
            onClick={() => erstellen({ abschliessen: hasSignatur, send: false })}
          >
            Speichern
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="gap-1.5"
            loading={pending}
            disabled={previewBusy}
            onClick={() => erstellen({ abschliessen: hasSignatur, send: true })}
          >
            <Check className="h-4 w-4" />
            Speichern und senden
          </Button>
        </>
      )}
    </div>
  )

  const phasePruefen = (
    <div id="abnahme-sec-pruefen" className="document-canvas-sec space-y-5">
      <p className="text-[length:var(--fs-text)] text-bw-text-muted">
        {hasSignatur
          ? 'Vorschau prüfen — Speichern schließt den Auftrag ab. „Speichern und senden“ schickt das PDF zusätzlich an den Kunden.'
          : 'Unterschriften (Ort/Datum AN + AG) setzen für Abschluss — oder ohne Signatur speichern / speichern und senden.'}
      </p>
      <FieldCard title="Zusammenfassung">
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
      </FieldCard>
      <FieldCard title="Rechtshinweise">
        <SheetEditableField
          label="Weitere Hinweise (Rechtstext)"
          value={meta.rechtshinweise}
          onSave={(rechtshinweise) => patchMeta({ rechtshinweise })}
          multiline
          rows={6}
          kiExtraHint="Rechtshinweise im Abnahmeprotokoll (kundensichtbar)."
          placeholder="Rechtshinweise…"
        />
      </FieldCard>
      <div className="hidden sm:block">{footerActions}</div>
    </div>
  )

  return (
    <DocumentCanvas
      portal
      manageHistory={false}
      title="Abnahme"
      subtitle={subtitle || undefined}
      onClose={onClose}
      onSave={() => erstellen({ abschliessen: hasSignatur })}
      saveBusy={pending}
      footerCta={footerActions}
      className="wizard-flow abnahme-canvas"
    >
      {undokumentiert.n > 0 && undokumentiert.m > 0 ? (
        <div className="abnahme-canvas-warn" role="status">
          <MockIcon ctx="default" n="alert-triangle" size={16} />
          <p>
            {undokumentiert.n} von {undokumentiert.m} Leistungen nicht dokumentiert. Die Doku ist die
            Grundlage der Abnahme — ohne sie fehlt der Nachweis. Abnahme trotzdem möglich, dann als{' '}
            <strong>Abnahme unter Vorbehalt</strong> vermerken.
            {meta.abnahme_ergebnis === 'mit_vorbehalt' ? ' (aktuell unter Vorbehalt.)' : null}
          </p>
          {meta.abnahme_ergebnis !== 'mit_vorbehalt' ? (
            <button
              type="button"
              className="abnahme-canvas-warn__action"
              onClick={() => patchMeta({ abnahme_ergebnis: 'mit_vorbehalt' })}
            >
              Als Abnahme unter Vorbehalt setzen
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="abnahme-canvas-card">
        <div className="abnahme-canvas-card__head">
          <h2 className="abnahme-canvas-card__title">Abnahmeprotokoll</h2>
          <span className="badge warten">{isEdit ? 'Entwurf' : 'Offen'}</span>
        </div>

        <nav className="stepper abnahme-canvas-stepper" aria-label="Abnahme-Schritte">
          {SECTIONS.map((s, i) => {
            const done = i < activeIndex
            const active = s.id === activeSection
            return (
              <div key={s.id} className="contents">
                {i > 0 ? <span className="step-arrow" aria-hidden>›</span> : null}
                <button
                  type="button"
                  className={cn('step', active && 'active', done && 'done')}
                  onClick={() => goSection(s.id)}
                >
                  <span className="step-n">{done ? '✓' : i + 1}</span>
                  <span className="step-lbl">{s.label}</span>
                </button>
              </div>
            )
          })}
        </nav>

        <AbnahmeProgressBar done={progress.done} total={progress.total} />

        {pending || uploading || previewBusy ? (
          <p className="abnahme-canvas-busy">
            {pending ? 'Erzeugt PDF…' : previewBusy ? 'Vorschau…' : 'Lädt Fotos…'}
          </p>
        ) : null}

        <div className="abnahme-canvas-card__body">
          {activeSection === 'checkliste' ? phaseCheckliste : null}
          {activeSection === 'angaben' ? phaseAngaben : null}
          {activeSection === 'pruefen' ? phasePruefen : null}
        </div>
      </div>
    </DocumentCanvas>
  )
}
