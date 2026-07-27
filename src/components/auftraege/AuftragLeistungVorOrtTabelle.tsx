'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Camera, Plus } from 'lucide-react'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockModal } from '@/components/mock-ui/MockModal'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { WerkzeugPanel } from '@/components/crm/WerkzeugPanel'
import { VorOrtPortalHinweis } from '@/components/auftraege/AuftragVorOrtPanel'
import { HandwerkerAntwortChip } from '@/components/auftraege/leistungen-v3/HandwerkerAntwortChip'
import { toast } from '@/components/ui/app-toast'
import {
  addAuftragPosition,
  deleteAuftragPosition,
  updateAuftragPosition,
} from '@/app/(dashboard)/auftraege/actions'
import {
  createCrmPositionEintrag,
  listAuftragPositionEintraege,
} from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import {
  loadAbnahmeprotokollSummary,
  saveAbnahmeprotokollDraft,
  saveAbnahmeprotokollPdfOnly,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import {
  abnahmePunkteStatistik,
  buildAbnahmePunkteInitial,
  leistungFuerAbnahmeAusgewaehlt,
  maengelAusPunkten,
  punkteAusAuftragPositionen,
  type AbnahmePunkt,
  type AbnahmePunktStatus,
} from '@/lib/auftraege/abnahme-protokoll-types'
import {
  eintragTypLabel,
  lebenszyklusLabel,
  type PositionEintrag,
} from '@/lib/auftraege/position-lebenszyklus'
import { richTextToPlain } from '@/lib/rich-text'
import { heuteYmd } from '@/lib/angebot-einfach'
import { downloadPdfFromBase64 } from '@/lib/download-pdf-base64'
import type { AuftragPosition, Gewerk } from '@/lib/types'
import { cn, formatDatumZeit } from '@/lib/utils'

type GewerkOpt = Pick<Gewerk, 'id' | 'name' | 'slug'>

function syncAbnahmeMitAuftrag(
  existing: AbnahmePunkt[],
  positionen: AuftragPosition[],
  gewerke: GewerkOpt[]
): AbnahmePunkt[] {
  if (!positionen.length) return []
  const fresh = punkteAusAuftragPositionen(positionen, gewerke)
  const statusByKey = new Map<string, AbnahmePunktStatus>()
  for (const p of existing) {
    const lid = p.leistung_id?.trim() || p.id
    const prev = statusByKey.get(lid)
    if (!prev || p.status === 'mangel' || (p.status === 'ok' && prev === 'offen')) {
      statusByKey.set(lid, p.status)
    }
  }
  return fresh.map((p) => {
    const lid = p.leistung_id?.trim() || p.id
    const st = statusByKey.get(lid)
    return st ? { ...p, status: st } : p
  })
}

function abnahmeLabelForLeistung(punkte: AbnahmePunkt[]): { label: string; kind: string } {
  if (!punkte.length) return { label: '—', kind: 'fertig' }
  if (punkte.some((p) => p.status === 'mangel')) return { label: 'Mangel', kind: 'cancel' }
  if (leistungFuerAbnahmeAusgewaehlt(punkte)) return { label: 'OK', kind: 'aktiv' }
  return { label: 'Offen', kind: 'warten' }
}

async function uploadTimelineFoto(auftragId: string, file: File): Promise<string | null> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('filename', file.name)
  const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
    method: 'POST',
    body: fd,
  })
  const json = (await res.json()) as { url?: string; error?: string }
  if (!res.ok || !json.url) {
    toast.error(json.error || 'Upload fehlgeschlagen')
    return null
  }
  return json.url
}

/**
 * Vor-Ort: gleiche Leistungstabelle wie bei Leistungen.
 * Klick → Bottom-Sheet (wegklickbar) mit Tagebuch + Fotos + Abnahme.
 * Freie Einträge / Projekt-Fotos ohne Positionsbezug.
 */
