'use client'
import {
  actionBusy,
  showRouteBusy,
  useLocalTransition,
} from '@/components/ui/action-busy'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eye, Plus, Trash2 } from 'lucide-react'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { ACTION_ICON_STROKE } from '@/components/ui/ActionIcon'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  AbnahmeBegehListe,
  AbnahmeMaengelCheckliste,
  AbnahmeProgressBar,
  countAbgenommeneLeistungen,
} from '@/components/auftraege/AbnahmeBegehListe'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { SignatureCanvas } from '@/components/ui/SignatureCanvas'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import { toast } from '@/components/ui/app-toast'
import {
  deleteAbnahmeprotokoll,
  getAbnahmeprotokollMailDefaults,
  previewAbnahmeprotokollPdf,
  saveAbnahmeAndAbschliessen,
  saveAbnahmeprotokollDraft,
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
  maengelFromCheckItems,
  type AbnahmeMangelCheckItem,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'
import type { AbnahmeFreigabeStatus } from '@/lib/auftraege/abnahme-freigabe'
import { downloadPdfFromBase64, openPreviewTab } from '@/lib/download-pdf-base64'
import { optimizeImageForAbnahmePdf } from '@/lib/media/optimize-image-for-upload'
import type { AngebotPosition, AuftragPosition, Gewerk } from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'
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

/** Standard „Ort, Datum“ aus Übergabe-Feldern (Datum immer TT.MM.JJJJ). */
function defaultUnterschriftOrtDatum(ort: string, datum: string): string {
  const o = ort.trim()
  const de = formatDatum(datum)
  const deOk = de !== '—' ? de : ''
  if (o && deOk) return `${o}, ${deOk}`
  return o || deOk
}

/** Anzeige: eingebettete ISO-YMD → TT.MM.JJJJ. */
function displayDeDatum(value: string): string {
  const t = value.trim()
  if (!t) return '—'
  const replaced = t.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y, m, d) => `${d}.${m}.${y}`)
  return replaced
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
  initialMaengelItems,
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
  initialFreigabeStatus?: AbnahmeFreigabeStatus | null
  isEdit?: boolean
  protokollId?: string | null
}) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<SectionId>('checkliste')
  const [pending, startTransition] = useLocalTransition('Wird gespeichert…')
  const [sendBusy, setSendBusy] = useState(false)
  const [previewBusy, setPreviewBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [sessionProtokollId, setSessionProtokollId] = useState<string | null>(
    protokollId?.trim() || null
  )
  const [draftDirty, setDraftDirty] = useState(false)
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  const interactionBusy = pending || draftSaving || sendBusy
  const skipDirtyRef = useRef(true)
  const canDiscardEntwurf =
    !initialFreigabeStatus ||
    initialFreigabeStatus === 'entwurf' ||
    initialFreigabeStatus === 'abgelehnt'

  const [punkte, setPunkte] = useState<AbnahmePunkt[]>(() => {
    if (initialPunkte?.length) return initialPunkte
    // CRM-Neu: alle Leistungen vorausgewählt → landen im PDF
    return buildAbnahmePunkteInitial({
      positionen,
      angebotPositionen,
      gewerke,
    }).map((p) => ({ ...p, status: 'ok' as const }))
  })
  const [maengelItems, setMaengelItems] = useState<AbnahmeMangelCheckItem[]>(
    () => initialMaengelItems ?? []
  )
  const [abnahmeDatum, setAbnahmeDatum] = useState(initialAbnahmeDatum || heuteYmd())
  const [notizen, setNotizen] = useState(initialNotizen?.trim() || '')
  const [meta, setMeta] = useState<AbnahmeProtokollMeta>(() =>
    emptyAbnahmeProtokollMeta(initialMeta)
  )

  useEffect(() => {
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false
      return
    }
    setDraftDirty(true)
  }, [punkte, maengelItems, meta, notizen, abnahmeDatum])

  function leaveWizard() {
    setDraftDirty(false)
    setCloseConfirmOpen(false)
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(`/auftraege/${auftragId}?tab=leistungen`)
  }

  async function persistDraft(opts?: { notify?: boolean }): Promise<string | null> {
    try {
      const r = await saveAbnahmeprotokollDraft({
        auftragId,
        abnahmeDatum,
        punkte,
        maengel: buildSaveMaengel(),
        notizen: notizen.trim() || null,
        meta: ensureUnterschriftOrtDatum(meta),
        protokollId: sessionProtokollId,
      })
      if (!r?.ok) {
        if (opts?.notify !== false) toast.error(r?.message ?? 'Entwurf speichern fehlgeschlagen')
        return null
      }
      setSessionProtokollId(r.protokollId)
      if (r.meta) setMeta(r.meta)
      setDraftDirty(false)
      if (opts?.notify) toast.success('Entwurf gespeichert')
      return r.protokollId
    } catch (e) {
      if (opts?.notify !== false) {
        toast.error(e instanceof Error ? e.message : 'Entwurf speichern fehlgeschlagen')
      }
      return null
    }
  }

  /** Schließen = Entwurf speichern (Fotos/Mängel bleiben). */
  async function handleClose() {
    if (interactionBusy) return
    if (!draftDirty) {
      leaveWizard()
      return
    }
    setDraftSaving(true)
    try {
      const id = await persistDraft({ notify: true })
      if (!id) {
        setCloseConfirmOpen(true)
        return
      }
      leaveWizard()
      router.refresh()
    } finally {
      setDraftSaving(false)
    }
  }

  /** Verwerfen = Entwurf löschen, Stand weg — Auftrag läuft ohne Abnahme weiter. */
  async function handleDiscard() {
    if (interactionBusy) return
    setDraftSaving(true)
    try {
      if (sessionProtokollId && canDiscardEntwurf) {
        const r = await deleteAbnahmeprotokoll(sessionProtokollId, auftragId)
        if (!r?.ok) {
          toast.error(r?.message ?? 'Löschen fehlgeschlagen')
          return
        }
        toast.success('Abnahme-Entwurf entfernt')
      }
      setSessionProtokollId(null)
      setDraftDirty(false)
      leaveWizard()
      router.refresh()
    } finally {
      setDraftSaving(false)
    }
  }

  async function handleSaveDraftOnly() {
    if (interactionBusy) return
    setDraftSaving(true)
    try {
      const id = await persistDraft({ notify: true })
      if (id) router.refresh()
    } finally {
      setDraftSaving(false)
    }
  }

  const ausgewaehlt = useMemo(
    () => filterAbnahmePunkteFuerDokument(punkte).length,
    [punkte]
  )

  const progress = useMemo(() => countAbgenommeneLeistungen(punkte), [punkte])

  const maengelListe = useMemo(() => {
    const fromPunkte = maengelAusPunkten(punkte)
    const fromChecks = maengelFromCheckItems(maengelItems)
    const seen = new Set(fromPunkte.map((m) => m.punkt_id))
    return [...fromPunkte, ...fromChecks.filter((m) => !seen.has(m.punkt_id))]
  }, [punkte, maengelItems])

  function buildSaveMaengel() {
    return maengelListe
  }

  /** Gate: Positionen ohne dokumentierten Abschluss (leistung_status ≠ erledigt). */
  const undokumentiert = useMemo(() => {
    const alle = positionen.filter(istAuftragPositionFuerSumme)
    const offen = alle.filter((p) => String(p.leistung_status ?? '').toLowerCase() !== 'erledigt')
    return { n: offen.length, m: alle.length }
  }, [positionen])

  const hasSignatur = (() => {
    const sigOk = (u?: string | null) => {
      const s = (u ?? '').trim()
      return s.startsWith('data:image/') || /^https?:\/\//i.test(s)
    }
    return Boolean(
      sigOk(meta.signature_hw_url) &&
        sigOk(meta.signature_kunde_url) &&
        (meta.hw_unterschrift_name?.trim() || meta.vertreter_an.trim()) &&
        (meta.kunde_unterschrift_name?.trim() ||
          meta.ansprechpartner_kunde.trim() ||
          kundeName.trim())
    )
  })()

  function patchMeta(patch: Partial<AbnahmeProtokollMeta>) {
    setMeta((m) => ({ ...m, ...patch }))
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
    if (!meta.vertreter_an.trim()) return 'Bitte Handwerker vor Ort angeben.'
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
      if (!hasSignatur && !meta.ohne_unterschrift) {
        toast.error(
          'Unterschrift fehlt — bitte Kunde unterschreiben lassen oder „PDF ohne Unterschrift“ anhaken.'
        )
        setActiveSection('angaben')
        return
      }
      const ready = ensureUnterschriftOrtDatum(meta)
      setMeta(ready)
      // Entwurf sichern bevor Prüfen — Vorschau/Remount darf nichts verlieren
      void saveAbnahmeprotokollDraft({
        auftragId,
        abnahmeDatum,
        punkte,
        maengel: buildSaveMaengel(),
        notizen: notizen.trim() || null,
        meta: ready,
        protokollId: sessionProtokollId,
      })
        .then((r) => {
          if (!r?.ok) return
          setSessionProtokollId(r.protokollId)
          if (r.meta) setMeta(r.meta)
          setDraftDirty(false)
        })
        .catch(() => {
          /* Toast nur bei explizitem Speichern — hier still */
        })
    }
    setActiveSection(id)
  }

  async function uploadFotos(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      const room = Math.max(0, 8 - meta.uebergabe_foto_urls.length)
      for (const file of Array.from(files).slice(0, room)) {
        let uploadFile = file
        try {
          uploadFile = await optimizeImageForAbnahmePdf(file)
        } catch {
          uploadFile = file
        }
        const fd = new FormData()
        fd.set('file', uploadFile)
        fd.set('filename', uploadFile.name)
        const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
        urls.push(json.url)
      }
      const nextUrls = [...meta.uebergabe_foto_urls, ...urls].slice(0, 8)
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
    // Synchron im Tap öffnen — sonst blockiert Mobil den Tab nach dem await
    const previewTab = openPreviewTab()
    setPreviewBusy(true)
    try {
      // Zuerst Entwurf speichern: Remount/Fehler nach Vorschau darf Daten nicht vernichten.
      // PDF als Storage-URL öffnen (kein riesiges Base64 → kein „Exceed Maximum“).
      const r = await previewAbnahmeprotokollPdf({
        auftragId,
        abnahmeDatum,
        punkte,
        maengel: buildSaveMaengel(),
        notizen: notizen.trim() || null,
        meta: metaReady,
        protokollId: sessionProtokollId,
      })
      if (!r?.ok) {
        previewTab?.close()
        toast.error(r?.message ?? 'Vorschau fehlgeschlagen')
        return
      }
      setSessionProtokollId(r.protokollId)
      if (r.meta) setMeta(r.meta)
      setDraftDirty(false)
      if (previewTab && !previewTab.closed) {
        previewTab.location.href = r.url
      } else {
        window.open(r.url, '_blank', 'noopener,noreferrer')
      }
      toast.success('Vorschau geöffnet')
    } catch {
      previewTab?.close()
      toast.error('Vorschau fehlgeschlagen')
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
    const maengel = buildSaveMaengel()
    if (maengel.length > 0 && metaReady.abnahme_ergebnis === 'abgenommen') {
      metaReady.abnahme_ergebnis = 'mit_vorbehalt'
    }
    setMeta(metaReady)

    const ohneUnterschrift = Boolean(metaReady.ohne_unterschrift)
    const abschliessen = Boolean(opts?.abschliessen)
    const send = Boolean(opts?.send)

    if (!hasSignatur && !ohneUnterschrift) {
      toast.error(
        'Unterschriften fehlen — bitte zeichnen oder „PDF ohne Unterschrift“ anhaken.'
      )
      setActiveSection('angaben')
      return
    }

    const payload = {
      auftragId,
      abnahmeDatum,
      punkte,
      maengel,
      notizen: notizen.trim() || null,
      meta: metaReady,
      protokollId: sessionProtokollId,
    }

    async function afterAbschliessenSuccess(r: {
      pdfBase64: string
      filename: string
      previousStatus: string
      sentToKunde: boolean
      sendWarning?: string
    }) {
      downloadPdfFromBase64(r.pdfBase64, r.filename)
      const prev = r.previousStatus
      if (r.sendWarning) {
        toast.error(`Gespeichert — Versand fehlgeschlagen: ${r.sendWarning}`, {
          action: {
            label: 'Rückgängig',
            onClick: () => {
              void updateAuftragStatusFromUi(auftragId, prev as AuftragStatus).then((u) => {
                if (!u?.ok) toast.error(u?.message ?? 'Rückgängig fehlgeschlagen')
                else {
                  toast.success('Abschluss rückgängig')
                  router.refresh()
                }
              })
            },
          },
        })
      } else {
        toast.success(
          r.sentToKunde
            ? 'Abnahme an Kunden gesendet — Auftrag abgeschlossen · PDF heruntergeladen'
            : 'Abnahme gespeichert — Auftrag abgeschlossen · PDF heruntergeladen',
          {
            action: {
              label: 'Rückgängig',
              onClick: () => {
                void updateAuftragStatusFromUi(auftragId, prev as AuftragStatus).then((u) => {
                  if (!u?.ok) toast.error(u?.message ?? 'Rückgängig fehlgeschlagen')
                  else {
                    toast.success('Abschluss rückgängig')
                    router.refresh()
                  }
                })
              },
            },
          }
        )
      }
      setDraftDirty(false)
      showRouteBusy('Wird geschlossen…')
      router.push(`/auftraege/${auftragId}?tab=dokumente`)
      router.refresh()
    }

    /** An Kunden senden: globales Loading, PDF-Download, Wizard zu — Auftrag bleibt offen. */
    if (send && !abschliessen) {
      if (interactionBusy) return
      setSendBusy(true)
      void actionBusy
        .run('Abnahme wird an Kunden gesendet…', async () => {
          const mailDefaults = await getAbnahmeprotokollMailDefaults(auftragId, {
            ohneUnterschrift: ohneUnterschrift,
            kundeSigniert: Boolean(metaReady.signature_kunde_url?.trim()),
            protokollId: sessionProtokollId,
          })
          if (!mailDefaults?.ok) {
            toast.error(mailDefaults?.message ?? 'Mail-Defaults fehlgeschlagen')
            return
          }
          const r = await saveAndSendAbnahmeprotokoll({
            ...payload,
            betreff: mailDefaults.defaultBetreff,
            nachricht: mailDefaults.defaultNachricht,
            anrede: mailDefaults.defaultAnrede,
          })
          if (!r?.ok) {
            toast.error(r?.message ?? 'Senden fehlgeschlagen')
            return
          }
          downloadPdfFromBase64(r.pdfBase64, r.filename)
          toast.success('Abnahme an Kunden gesendet · PDF heruntergeladen')
          setDraftDirty(false)
          showRouteBusy('Wird geschlossen…')
          router.push(`/auftraege/${auftragId}?tab=dokumente`)
          router.refresh()
        })
        .finally(() => setSendBusy(false))
      return
    }

    startTransition(async () => {
      if (abschliessen) {
        const r = await saveAbnahmeAndAbschliessen({
          ...payload,
          sendToKunde: send,
        })
        if (!r?.ok) {
          toast.error(r?.message ?? 'Speichern fehlgeschlagen')
          return
        }
        afterAbschliessenSuccess(r)
        return
      }
      const r = await saveAbnahmeprotokollPdfOnly(payload)
      if (!r?.ok) {
        toast.error(r?.message ?? 'Speichern fehlgeschlagen')
        return
      }
      setSessionProtokollId(r.protokollId)
      setDraftDirty(false)
      downloadPdfFromBase64(r.pdfBase64, r.filename)
      toast.success(
        ohneUnterschrift
          ? 'PDF ohne Unterschrift gespeichert — in CRM-Dokumenten & Unterlagen. Später an Kunden senden.'
          : r.updated || isEdit
            ? 'Abnahmeprotokoll aktualisiert — PDF neu erzeugt'
            : 'Abnahmeprotokoll erstellt'
      )
      showRouteBusy('Wird geschlossen…')
      router.push(`/auftraege/${auftragId}?tab=dokumente`)
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
        rows={14}
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
        rows={14}
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

      <FieldCard title="Mängel (optional)">
        <AbnahmeMaengelCheckliste
          items={maengelItems}
          onChange={setMaengelItems}
          auftragId={auftragId}
        />
      </FieldCard>

      {maengelListe.length > 0 ? (
        <FieldCard title="Festgestellte Mängel">
          <ul className="space-y-3">
            {maengelListe.map((m) => {
              const punkt = punkte.find((p) => p.id === m.punkt_id)
              const fotos = (m.foto_urls ?? []).filter(Boolean)
              return (
                <li key={m.punkt_id} className="abnahme-mangel-row space-y-2">
                  <p className="text-[length:var(--fs-text)] font-medium text-bw-text">
                    {m.beschreibung}
                  </p>
                  {fotos.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {fotos.slice(0, 8).map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${url}-${i}`}
                          src={url}
                          alt=""
                          className="h-14 w-14 rounded border border-bw-border object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
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
          sheetContext="canvas"
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
          sheetContext="canvas"
          overview={
            <dl className="space-y-2.5">
              <MobileOverviewField label="Datum" value={displayDeDatum(abnahmeDatum)} />
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
          sheetContext="canvas"
          overview={
            <dl className="space-y-2.5">
              <MobileOverviewField label="Handwerker vor Ort" value={meta.vertreter_an.trim() || '—'} />
              <MobileOverviewField
                label="Kunde vor Ort"
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
              label="Handwerker vor Ort"
              value={meta.vertreter_an}
              onChange={(e) => patchMeta({ vertreter_an: e.target.value })}
              placeholder="Name"
            />
            <Input
              label="Kunde vor Ort"
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
          sheetContext="canvas"
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
              rows={14}
              sheetContext="canvas"
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
          disabled={uploading || meta.uebergabe_foto_urls.length >= 8}
          onClick={() => fileRef.current?.click()}
        >
          <Plus className="h-3.5 w-3.5" />
          {uploading ? 'Lädt…' : 'Fotos hinzufügen'}
        </Button>
        <p className="mt-1.5 text-[length:var(--fs-meta)] text-[var(--text-3)]">
          Max. 8 Fotos · erscheinen im PDF unter „Vor-Ort“
        </p>
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
          sheetContext="canvas"
          overview={
            <dl className="space-y-2.5">
              <MobileOverviewField
                label="Auftragnehmer"
                value={
                  meta.signature_hw_url
                    ? `${meta.hw_unterschrift_name?.trim() || meta.vertreter_an.trim() || '—'} · signiert`
                    : meta.hw_unterschrift_name?.trim() ||
                      meta.vertreter_an.trim() ||
                      'Noch nicht signiert'
                }
              />
              <MobileOverviewField
                label="Auftraggeber"
                value={
                  meta.signature_kunde_url
                    ? `${meta.kunde_unterschrift_name?.trim() || meta.ansprechpartner_kunde.trim() || kundeName || '—'} · signiert`
                    : meta.kunde_unterschrift_name?.trim() ||
                      meta.ansprechpartner_kunde.trim() ||
                      'Noch nicht signiert'
                }
              />
              <MobileOverviewField
                label="Ort/Datum"
                value={
                  displayDeDatum(
                    meta.unterschrift_ort_datum_an.trim() ||
                      meta.unterschrift_ort_datum_ag.trim() ||
                      ''
                  )
                }
              />
              {meta.ohne_unterschrift ? (
                <MobileOverviewField label="Modus" value="Ohne Unterschrift" />
              ) : null}
            </dl>
          }
        >
          <div className="space-y-6">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-bw-border bg-[var(--bg-2,var(--card))] p-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0"
                checked={Boolean(meta.ohne_unterschrift)}
                onChange={(e) => patchMeta({ ohne_unterschrift: e.target.checked })}
              />
              <span className="min-w-0">
                <span className="block text-[length:var(--fs-text)] font-medium text-bw-text">
                  PDF ohne Unterschrift erstellen
                </span>
              </span>
            </label>

            <div className="space-y-3">
              <p className="text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">
                Auftragnehmer (Handwerker)
              </p>
              <Input
                label="Name"
                value={meta.hw_unterschrift_name ?? meta.vertreter_an ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  patchMeta({
                    hw_unterschrift_name: v,
                    vertreter_an: v.trim() || meta.vertreter_an,
                  })
                }}
                placeholder="Vor- und Nachname"
                required={!meta.ohne_unterschrift}
              />
              <Input
                label="Ort, Datum"
                value={meta.unterschrift_ort_datum_an}
                onChange={(e) => patchMeta({ unterschrift_ort_datum_an: e.target.value })}
                placeholder={
                  defaultUnterschriftOrtDatum(meta.uebergabe_ort, abnahmeDatum) || 'Ort, Datum'
                }
              />
              <SignatureCanvas
                initialDataUrl={meta.signature_hw_url}
                onChange={(has, dataUrl) => {
                  patchMeta({ signature_hw_url: has ? dataUrl : null })
                }}
              />
            </div>

            <div className="space-y-3">
              <p className="text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">
                Auftraggeber (Kunde)
              </p>
              <Input
                label="Name"
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
                required={!meta.ohne_unterschrift}
              />
              <Input
                label="Ort, Datum"
                value={meta.unterschrift_ort_datum_ag}
                onChange={(e) => patchMeta({ unterschrift_ort_datum_ag: e.target.value })}
                placeholder={
                  defaultUnterschriftOrtDatum(meta.uebergabe_ort, abnahmeDatum) || 'Ort, Datum'
                }
              />
              <SignatureCanvas
                initialDataUrl={meta.signature_kunde_url}
                onChange={(has, dataUrl) => {
                  patchMeta({ signature_kunde_url: has ? dataUrl : null })
                }}
              />
            </div>

            <div className="space-y-3">
              <p className="text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">
                Anwesend (optional)
              </p>
              <Input
                label="Ort, Datum"
                value={meta.unterschrift_ort_datum_anwesend}
                onChange={(e) =>
                  patchMeta({ unterschrift_ort_datum_anwesend: e.target.value })
                }
                placeholder={
                  defaultUnterschriftOrtDatum(meta.uebergabe_ort, abnahmeDatum) || 'Ort, Datum'
                }
              />
            </div>

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
              Ort/Datum aus Übergabe setzen
            </Button>
          </div>
        </MobileEditableBlock>
      </FieldCard>
    </div>
  )

  const footerActions = (
    <div className="abnahme-canvas-footer">
      <div className="abnahme-canvas-footer__start">
        {activeSection !== 'checkliste' ? (
          <button
            type="button"
            className="btn abnahme-canvas-footer__nav"
            disabled={interactionBusy}
            onClick={() =>
              goSection(activeSection === 'pruefen' ? 'angaben' : 'checkliste')
            }
          >
            Zurück
          </button>
        ) : null}
        {canDiscardEntwurf && sessionProtokollId ? (
          <button
            type="button"
            className="btn abnahme-canvas-footer__nav abnahme-canvas-footer__discard"
            disabled={interactionBusy}
            onClick={() => void handleDiscard()}
          >
            <Trash2 className="h-4 w-4" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
            Verwerfen
          </button>
        ) : activeSection === 'checkliste' ? (
          <span className="abnahme-canvas-footer__spacer" aria-hidden />
        ) : null}
      </div>
      <div className="abnahme-canvas-footer__end">
        {activeSection !== 'pruefen' ? (
          <button
            type="button"
            className="btn primary abnahme-canvas-footer__primary"
            disabled={interactionBusy}
            onClick={() => goSection(activeSection === 'checkliste' ? 'angaben' : 'pruefen')}
          >
            Weiter
          </button>
        ) : (
          <button
            type="button"
            className="btn primary abnahme-canvas-footer__primary"
            disabled={interactionBusy || previewBusy}
            onClick={() => erstellen({ send: true })}
          >
            {sendBusy ? 'Wird gesendet…' : 'An Kunden senden'}
          </button>
        )}
      </div>
    </div>
  )

  const phasePruefen = (
    <div id="abnahme-sec-pruefen" className="document-canvas-sec space-y-5">
      <FieldCard title="Zusammenfassung">
        <dl className="space-y-2.5">
          <MobileOverviewField
            label="Übergabe"
            value={`${displayDeDatum(abnahmeDatum)}${meta.uebergabe_uhrzeit ? ` · ${meta.uebergabe_uhrzeit} Uhr` : ''} · ${meta.uebergabe_ort || '—'}`}
          />
          <MobileOverviewField label="Handwerker vor Ort" value={meta.vertreter_an || '—'} />
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
                ? `${maengelListe.length}${
                    meta.maengel_beseitigung_spaetestens.trim()
                      ? ` · ${displayDeDatum(meta.maengel_beseitigung_spaetestens)}`
                      : ''
                  }`
                : 'Keine'
            }
          />
          <MobileOverviewField
            label="Unterschriften"
            value={
              hasSignatur
                ? 'AN + AG signiert'
                : meta.signature_hw_url || meta.signature_kunde_url
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

  const headerEnd = (
    <>
      {activeSection === 'pruefen' ? (
        <button
          type="button"
          className="editor-sheet__icon-btn"
          disabled={interactionBusy || previewBusy}
          onClick={() => void vorschauPdf()}
          aria-label="PDF-Vorschau"
          title="PDF-Vorschau"
        >
          <Eye className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        className={cn('editor-sheet__confirm', interactionBusy && 'opacity-50')}
        disabled={interactionBusy}
        onClick={() => void handleSaveDraftOnly()}
        aria-label="Entwurf speichern"
        title="Entwurf speichern"
      >
        <Check className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
      </button>
    </>
  )

  return (
    <>
    <DocumentCanvas
      portal
      manageHistory={false}
      title="Abnahme"
      subtitle={subtitle || undefined}
      onClose={() => void handleClose()}
      headerEnd={headerEnd}
      draftDirty={draftDirty}
      saveBusy={interactionBusy}
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
          <span className="badge warten">
            {sessionProtokollId || isEdit ? 'Entwurf' : 'Offen'}
          </span>
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

        {pending || uploading || previewBusy || draftSaving || sendBusy ? (
          <p className="abnahme-canvas-busy">
            {sendBusy
              ? 'Abnahme wird an Kunden gesendet…'
              : draftSaving
                ? 'Entwurf wird gespeichert…'
                : pending
                  ? 'Erzeugt PDF…'
                  : previewBusy
                    ? 'Vorschau…'
                    : 'Lädt Fotos…'}
          </p>
        ) : null}

        <div className="abnahme-canvas-card__body">
          {activeSection === 'checkliste' ? phaseCheckliste : null}
          {activeSection === 'angaben' ? phaseAngaben : null}
          {activeSection === 'pruefen' ? phasePruefen : null}
        </div>
      </div>
    </DocumentCanvas>

    <ConfirmPopup
      open={closeConfirmOpen}
      onClose={() => setCloseConfirmOpen(false)}
      title="Entwurf speichern?"
      cancelLabel="Weiter bearbeiten"
      discardLabel="Verwerfen & schließen"
      saveDraftLabel="Erneut speichern"
      danger
      onConfirm={() => {
        void handleDiscard()
      }}
      onSaveDraft={() => {
        setCloseConfirmOpen(false)
        void handleClose()
      }}
    >
      Speichern ist fehlgeschlagen. Entwurf erneut speichern oder verwerfen (Fotos/Mängel gehen
      dann verloren).
    </ConfirmPopup>
    </>
  )
}
