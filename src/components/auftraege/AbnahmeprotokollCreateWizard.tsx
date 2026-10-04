'use client'
import { DateInput } from '@/components/ui/DateInput'
import { useLocalTransition } from '@/components/ui/action-busy'

import { useCallback,useEffect,useMemo,useRef,useState,type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  AbnahmeBegehListe,
  AbnahmeMaengelCheckliste,
} from '@/components/auftraege/AbnahmeBegehListe'
import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import { MockField,MockInput } from '@/components/mock-ui/MockForm'
import { MockSegment } from '@/components/mock-ui/MockSegment'
import { MobileEditableBlock,MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { SignatureCanvas } from '@/components/ui/SignatureCanvas'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import { toast } from '@/components/ui/app-toast'
import {
  downloadAbnahmeprotokollPdf,
  getAbnahmeprotokollMailDefaults,
  saveAbnahmeAndAbschliessen,
  saveAbnahmeprotokollDraft,
  saveAbnahmeprotokollPdfOnly,
  saveAndSendAbnahmeprotokoll,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { updateAuftragStatusFromUi } from '@/app/(dashboard)/auftraege/actions'
import type { AuftragStatus } from '@/lib/types'
import {
  emptyAbnahmeProtokollMeta,
  type AbnahmeProtokollMeta,
} from '@/lib/auftraege/abnahme-protokoll-meta'
import {
  filterAbnahmePunkteFuerDokument,
  maengelAusPunkten,
  maengelFromCheckItems,
  type AbnahmeMangelCheckItem,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { downloadPdfFromBase64,pdfBlobUrlFromBase64 } from '@/lib/download-pdf-base64'
import { PdfViewer } from '@/components/ui/PdfViewer'
import type { AngebotPosition,AuftragPosition,Gewerk } from '@/lib/types'
import { cn } from '@/lib/utils'
import { heuteYmd } from '@/lib/angebot-einfach'
import { CONFIRM,COPY_BUTTON,TOAST } from '@/lib/copy'
import { useFormZwischenstand } from '@/lib/surfaces/form-zwischenstand'

/** Spec §8 / Mock: drei Schritte im Abnahme-Canvas */
const SECTIONS = [
  { id: 'checkliste', label: 'Leistungen & Mängel' },
  { id: 'angaben', label: 'Angaben' },
  { id: 'pruefen', label: 'Prüfen & PDF' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

type AbnahmeDraft = {
  punkte: AbnahmePunkt[]
  maengelItems: AbnahmeMangelCheckItem[]
  abnahmeDatum: string
  notizen: string
  meta: AbnahmeProtokollMeta
  activeSection: SectionId
}

/** Standard „Ort, Datum“ aus Übergabe-Feldern — aus der Adresse nur der Ort. */
function defaultUnterschriftOrtDatum(ort: string, datum: string): string {
  const letzter = ort.split(',').pop() ?? ''
  const o = letzter.replace(/^\s*\d{4,5}\s+/, '').trim()
  const ymd = datum.trim().slice(0, 10)
  const d = /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd.split('-').reverse().join('.') : ymd
  if (o && d) return `${o}, ${d}`
  return o || d
}

function FieldCard({ title, children }: { title: string; children: ReactNode }) {
  return <MockCard title={title}>{children}</MockCard>
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
  initialMaengelItems = [],
  initialFreigabeStatus = null,
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
  initialMaengelItems?: AbnahmeMangelCheckItem[]
  /** Nur für Badge/Anzeige; Speichern steuern die Actions. */
  initialFreigabeStatus?: string | null
  isEdit?: boolean
  protokollId?: string | null
}) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<SectionId>('checkliste')
  const [pending, startTransition] = useLocalTransition('Wird gespeichert…')
  const [previewBusy, setPreviewBusy] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // Leer anfangen — Leistungen kommen über „Leistung hinzufügen“ (aus Positionen oder frei)
  const [punkte, setPunkteState] = useState<AbnahmePunkt[]>(() => initialPunkte ?? [])
  const [maengelItems, setMaengelItemsState] = useState<AbnahmeMangelCheckItem[]>(() =>
    initialMaengelItems.length ? initialMaengelItems : []
  )
  const [abnahmeDatum, setAbnahmeDatumState] = useState(initialAbnahmeDatum || heuteYmd())
  const [notizen, setNotizenState] = useState(initialNotizen?.trim() || '')
  const [meta, setMeta] = useState<AbnahmeProtokollMeta>(() =>
    emptyAbnahmeProtokollMeta(initialMeta)
  )
  const [draftDirty, setDraftDirty] = useState(false)
  const [abnahmeGaps, setAbnahmeGaps] = useState<{ id: string; label: string }[]>([])
  const [sigTab, setSigTab] = useState<'an' | 'kunde'>('an')
  // Unterschreiben nur am Handy — am Desktop folgen die Unterschriften
  const isMobile = useIsMobile()

  /* FORM_ZWISCHENSTAND: abnahme */
  const storageKey = useMemo(
    () => `bw:crm-abnahme-draft:${auftragId}:${protokollId ?? 'neu'}`,
    [auftragId, protokollId]
  )
  const draftData = useMemo<AbnahmeDraft>(
    () => ({
      punkte,
      maengelItems,
      abnahmeDatum,
      notizen,
      meta,
      activeSection,
    }),
    [punkte, maengelItems, abnahmeDatum, notizen, meta, activeSection]
  )
  const onRestoreDraft = useCallback((data: AbnahmeDraft) => {
    setPunkteState(data.punkte)
    setMaengelItemsState(data.maengelItems)
    setAbnahmeDatumState(data.abnahmeDatum)
    setNotizenState(data.notizen)
    setMeta(data.meta)
    if (SECTIONS.some((s) => s.id === data.activeSection)) {
      setActiveSection(data.activeSection)
    }
    setDraftDirty(true)
  }, [])
  const zwischen = useFormZwischenstand<AbnahmeDraft>({
    storageKey,
    enabled: true,
    data: draftData,
    onRestore: onRestoreDraft,
  })
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  useEffect(() => {
    if (zwischen.savedHint) setLastSavedAt(Date.now())
  }, [zwischen.savedHint])

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
    }
  }, [pdfPreviewUrl])

  const setPunkte = (
    next: AbnahmePunkt[] | ((prev: AbnahmePunkt[]) => AbnahmePunkt[])
  ) => {
    setDraftDirty(true)
    setPunkteState(next)
  }
  const setMaengelItems = (
    next: AbnahmeMangelCheckItem[] | ((prev: AbnahmeMangelCheckItem[]) => AbnahmeMangelCheckItem[])
  ) => {
    setDraftDirty(true)
    setMaengelItemsState(next)
  }
  const setAbnahmeDatum = (next: string) => {
    setDraftDirty(true)
    setAbnahmeDatumState(next)
  }

  const freigabeBadgeLabel =
    (initialFreigabeStatus ?? '').trim() || (isEdit ? 'Entwurf' : 'Offen')

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

  const maengelListe = useMemo(() => {
    const fromPunkte = maengelAusPunkten(punkte)
    const fromChecks = maengelFromCheckItems(maengelItems)
    const seen = new Set(fromPunkte.map((m) => m.punkt_id))
    return [...fromPunkte, ...fromChecks.filter((m) => !seen.has(m.punkt_id))]
  }, [punkte, maengelItems])

  function buildSaveMaengel() {
    return maengelListe
  }

  const hasSignatur = (() => {
    const sigOk = (u?: string | null) => {
      const s = (u ?? '').trim()
      return s.startsWith('data:image/') || /^https?:\/\//i.test(s)
    }
    const hwNameOk = Boolean(
      meta.hw_unterschrift_name?.trim() || meta.vertreter_an.trim()
    )
    const kundeNameOk = Boolean(
      meta.kunde_unterschrift_name?.trim() ||
        meta.ansprechpartner_kunde.trim() ||
        kundeName.trim()
    )
    const hwOk =
      Boolean(meta.ohne_unterschrift_hw) || (sigOk(meta.signature_hw_url) && hwNameOk)
    const kundeOk =
      Boolean(meta.ohne_unterschrift_kunde) ||
      (sigOk(meta.signature_kunde_url) && kundeNameOk)
    // Desktop: keine Unterschrift möglich — gilt als „folgt“
    if (!isMobile) return true
    return hwOk && kundeOk
  })()

  /** Desktop: fehlende Unterschriften als „folgt“ markieren. */
  function mitUnterschriftFolgt(m: AbnahmeProtokollMeta): AbnahmeProtokollMeta {
    if (isMobile) return m
    return {
      ...m,
      ohne_unterschrift_hw: m.signature_hw_url ? m.ohne_unterschrift_hw : true,
      ohne_unterschrift_kunde: m.signature_kunde_url ? m.ohne_unterschrift_kunde : true,
      ohne_unterschrift: !m.signature_hw_url || !m.signature_kunde_url || m.ohne_unterschrift,
    }
  }

  useEffect(() => {
    if (abnahmeGaps.length === 0) return
    const next = abnahmeGaps.filter((g) => {
      if (g.id === 'angaben') return !abnahmeDatum.trim()
      if (g.id === 'pruefen') return !hasSignatur
      return true
    })
    if (next.length !== abnahmeGaps.length) setAbnahmeGaps(next)
  }, [abnahmeDatum, hasSignatur, abnahmeGaps])

  function patchMeta(patch: Partial<AbnahmeProtokollMeta>) {
    setDraftDirty(true)
    setMeta((m) => {
      const next = { ...m, ...patch }
      // Legacy-Aggregat für Mail/Actions
      if (
        'ohne_unterschrift_hw' in patch ||
        'ohne_unterschrift_kunde' in patch
      ) {
        next.ohne_unterschrift = Boolean(
          next.ohne_unterschrift_hw || next.ohne_unterschrift_kunde
        )
      }
      return next
    })
  }

  /** Ort/Datum-Zeilen vorfüllen; Signatur-Namen aus Personen übernehmen. */
  function ensureUnterschriftOrtDatum(m: AbnahmeProtokollMeta = meta): AbnahmeProtokollMeta {
    const fallback = defaultUnterschriftOrtDatum(m.uebergabe_ort, abnahmeDatum)
    return {
      ...m,
      unterschrift_ort_datum_an: m.unterschrift_ort_datum_an.trim() || fallback,
      unterschrift_ort_datum_ag: m.unterschrift_ort_datum_ag.trim() || fallback,
      unterschrift_ort_datum_anwesend: m.unterschrift_ort_datum_anwesend.trim() || fallback,
      hw_unterschrift_name:
        m.hw_unterschrift_name?.trim() || m.vertreter_an.trim() || null,
      kunde_unterschrift_name:
        m.kunde_unterschrift_name?.trim() ||
        m.ansprechpartner_kunde.trim() ||
        kundeName.trim() ||
        null,
    }
  }

  function validateAngaben(): string | null {
    if (!abnahmeDatum.trim()) return 'Bitte Übergabedatum angeben.'
    if (!meta.uebergabe_ort.trim()) return 'Bitte Übergabeort angeben.'
    if (ausgewaehlt === 0) return 'Bitte mindestens eine Leistung eintragen.'
    return null
  }

  function validateBeforeSave(): string | null {
    return validateAngaben()
  }

  function goSection(id: SectionId) {
    if (id === 'pruefen' || id === 'angaben') {
      if (ausgewaehlt === 0) {
        toast.error('Bitte mindestens eine Leistung eintragen.')
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
      toast.systemError(e, 'ui', 'Upload fehlgeschlagen')
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
    const metaReady = mitUnterschriftFolgt(ensureUnterschriftOrtDatum(meta))
    setPreviewBusy(true)
    try {
      const r = await downloadAbnahmeprotokollPdf({
        auftragId,
        abnahmeDatum,
        punkte,
        maengel: buildSaveMaengel(),
        notizen: notizen.trim() || null,
        meta: metaReady,
      })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      // In-App-Sheet statt neuem Tab — sonst schließt iOS-Back den ganzen Wizard
      const nextUrl = pdfBlobUrlFromBase64(r.pdfBase64)
      setPdfPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return nextUrl
      })
      toast.success(TOAST.vorschau_geoeffnet)
    } finally {
      setPreviewBusy(false)
    }
  }

  function closePdfPreview() {
    setPdfPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  /** Grüner Haken: als Entwurf speichern (ohne PDF/Download) — vor Ort weitermachen. */
  function entwurfSpeichern() {
    if (ausgewaehlt === 0 && !maengelListe.length) {
      toast.error('Bitte mindestens eine Leistung eintragen.')
      return
    }
    startTransition(async () => {
      const r = await saveAbnahmeprotokollDraft({
        auftragId,
        abnahmeDatum,
        punkte,
        maengel: buildSaveMaengel(),
        notizen: notizen.trim() || null,
        meta,
        protokollId,
      })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      zwischen.clear()
      setDraftDirty(false)
      setLastSavedAt(Date.now())
      toast.success('Abnahme als Entwurf gespeichert')
      router.push(`/auftraege/${auftragId}?tab=leistungen`)
      router.refresh()
    })
  }

  function erstellen(opts?: { abschliessen?: boolean; send?: boolean }) {
    const err = validateBeforeSave()
    if (err) {
      toast.error(err)
      return
    }
    const metaReady = mitUnterschriftFolgt(ensureUnterschriftOrtDatum(meta))
    const maengel = buildSaveMaengel()
    // Kein Ergebnis-Feld mehr: mit Mängeln = unter Vorbehalt, sonst abgenommen
    metaReady.abnahme_ergebnis = maengel.length > 0 ? 'mit_vorbehalt' : 'abgenommen'
    setMeta(metaReady)
    const abschliessen = Boolean(opts?.abschliessen ?? hasSignatur)
    const send = Boolean(opts?.send)
    startTransition(async () => {
      const payload = {
        auftragId,
        abnahmeDatum,
        punkte,
        maengel,
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
          toast.systemError(r)
          return
        }
        zwischen.clear()
        const prev = r.previousStatus
        if (r.sendWarning) {
          toast.error(
            `Gespeichert — Versand fehlgeschlagen: ${r.sendWarning}`,
            {
              action: {
                label: 'Rückgängig',
                onClick: () => {
                  void updateAuftragStatusFromUi(auftragId, prev as AuftragStatus).then((u) => {
                    if (!u.ok) toast.systemError(u)
                    else {
                      toast.success(TOAST.abschluss_rueckgaengig)
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
              ? 'Abnahme gesendet — Auftrag abgeschlossen'
              : 'Abnahme gespeichert — Auftrag abgeschlossen',
            {
              action: {
                label: 'Rückgängig',
                onClick: () => {
                  void updateAuftragStatusFromUi(auftragId, prev as AuftragStatus).then((u) => {
                    if (!u.ok) toast.systemError(u)
                    else {
                      toast.success(TOAST.abschluss_rueckgaengig)
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
          toast.systemError(mailDefaults)
          return
        }
        const r = await saveAndSendAbnahmeprotokoll({
          ...payload,
          betreff: mailDefaults.defaultBetreff,
          nachricht: mailDefaults.defaultNachricht,
          anrede: mailDefaults.defaultAnrede,
        })
        if (!r.ok) {
          toast.systemError(r)
          return
        }
        zwischen.clear()
        toast.success(TOAST.protokoll_gesendet)
        router.push(`/auftraege/${auftragId}?tab=leistungen`)
        router.refresh()
        return
      }
      const r = await saveAbnahmeprotokollPdfOnly(payload)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      zwischen.clear()
      setLastSavedAt(Date.now())
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

  const phaseCheckliste = (
    <div
      id="abnahme-sec-checkliste"
      data-doc-section="checkliste"
      className="document-canvas-sec space-y-5"
    >
      <p className="section-h" style={{ marginBottom: 4 }}>
        Leistungen
      </p>
      <AbnahmeBegehListe
        punkte={punkte}
        onChange={setPunkte}
        katalogPositionen={positionen}
      />

      {/* Mängel im gleichen Look wie Leistungen — ohne Karte drumherum */}
      <p className="section-h" style={{ marginBottom: 4 }}>
        Mängel
      </p>
      <AbnahmeMaengelCheckliste items={maengelItems} onChange={setMaengelItems} auftragId={auftragId} />
      {maengelItems.length > 0 ? (
        <MockField label="Mängel beseitigen bis">
          <MockInput
            value={meta.maengel_beseitigung_spaetestens}
            onChange={(e) => patchMeta({ maengel_beseitigung_spaetestens: e.target.value })}
            placeholder="z. B. spätestens am 15.08.2026"
          />
        </MockField>
      ) : null}

      <FieldCard title="Übergabe-Fotos">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void uploadFotos(e.target.files)}
        />
        <MockBtn
          type="button"
          kind="secondary" sm
          className="gap-1.5"
          disabled={uploading || meta.uebergabe_foto_urls.length >= 4}
          onClick={() => fileRef.current?.click()}
        >
          <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" />
          {uploading ? 'Lädt…' : 'Fotos hinzufügen'}
        </MockBtn>
        {meta.uebergabe_foto_urls.length > 0 ? (
          <div className="mt-3 space-y-3">
            {meta.uebergabe_foto_urls.map((url, i) => (
              <div
                key={url}
                className="flex flex-col gap-2 rounded-sheet border border-bw-border p-2 sm:flex-row sm:items-start"
              >
                <button
                  type="button"
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-card border border-bw-border"
                  title="Löschen"
                  onClick={() => removeFoto(url)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
                <div className="min-w-0 flex-1">
                  <MockField label={`Beschriftung Foto ${i + 1}`}>
                    <MockInput
                      value={meta.uebergabe_foto_captions[i] ?? ''}
                      onChange={(e) => setFotoCaption(i, e.target.value)}
                      placeholder="z. B. Ansicht Südseite"
                    />
                  </MockField>
                  <button
                    type="button"
                    className="mt-1 text-[length:var(--fs-meta)] text-bw-text-muted underline"
                    onClick={() => removeFoto(url)}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[length:var(--fs-text)] text-bw-text-muted">Noch keine Fotos.</p>
        )}
      </FieldCard>

    </div>
  )

  const phaseAngaben = (
    <div
      id="abnahme-sec-angaben"
      data-doc-section="angaben"
      className="document-canvas-sec space-y-5"
    >
      <FieldCard title="Übergabe">
        <MobileEditableBlock
          sheetContext="canvas"
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
            <MockField label="Übergabedatum">
        <DateInput
        value={abnahmeDatum}
        onChange={(e) => setAbnahmeDatum(e.target.value)}
      />
      </MockField>
            <MockField label="Uhrzeit">
        <MockInput
        type="time"
        value={meta.uebergabe_uhrzeit}
        onChange={(e) => patchMeta({ uebergabe_uhrzeit: e.target.value })}
      />
      </MockField>
            <MockField label="Übergabeort">
        <MockInput
        value={meta.uebergabe_ort}
        onChange={(e) => patchMeta({ uebergabe_ort: e.target.value })}
        placeholder="PLZ Ort / Stadtteil"
      />
      </MockField>
          </div>
        </MobileEditableBlock>
      </FieldCard>

      <FieldCard title="Personen">
        <MobileEditableBlock
          sheetContext="canvas"
          sheetTitle="Personen bearbeiten"
          overview={
            <dl className="space-y-2.5">
              <MobileOverviewField label="Bärenwald vor Ort" value={meta.vertreter_an.trim() || '—'} />
              <MobileOverviewField
                label="Kunde vor Ort"
                value={meta.ansprechpartner_kunde.trim() || '—'}
              />
            </dl>
          }
        >
          <div className="space-y-3">
            <MockField label="Bärenwald vor Ort">
              <MockInput
                value={meta.vertreter_an}
                onChange={(e) => patchMeta({ vertreter_an: e.target.value })}
                placeholder="Name"
              />
            </MockField>
            <MockField label="Kunde vor Ort">
              <MockInput
                value={meta.ansprechpartner_kunde}
                onChange={(e) => patchMeta({ ansprechpartner_kunde: e.target.value })}
              />
            </MockField>
          </div>
        </MobileEditableBlock>
      </FieldCard>

      {/* Unterschreiben nur am Handy — am Desktop folgen die Unterschriften */}
      {isMobile ? (
      <FieldCard title="Unterschriften">
        <MobileEditableBlock
          sheetContext="canvas"
          sheetTitle="Unterschriften bearbeiten"
          overview={
            <dl className="space-y-2.5">
              <MobileOverviewField
                label="Bärenwald"
                value={
                  meta.ohne_unterschrift_hw
                    ? 'Nicht vor Ort — Unterschrift folgt'
                    : meta.signature_hw_url
                      ? `${meta.hw_unterschrift_name?.trim() || meta.vertreter_an.trim() || '—'} · signiert`
                      : meta.hw_unterschrift_name?.trim() ||
                        meta.vertreter_an.trim() ||
                        'Noch nicht signiert'
                }
              />
              <MobileOverviewField
                label="Kunde"
                value={
                  meta.ohne_unterschrift_kunde
                    ? 'Nicht vor Ort — Unterschrift folgt'
                    : meta.signature_kunde_url
                      ? `${meta.kunde_unterschrift_name?.trim() || meta.ansprechpartner_kunde.trim() || kundeName || '—'} · signiert`
                      : meta.kunde_unterschrift_name?.trim() ||
                        meta.ansprechpartner_kunde.trim() ||
                        'Noch nicht signiert'
                }
              />
              <MobileOverviewField
                label="Ort/Datum"
                value={
                  meta.unterschrift_ort_datum_an.trim() ||
                  meta.unterschrift_ort_datum_ag.trim() ||
                  '—'
                }
              />
            </dl>
          }
        >
          <div className="abnahme-sig-editor space-y-4">
            <MockSegment
              aria-label="Unterzeichner"
              value={sigTab}
              onChange={setSigTab}
              className="abnahme-sig-editor__tabs w-full"
              buttonClassName="abnahme-sig-editor__tab flex-1"
              options={[
                {
                  value: 'an',
                  label:
                    meta.ohne_unterschrift_hw || meta.signature_hw_url
                      ? 'Bärenwald · ✓'
                      : 'Bärenwald',
                },
                {
                  value: 'kunde',
                  label:
                    meta.ohne_unterschrift_kunde || meta.signature_kunde_url
                      ? 'Kunde · ✓'
                      : 'Kunde',
                },
              ]}
            />

            <p className="m-0 text-[length:var(--fs-text)] text-bw-text-muted">
              Name und Unterschrift vor Ort — erscheint im PDF. Wenn jemand nicht
              signieren kann: Checkbox setzen.
            </p>

            {sigTab === 'an' ? (
              <div className="space-y-3">
                <MockField label="Name">
                  <MockInput
                    value={meta.hw_unterschrift_name ?? meta.vertreter_an ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      patchMeta({
                        hw_unterschrift_name: v,
                        vertreter_an: v.trim() || meta.vertreter_an,
                      })
                    }}
                    placeholder="Vor- und Nachname"
                    required
                  />
                </MockField>
                <MockField label="Ort, Datum">
                  <MockInput
                    value={meta.unterschrift_ort_datum_an}
                    onChange={(e) =>
                      patchMeta({ unterschrift_ort_datum_an: e.target.value })
                    }
                    placeholder={
                      defaultUnterschriftOrtDatum(meta.uebergabe_ort, abnahmeDatum) ||
                      'Ort, Datum'
                    }
                  />
                </MockField>
                <label className="abnahme-sig-editor__skip flex cursor-pointer items-start gap-2 text-[length:var(--fs-text)]">
                  <MockCheckbox
                    className="mt-0.5"
                    checked={Boolean(meta.ohne_unterschrift_hw)}
                    onChange={(e) => {
                      const on = e.target.checked
                      patchMeta({
                        ohne_unterschrift_hw: on,
                        ...(on ? { signature_hw_url: null } : {}),
                      })
                    }}
                  />
                  <span>
                    <span className="font-medium">Kann hier nicht unterschreiben</span>
                    <span className="mt-0.5 block text-[length:var(--fs-meta)] text-bw-text-muted">
                      Nicht vor Ort — Unterschrift folgt später (Pad ausblenden).
                    </span>
                  </span>
                </label>
                {meta.ohne_unterschrift_hw ? null : (
                  <SignatureCanvas
                    expandOnLandscape
                    initialDataUrl={meta.signature_hw_url}
                    onChange={(has, dataUrl) => {
                      patchMeta({ signature_hw_url: has ? dataUrl : null })
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <MockField label="Name">
                  <MockInput
                    value={
                      meta.kunde_unterschrift_name ??
                      meta.ansprechpartner_kunde ??
                      kundeName ??
                      ''
                    }
                    onChange={(e) => {
                      const v = e.target.value
                      patchMeta({
                        kunde_unterschrift_name: v,
                        ansprechpartner_kunde: v.trim() || meta.ansprechpartner_kunde,
                      })
                    }}
                    placeholder="Vor- und Nachname des Kunden"
                    required
                  />
                </MockField>
                <MockField label="Ort, Datum">
                  <MockInput
                    value={meta.unterschrift_ort_datum_ag}
                    onChange={(e) =>
                      patchMeta({ unterschrift_ort_datum_ag: e.target.value })
                    }
                    placeholder={
                      defaultUnterschriftOrtDatum(meta.uebergabe_ort, abnahmeDatum) ||
                      'Ort, Datum'
                    }
                  />
                </MockField>
                <label className="abnahme-sig-editor__skip flex cursor-pointer items-start gap-2 text-[length:var(--fs-text)]">
                  <MockCheckbox
                    className="mt-0.5"
                    checked={Boolean(meta.ohne_unterschrift_kunde)}
                    onChange={(e) => {
                      const on = e.target.checked
                      patchMeta({
                        ohne_unterschrift_kunde: on,
                        ...(on ? { signature_kunde_url: null } : {}),
                      })
                    }}
                  />
                  <span>
                    <span className="font-medium">Kann hier nicht unterschreiben</span>
                    <span className="mt-0.5 block text-[length:var(--fs-meta)] text-bw-text-muted">
                      Nicht vor Ort — Unterschrift folgt später (Pad ausblenden).
                    </span>
                  </span>
                </label>
                {meta.ohne_unterschrift_kunde ? null : (
                  <SignatureCanvas
                    expandOnLandscape
                    initialDataUrl={meta.signature_kunde_url}
                    onChange={(has, dataUrl) => {
                      patchMeta({ signature_kunde_url: has ? dataUrl : null })
                    }}
                  />
                )}
              </div>
            )}

            <MockBtn
              type="button"
              kind="ghost"
              sm
              onClick={() => {
                const fallback = defaultUnterschriftOrtDatum(
                  meta.uebergabe_ort,
                  abnahmeDatum
                )
                patchMeta({
                  unterschrift_ort_datum_an: fallback,
                  unterschrift_ort_datum_ag: fallback,
                  unterschrift_ort_datum_anwesend: fallback,
                })
              }}
            >
              Ort/Datum aus Übergabe setzen
            </MockBtn>
          </div>
        </MobileEditableBlock>
      </FieldCard>
      ) : null}
    </div>
  )

  const footerActions = (
    <div className="abnahme-canvas-footer">
      <div className="abnahme-canvas-footer__start">
        {activeSection !== 'checkliste' ? (
          <MockBtn
            type="button"
            kind="secondary"
            className="abnahme-canvas-footer__nav"
            disabled={pending || previewBusy}
            onClick={() =>
              goSection(activeSection === 'pruefen' ? 'angaben' : 'checkliste')
            }
          >
            Zurück
          </MockBtn>
        ) : null}
      </div>
      <div className="abnahme-canvas-footer__end">
        {activeSection !== 'pruefen' ? (
          <MockBtn
            type="button"
            kind="primary"
            className="abnahme-canvas-footer__primary"
            disabled={pending || previewBusy}
            onClick={() =>
              goSection(activeSection === 'checkliste' ? 'angaben' : 'pruefen')
            }
          >
            Weiter
          </MockBtn>
        ) : (
          <MockBtn
            type="button"
            kind="primary"
            className="abnahme-canvas-footer__primary"
            disabled={pending || previewBusy}
            loading={pending}
            onClick={() => {
              const gaps: { id: string; label: string }[] = []
              if (!abnahmeDatum.trim()) {
                gaps.push({ id: 'angaben', label: 'Abnahmedatum' })
              }
              if (!hasSignatur) {
                gaps.push({ id: 'pruefen', label: 'Unterschriften' })
              }
              if (gaps.length > 0) {
                setAbnahmeGaps(gaps)
                goSection(gaps[0]!.id === 'angaben' ? 'angaben' : 'pruefen')
                return
              }
              setAbnahmeGaps([])
              // Abnehmen: Auftrag abschließen und Protokoll an den Kunden senden
              erstellen({ abschliessen: true, send: true })
            }}
          >
            Abnehmen
          </MockBtn>
        )}
      </div>
    </div>
  )

  const phasePruefen = (
    <div
      id="abnahme-sec-pruefen"
      data-doc-section="pruefen"
      className="document-canvas-sec space-y-5"
    >
      <p className="text-[length:var(--fs-text)] text-bw-text-muted">
        {hasSignatur
          ? '„Abnehmen“ schließt den Auftrag ab und sendet das Protokoll an den Kunden.'
          : 'Beide Seiten: Unterschrift zeichnen oder „Kann hier nicht unterschreiben“ setzen.'}
      </p>
      <FieldCard title="Zusammenfassung">
        <dl className="space-y-2.5">
          <MobileOverviewField
            label="Übergabe"
            value={`${abnahmeDatum.slice(0, 10).split('-').reverse().join('.')}${meta.uebergabe_uhrzeit ? ` · ${meta.uebergabe_uhrzeit} Uhr` : ''} · ${meta.uebergabe_ort || '—'}`}
          />
          <MobileOverviewField label="Bärenwald vor Ort" value={meta.vertreter_an || '—'} />
          <MobileOverviewField label="Vorhaben" value={meta.projektbezeichnung || '—'} />
          <MobileOverviewField label="Leistungen" value={String(ausgewaehlt)} />
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
            label="Unterschriften"
            value={
              !isMobile
                ? 'Folgen (Unterschrift am Handy)'
                : hasSignatur
                ? [
                    meta.ohne_unterschrift_hw
                      ? 'AN folgt'
                      : meta.signature_hw_url
                        ? 'AN signiert'
                        : null,
                    meta.ohne_unterschrift_kunde
                      ? 'AG folgt'
                      : meta.signature_kunde_url
                        ? 'AG signiert'
                        : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'OK'
                : meta.signature_hw_url ||
                    meta.signature_kunde_url ||
                    meta.ohne_unterschrift_hw ||
                    meta.ohne_unterschrift_kunde
                  ? 'Unvollständig'
                  : '—'
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
    </div>
  )

  const headerActions = (
    <>
      {activeSection === 'pruefen' ? (
        <MockBtn
          className="editor-sheet__confirm"
          type="button"
          disabled={pending || previewBusy}
          onClick={() => void vorschauPdf()}
          aria-label="Vorschau"
          title="Vorschau"
        >
          <MockIcon n="eye" ctx="row" className="h-5 w-5" aria-hidden />
        </MockBtn>
      ) : null}
      <MockBtn
        className="editor-sheet__confirm"
        type="button"
        disabled={pending || previewBusy}
        onClick={entwurfSpeichern}
        aria-label={COPY_BUTTON.entwurfSpeichern}
        title={COPY_BUTTON.entwurfSpeichern}
      >
        <MockIcon n="check" ctx="row" className="h-5 w-5" aria-hidden />
      </MockBtn>
    </>
  )

  return (
    <>
    <DocumentCanvas
      portal
      manageHistory={false}
      title="Abnahme"
      subtitle={subtitle || undefined}
      onClose={onClose}
      onSaveDraftClose={entwurfSpeichern}
      draftDirty={draftDirty}
      lastSavedAt={lastSavedAt}
      headerEnd={headerActions}
      footerCta={footerActions}
      className="wizard-flow abnahme-canvas"
    >
      {abnahmeGaps.length > 0 ? (
        <div className="document-canvas__checklist abnahme-canvas-gaps" role="alert">
          <p className="document-canvas__checklist-lead m-0">
            Bitte noch ergänzen: {abnahmeGaps.map((g) => g.label).join(', ')}
          </p>
          <ul className="document-canvas__checklist-list m-0">
            {abnahmeGaps.map((g) => (
              <li key={g.id}>
                <MockBtn
                  type="button"
                  className="document-canvas__checklist-jump"
                  onClick={() => {
                    goSection(g.id === 'angaben' ? 'angaben' : 'pruefen')
                  }}
                >
                  {g.label}
                  <MockIcon n="chevron-right" ctx="row" className="h-3.5 w-3.5" aria-hidden />
                </MockBtn>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {/* Kein Warnkasten mehr: Ergebnis „mit Vorbehalt“ wählt man selbst, wenn nötig */}

      <div className="abnahme-canvas">
        <div className="abnahme-canvas__head">
          <h2 className="abnahme-canvas__title">Abnahmeprotokoll</h2>
          <span className="badge warten">{freigabeBadgeLabel}</span>
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
                  data-doc-section={s.id}
                  onClick={() => goSection(s.id)}
                >
                  <span className="step-n">{done ? '✓' : i + 1}</span>
                  <span className="step-lbl">{s.label}</span>
                </button>
              </div>
            )
          })}
        </nav>

        {pending || uploading || previewBusy ? (
          <p className="abnahme-canvas-busy">
            {pending ? 'Erzeugt PDF…' : previewBusy ? 'Vorschau…' : 'Lädt Fotos…'}
          </p>
        ) : null}

        <div className="abnahme-canvas__body">
          {activeSection === 'checkliste' ? phaseCheckliste : null}
          {activeSection === 'angaben' ? phaseAngaben : null}
          {activeSection === 'pruefen' ? phasePruefen : null}
        </div>
      </div>
    </DocumentCanvas>
    <PdfViewer
      open={Boolean(pdfPreviewUrl)}
      onClose={closePdfPreview}
      url={pdfPreviewUrl ?? ''}
      title="Abnahme-Vorschau"
      context="canvas"
    />
    <ConfirmPopup
      open={zwischen.promptOpen}
      title={zwischen.promptTitle}
      confirmLabel={CONFIRM.restoreDraft}
      cancelLabel={CONFIRM.restoreDecline}
      onConfirm={zwischen.acceptRestore}
      onClose={zwischen.declineRestore}
    />
    </>
  )
}