export function AuftragLeistungVorOrtTabelle({
  auftragId,
  positionen,
  gewerke = [],
  kundeName,
  onChanged,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  gewerke?: GewerkOpt[]
  kundeName: string
  onChanged?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [eintraege, setEintraege] = useState<PositionEintrag[]>([])
  const [punkte, setPunkte] = useState<AbnahmePunkt[]>([])
  const [abnahmeDatum, setAbnahmeDatum] = useState(heuteYmd())
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sheetPos, setSheetPos] = useState<AuftragPosition | null>(null)
  const [freeOpen, setFreeOpen] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [draftFotos, setDraftFotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [leistungForm, setLeistungForm] = useState<{
    mode: 'create' | 'edit'
    id?: string
    name: string
    beschreibung: string
    gewerkSlug: string
  } | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [list, saved] = await Promise.all([
        listAuftragPositionEintraege(auftragId),
        loadAbnahmeprotokollSummary(auftragId),
      ])
      setEintraege(list)
      if (saved?.punkte.length) {
        setPunkte(syncAbnahmeMitAuftrag(saved.punkte, positionen, gewerke))
        setAbnahmeDatum(saved.abnahme_datum?.slice(0, 10) || heuteYmd())
        setPdfUrl(saved.pdf_url)
      } else {
        setPunkte(buildAbnahmePunkteInitial({ positionen, gewerke }))
        setAbnahmeDatum(heuteYmd())
        setPdfUrl(null)
      }
    } finally {
      setLoading(false)
    }
  }, [auftragId, positionen, gewerke])

  useEffect(() => {
    void reload()
  }, [reload])

  const byPos = useMemo(() => {
    const m = new Map<string, PositionEintrag[]>()
    for (const e of eintraege) {
      if (!e.position_id) continue
      const arr = m.get(e.position_id) ?? []
      arr.push(e)
      m.set(e.position_id, arr)
    }
    return m
  }, [eintraege])

  const freieEintraege = useMemo(
    () => eintraege.filter((e) => !e.position_id),
    [eintraege]
  )

  const punkteByLeistung = useMemo(() => {
    const m = new Map<string, AbnahmePunkt[]>()
    for (const p of punkte) {
      const lid = p.leistung_id?.trim() || p.id
      const arr = m.get(lid) ?? []
      arr.push(p)
      m.set(lid, arr)
    }
    return m
  }, [punkte])

  const sorted = useMemo(
    () =>
      [...positionen].sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.leistung_name.localeCompare(b.leistung_name)
      ),
    [positionen]
  )

  const statistik = useMemo(() => abnahmePunkteStatistik(punkte), [punkte])
  const dokuCount = eintraege.length

  function resetDraft() {
    setDraftText('')
    setDraftFotos([])
  }

  function openLeistungSheet(pos: AuftragPosition) {
    resetDraft()
    setFreeOpen(false)
    setSheetPos(pos)
  }

  function openFreeSheet() {
    resetDraft()
    setSheetPos(null)
    setFreeOpen(true)
  }

  function closeSheet() {
    setSheetPos(null)
    setFreeOpen(false)
    resetDraft()
  }

  function setAbnahmeStatus(leistungId: string, status: AbnahmePunktStatus) {
    const next = punkte.map((p) => {
      const key = p.leistung_id?.trim() || p.id
      if (key !== leistungId) return p
      return { ...p, status }
    })
    setPunkte(next)
    startTransition(async () => {
      const r = await saveAbnahmeprotokollDraft({
        auftragId,
        abnahmeDatum: abnahmeDatum || heuteYmd(),
        punkte: next,
        maengel: maengelAusPunkten(next),
        notizen: kundeName.trim() ? `Abnehmender: ${kundeName.trim()}` : null,
      })
      if (!r.ok) {
        toast.error(r.message)
        void reload()
        return
      }
      onChanged?.()
    })
  }

  function persistAbnahmePdf() {
    startTransition(async () => {
      const payload = {
        auftragId,
        abnahmeDatum: abnahmeDatum || heuteYmd(),
        punkte,
        maengel: maengelAusPunkten(punkte),
        notizen: kundeName.trim() ? `Abnehmender: ${kundeName.trim()}` : null,
      }
      const existing = await loadAbnahmeprotokollSummary(auftragId)
      if (existing) {
        const r = await saveAbnahmeprotokollDraft({ ...payload, regeneratePdf: true })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        const again = await loadAbnahmeprotokollSummary(auftragId)
        setPdfUrl(again?.pdf_url ?? null)
        if (again?.pdf_url) window.open(again.pdf_url, '_blank', 'noopener,noreferrer')
      } else {
        const r = await saveAbnahmeprotokollPdfOnly(payload)
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        setPdfUrl(r.publicUrl)
        downloadPdfFromBase64(r.pdfBase64, r.filename)
      }
      toast.success('Abnahme-PDF erstellt')
      onChanged?.()
    })
  }

  function saveLeistung() {
    if (!leistungForm) return
    const name = leistungForm.name.trim()
    if (!name) {
      toast.error('Leistungsname fehlt.')
      return
    }
    const gewerk =
      gewerke.find((g) => g.slug === leistungForm.gewerkSlug) ?? gewerke[0] ?? null
    if (leistungForm.mode === 'create' && !gewerk) {
      toast.error('Bitte ein Gewerk wählen.')
      return
    }
    startTransition(async () => {
      if (leistungForm.mode === 'create' && gewerk) {
        const r = await addAuftragPosition(auftragId, {
          gewerk_slug: gewerk.slug,
          gewerk_name: gewerk.name,
          leistung_name: name,
          beschreibung: leistungForm.beschreibung.trim() || null,
        })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        toast.success('Leistung hinzugefügt')
      } else if (leistungForm.mode === 'edit' && leistungForm.id) {
        const r = await updateAuftragPosition(leistungForm.id, auftragId, {
          leistung_name: name,
          beschreibung: leistungForm.beschreibung.trim() || null,
          ...(leistungForm.gewerkSlug
            ? {
                gewerk_slug: leistungForm.gewerkSlug,
                gewerk_name:
                  gewerke.find((g) => g.slug === leistungForm.gewerkSlug)?.name ?? undefined,
              }
            : {}),
        })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        toast.success('Leistung gespeichert')
      }
      setLeistungForm(null)
      onChanged?.()
    })
  }

  function removeLeistung(pos: AuftragPosition) {
    if (
      !window.confirm(
        `Leistung „${pos.leistung_name}“ wirklich entfernen? Tagebuch-Einträge zu dieser Leistung entfallen.`
      )
    ) {
      return
    }
    startTransition(async () => {
      const r = await deleteAuftragPosition(pos.id, auftragId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      const nextPunkte = punkte.filter((p) => (p.leistung_id?.trim() || p.id) !== pos.id)
      setPunkte(nextPunkte)
      await saveAbnahmeprotokollDraft({
        auftragId,
        abnahmeDatum: abnahmeDatum || heuteYmd(),
        punkte: nextPunkte,
        maengel: maengelAusPunkten(nextPunkte),
        notizen: null,
      })
      toast.success('Leistung entfernt')
      closeSheet()
      onChanged?.()
    })
  }

  async function onPickFotos(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files).slice(0, 8 - draftFotos.length)) {
        const url = await uploadTimelineFoto(auftragId, file)
        if (url) urls.push(url)
      }
      if (urls.length) setDraftFotos((prev) => [...prev, ...urls])
    } finally {
      setUploading(false)
    }
  }

  function saveEintrag(opts: { positionId?: string | null }) {
    const text = draftText.trim()
    if (!text && draftFotos.length === 0) {
      toast.error('Text oder Foto fehlt.')
      return
    }
    startTransition(async () => {
      const fotoPath = draftFotos[0] ?? null
      const r = await createCrmPositionEintrag({
        positionId: opts.positionId ?? null,
        auftragId,
        typ: opts.positionId ? 'fortschritt' : 'notiz',
        beschreibung: text || (fotoPath ? 'Foto-Dokumentation' : null),
        fotoStoragePath: fotoPath,
        fotoCaptureAt: new Date().toISOString(),
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      // Weitere Fotos: je ein eigener Notiz-Eintrag (einfacher Contract)
      for (const extra of draftFotos.slice(1)) {
        await createCrmPositionEintrag({
          positionId: opts.positionId ?? null,
          auftragId,
          typ: 'notiz',
          beschreibung: 'Foto',
          fotoStoragePath: extra,
          fotoCaptureAt: new Date().toISOString(),
        })
      }
      toast.success('Eintrag gespeichert')
      resetDraft()
      const list = await listAuftragPositionEintraege(auftragId)
      setEintraege(list)
      onChanged?.()
    })
  }

  const sheetEntries = sheetPos ? byPos.get(sheetPos.id) ?? [] : freieEintraege
  const sheetAbn = sheetPos ? punkteByLeistung.get(sheetPos.id) ?? [] : []
  const sheetAbnUi = abnahmeLabelForLeistung(sheetAbn)

  function renderEintraegeList(rows: PositionEintrag[]) {
    if (!rows.length) {
      return <p className="text-sm text-bw-text-muted py-2">Noch keine Einträge.</p>
    }
    return (
      <ul className="vor-ort-sheet__eintraege">
        {rows.map((e) => (
          <li key={e.id}>
            <div className="vor-ort-sheet__eintrag-meta">
              <strong>{eintragTypLabel(e.typ)}</strong>
              <span>
                {e.ereignis_zeit || e.created_at
                  ? formatDatumZeit(String(e.ereignis_zeit || e.created_at))
                  : '—'}
                {' · '}
                {e.erfasst_von === 'crm_intern' ? 'CRM' : 'Partner'}
              </span>
            </div>
            {e.beschreibung ? (
              <p className="whitespace-pre-wrap">{richTextToPlain(e.beschreibung)}</p>
            ) : null}
            {e.eintrag_fotos?.length ? (
              <div className="vor-ort-sheet__fotos">
                {e.eintrag_fotos.map((f) => (
                  <a
                    key={f.id}
                    href={f.display_url || f.storage_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vor-ort-sheet__foto"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.display_url || f.storage_path} alt="" />
                  </a>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    )
  }

  function renderCompose(opts: { positionId?: string | null; title: string }) {
    return (
      <div className="vor-ort-sheet__compose">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted mb-2">
          {opts.title}
        </p>
        <label className="field full">
          <span className="field-label">Was ist passiert?</span>
          <textarea
            className="txt"
            rows={3}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Kurzbeschreibung — wie im Partner-Portal"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void onPickFotos(e.target.files)
              e.target.value = ''
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending || uploading || draftFotos.length >= 8}
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="mr-1.5 h-4 w-4" aria-hidden />
            {uploading ? 'Lädt…' : 'Foto hinzufügen'}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={pending || uploading}
            onClick={() => saveEintrag({ positionId: opts.positionId })}
          >
            Speichern
          </Button>
        </div>
        {draftFotos.length > 0 ? (
          <div className="vor-ort-sheet__fotos mt-3">
            {draftFotos.map((url) => (
              <button
                key={url}
                type="button"
                className="vor-ort-sheet__foto"
                title="Entfernen"
                onClick={() => setDraftFotos((prev) => prev.filter((u) => u !== url))}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <WerkzeugPanel
      title="Bautagebuch"
      icon="list-details"
      purpose="Gleiche Leistungstabelle wie bei Leistungen — Tippen öffnet das Tagebuch mit Fotos je Leistung. Freie Einträge und Projekt-Fotos ohne Positionsbezug."
      framed
      actions={
        <div className="werkzeug-panel__actions">
          <MockBtn
            sm
            kind="ghost"
            icon="plus"
            disabled={pending}
            onClick={() =>
              setLeistungForm({
                mode: 'create',
                name: '',
                beschreibung: '',
                gewerkSlug: gewerke[0]?.slug ?? '',
              })
            }
          >
            Leistung
          </MockBtn>
        </div>
      }
    >
      <VorOrtPortalHinweis />

      <div className="vor-ort-table__summary">
        <span>
          {sorted.length} Leistung{sorted.length === 1 ? '' : 'en'}
        </span>
        <span className="sep">·</span>
        <span>{dokuCount} Tagebuch-Einträge</span>
        <span className="sep">·</span>
        <span>
          Abnahme {statistik.ok} OK / {statistik.mangel} Mangel / {statistik.offen} offen
        </span>
        {pdfUrl ? (
          <>
            <span className="sep">·</span>
            <a className="link" href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Abnahme-PDF
            </a>
          </>
        ) : null}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button type="button" variant="primary" size="sm" onClick={openFreeSheet} disabled={pending}>
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
          Freier Eintrag
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={openFreeSheet}
          disabled={pending}
        >
          <Camera className="mr-1 h-3.5 w-3.5" aria-hidden />
          Projekt-Fotos
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-bw-text-muted py-3">Lädt Leistungen…</p>
      ) : sorted.length === 0 ? (
        <MockEmpty
          icon="list-details"
          title="Noch keine Leistungen"
          hint="Leistung hinzufügen — oder Freier Eintrag / Projekt-Fotos ohne Positionsbezug."
        />
      ) : (
        <div className="pos-v3">
          <div className="postable2">
            {sorted.map((pos) => {
              const rows = byPos.get(pos.id) ?? []
              const abn = punkteByLeistung.get(pos.id) ?? []
              const abnUi = abnahmeLabelForLeistung(abn)
              const desc = richTextToPlain(pos.beschreibung)
              return (
                <div
                  key={pos.id}
                  className="pt2-row pt2-row--tap"
                  role="button"
                  tabIndex={0}
                  onClick={() => openLeistungSheet(pos)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openLeistungSheet(pos)
                    }
                  }}
                >
                  <div className="pt2-main" style={{ gridColumn: '1 / -1' }}>
                    <div className="pt2-status-row">
                      <HandwerkerAntwortChip pos={pos} />
                      <MockBadge kind={abnUi.kind}>{abnUi.label}</MockBadge>
                      <MockBadge kind={pos.leistung_status === 'erledigt' ? 'done' : 'order'}>
                        {lebenszyklusLabel(pos.leistung_status)}
                      </MockBadge>
                    </div>
                    <span className="pt-name">{pos.leistung_name}</span>
                    {desc ? <div className="pt-desc pt-desc--clamp2">{desc}</div> : null}
                    <div className="pt2-meta">
                      <span className="pt2-menge">
                        {pos.gewerk_name || '—'}
                        {' · '}
                        {rows.length === 0
                          ? 'Keine Einträge'
                          : `${rows.length} Eintrag${rows.length === 1 ? '' : 'e'}`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {freieEintraege.length > 0 ? (
        <section className="mt-5">
          <div className="section-h mb-2 flex items-baseline justify-between">
            <span>Freie Einträge / Projekt</span>
            <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 12.5 }}>
              {freieEintraege.length}
            </span>
          </div>
          {renderEintraegeList(freieEintraege)}
        </section>
      ) : null}

      {/* Leistung: Tagebuch-Sheet */}
      <Modal
        open={Boolean(sheetPos)}
        onClose={closeSheet}
        title={sheetPos?.leistung_name ?? 'Leistung'}
        subtitle={sheetPos ? `${sheetPos.gewerk_name || '—'} · Abnahme ${sheetAbnUi.label}` : undefined}
        size="lg"
        footer={
          sheetPos ? (
            <div className="flex w-full flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" onClick={closeSheet}>
                Schließen
              </Button>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    const pos = sheetPos
                    setLeistungForm({
                      mode: 'edit',
                      id: pos.id,
                      name: pos.leistung_name,
                      beschreibung: pos.beschreibung ?? '',
                      gewerkSlug: pos.gewerk_slug ?? gewerke[0]?.slug ?? '',
                    })
                  }}
                >
                  Bearbeiten
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={pending}
                  onClick={() => removeLeistung(sheetPos)}
                >
                  Entfernen
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {sheetPos ? (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted mb-2">
                Abnahme
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Abnahme">
                {(
                  [
                    ['offen', 'Offen'],
                    ['ok', 'OK'],
                    ['mangel', 'Mangel'],
                  ] as const
                ).map(([st, label]) => {
                  const current =
                    sheetAbn.find((p) => (p.leistung_id?.trim() || p.id) === sheetPos.id)?.status ??
                    'offen'
                  const active = current === st
                  return (
                    <button
                      key={st}
                      type="button"
                      className={cn('btn sm', active ? 'primary' : 'ghost')}
                      disabled={pending}
                      onClick={() => setAbnahmeStatus(sheetPos.id, st)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted mb-2">
                Tagebuch
              </p>
              {renderEintraegeList(sheetEntries)}
            </div>

            {renderCompose({ positionId: sheetPos.id, title: 'Neuer Eintrag' })}
          </div>
        ) : null}
      </Modal>

      {/* Freier Eintrag / Projekt-Fotos */}
      <Modal
        open={freeOpen}
        onClose={closeSheet}
        title="Freier Eintrag"
        subtitle="Ohne Leistungsbezug — Projekt-Fotos & Notizen"
        size="lg"
        footer={
          <Button type="button" variant="ghost" onClick={closeSheet}>
            Schließen
          </Button>
        }
      >
        <div className="space-y-4">
          {renderEintraegeList(freieEintraege)}
          {renderCompose({ positionId: null, title: 'Neuer freier Eintrag / Foto' })}
        </div>
      </Modal>

      <MockModal
        open={Boolean(leistungForm)}
        onClose={() => setLeistungForm(null)}
        icon="list-details"
        title={leistungForm?.mode === 'edit' ? 'Leistung bearbeiten' : 'Leistung hinzufügen'}
        sub="Abweichung vom Angebot ist erlaubt — gilt für Tagebuch und Abnahme."
        footer={
          <>
            <MockBtn kind="ghost" onClick={() => setLeistungForm(null)} disabled={pending}>
              Abbrechen
            </MockBtn>
            <MockBtn kind="primary" onClick={saveLeistung} disabled={pending}>
              Speichern
            </MockBtn>
          </>
        }
      >
        {leistungForm ? (
          <div className="space-y-3">
            <label className="field full">
              <span className="field-label">Name</span>
              <input
                className="txt"
                value={leistungForm.name}
                onChange={(e) => setLeistungForm({ ...leistungForm, name: e.target.value })}
                autoFocus
              />
            </label>
            <label className="field full">
              <span className="field-label">Beschreibung</span>
              <textarea
                className="txt"
                rows={3}
                value={leistungForm.beschreibung}
                onChange={(e) =>
                  setLeistungForm({ ...leistungForm, beschreibung: e.target.value })
                }
              />
            </label>
            {gewerke.length > 0 ? (
              <label className="field full">
                <span className="field-label">Gewerk</span>
                <select
                  className="sel"
                  value={leistungForm.gewerkSlug}
                  onChange={(e) =>
                    setLeistungForm({ ...leistungForm, gewerkSlug: e.target.value })
                  }
                >
                  {gewerke.map((g) => (
                    <option key={g.id} value={g.slug}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}
      </MockModal>
    </WerkzeugPanel>
  )
}
