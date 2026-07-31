'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createAuftragDokumentEintrag,
  deleteAuftragDokumentEintrag,
  signHandwerkerDokumentStoragePaths,
  updateAuftragDokumentMeta,
} from '@/app/(dashboard)/auftraege/dokumente-actions'
import { setTimelineKundenfreigabe } from '@/app/(dashboard)/auftraege/kunden-status-actions'
import { MockChip } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet, useEditorSheetRequestClose } from '@/components/surfaces/EditorSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DokMobileCard } from '@/components/ui/DokMobileCard'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  abschlussdokumentZeile,
  angebotAusAuftragDetail,
  angebotDokumentZeile,
  angebotHandwerkerAusAuftragDetail,
  dokumentTypLabel,
  handwerkerDokumentZeilen,
  rechnungDokumentZeilen,
  sortDokumentZeilen,
  timelineDokumentZeilen,
  vertragDokumentZeilen,
  type AuftragDokumentZeile,
  type DokumentSortKey,
} from '@/lib/auftraege/auftrag-dokumente-helpers'
import type { RechnungAuswahlZeile } from '@/lib/rechnungen/rechnung-wizard-types'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'
import type { AuftragDetail, AuftragTimelineEvent } from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'

export type { AuftragDokumentZeile }
export { zaehleAuftragDokumente } from '@/lib/auftraege/auftrag-dokumente-helpers'

function freigabeLabel(row: AuftragDokumentZeile): string {
  if (row.fuerKunde) return 'Kunde'
  if (row.quelle === 'vertrag' || row.quelle === 'handwerker') return 'Partner'
  return 'intern'
}

export function AuftragDokumenteTab({
  detail,
  rechnungen = [],
  vertraege = [],
  onChanged,
}: {
  detail: AuftragDetail
  rechnungen?: RechnungAuswahlZeile[]
  vertraege?: HandwerkerVertragRow[]
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [editRow, setEditRow] = useState<AuftragDokumentZeile | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [hwSignedUrls, setHwSignedUrls] = useState<Record<string, string>>({})
  const [sortKey, setSortKey] = useState<DokumentSortKey>('datum')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const fileRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  const handwerkerZeilen = useMemo(
    () => handwerkerDokumentZeilen(angebotHandwerkerAusAuftragDetail(detail)),
    [detail]
  )

  useEffect(() => {
    const paths = handwerkerZeilen.map((z) => z.storagePath).filter(Boolean) as string[]
    if (!paths.length) {
      setHwSignedUrls({})
      return
    }
    let cancelled = false
    void signHandwerkerDokumentStoragePaths(paths).then((res) => {
      if (cancelled) return
      if (res.ok) setHwSignedUrls(res.urls)
    })
    return () => {
      cancelled = true
    }
  }, [handwerkerZeilen])

  const zeilenRaw = useMemo(() => {
    const rows = [
      ...timelineDokumentZeilen(detail),
      ...rechnungDokumentZeilen(rechnungen),
      ...vertragDokumentZeilen(vertraege),
      ...handwerkerZeilen,
    ]
    const ang = angebotAusAuftragDetail(detail)
    const angebotZeile = ang ? angebotDokumentZeile(detail, ang) : null
    if (angebotZeile) rows.unshift(angebotZeile)
    if (detail.abnahme_protokoll_url) {
      rows.push({
        id: 'abnahme-pdf',
        name: 'Abnahmeprotokoll',
        beschreibung: 'Abnahme',
        datum: detail.updated_at ?? detail.created_at,
        fuerKunde: true,
        href: detail.abnahme_protokoll_url,
        quelle: 'protokoll',
      })
    }
    const abschluss = abschlussdokumentZeile(detail)
    if (abschluss) rows.push(abschluss)
    return rows
  }, [detail, rechnungen, vertraege, handwerkerZeilen])

  const zeilen = useMemo(
    () => sortDokumentZeilen(zeilenRaw, sortKey, sortDir),
    [zeilenRaw, sortKey, sortDir]
  )

  function toggleSort(key: DokumentSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'name' || key === 'typ' ? 'asc' : 'desc')
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 5)
    if (!list.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of list) {
        const fd = new FormData()
        fd.set('file', file)
        fd.set('filename', file.name)
        const res = await fetch(`/api/auftraege/${detail.id}/timeline-foto/upload`, {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
        urls.push(json.url)
      }
      const name = list.length === 1 ? list[0]!.name : `${list.length} Dateien`
      startTransition(async () => {
        const r = await createAuftragDokumentEintrag({
          auftragId: detail.id,
          titel: name,
          beschreibung: null,
          foto_urls: urls,
          fuerKunde: false,
        })
        if (!r.ok) toast.error(r.message)
        else {
          toast.success('Dokument hochgeladen')
          onChanged()
        }
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  function toggleFreigabe(ev: AuftragTimelineEvent, fuerKunde: boolean) {
    startTransition(async () => {
      const r = await setTimelineKundenfreigabe({
        auftragId: detail.id,
        timelineId: ev.id,
        fuerKunde,
        kundeBenachrichtigen: false,
      })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  function saveEdit() {
    if (!editRow?.timelineId) return
    startTransition(async () => {
      const r = await updateAuftragDokumentMeta({
        auftragId: detail.id,
        timelineId: editRow.timelineId!,
        titel: editName,
        beschreibung: editDesc,
      })
      if (!r.ok) toast.error(r.message)
      else {
        setEditRow(null)
        onChanged()
      }
    })
  }

  function removeRow(row: AuftragDokumentZeile) {
    if (!row.timelineId || !confirm(`„${row.name}" wirklich löschen?`)) return
    startTransition(async () => {
      const r = await deleteAuftragDokumentEintrag({
        auftragId: detail.id,
        timelineId: row.timelineId!,
      })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  const timelineById = useMemo(() => {
    const m = new Map<string, AuftragTimelineEvent>()
    for (const ev of detail.auftrag_timeline ?? []) {
      if (ev?.id) m.set(ev.id, ev)
    }
    return m
  }, [detail.auftrag_timeline])

  const busy = uploading || pending

  function rowHref(row: AuftragDokumentZeile): string | null | undefined {
    if (row.storagePath && hwSignedUrls[row.storagePath]) return hwSignedUrls[row.storagePath]
    return row.href
  }

  function rowPdfReady(row: AuftragDokumentZeile): boolean {
    return !row.storagePath || Boolean(hwSignedUrls[row.storagePath])
  }

  function openEdit(row: AuftragDokumentZeile) {
    setEditRow(row)
    setEditName(row.name)
    setEditDesc(row.beschreibung === '—' ? '' : row.beschreibung)
  }

  function renderFreigabe(row: AuftragDokumentZeile) {
    const ev = row.timelineId ? timelineById.get(row.timelineId) : null
    const readOnly = row.quelle !== 'timeline' || !row.timelineId
    if (readOnly) {
      return (
        <span
          className={cn(
            'dok-card__tag',
            row.fuerKunde ? 'dok-card__tag--kunde' : 'dok-card__tag--muted',
            row.fuerKunde && 'is-kunde'
          )}
        >
          {freigabeLabel(row)}
        </span>
      )
    }
    return (
      <button
        type="button"
        className={cn(
          'dok-freigabe-pill',
          row.fuerKunde ? 'dok-freigabe-kunde' : 'dok-freigabe-intern',
          row.fuerKunde && 'is-kunde'
        )}
        onClick={(e) => {
          e.stopPropagation()
          if (ev) toggleFreigabe(ev, !row.fuerKunde)
        }}
        disabled={pending}
      >
        {freigabeLabel(row)}
      </button>
    )
  }

  function renderActions(row: AuftragDokumentZeile) {
    const href = rowHref(row)
    const ready = rowPdfReady(row)
    const canEdit = row.quelle === 'timeline' && Boolean(row.timelineId)
    return (
      <div className="dok-list__actions inline-flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
        {ready && href ? (
          <button
            type="button"
            className="icon-btn"
            title="Ansehen"
            onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
          >
            <MockIcon ctx="row" n="eye" size={15} />
          </button>
        ) : null}
        {canEdit ? (
          <>
            <button
              type="button"
              className="icon-btn dok-list__action--extra"
              title="Bearbeiten"
              onClick={() => openEdit(row)}
            >
              <MockIcon ctx="row" n="pencil" size={15} />
            </button>
            <button
              type="button"
              className="icon-btn text-status-cancel-text dok-list__action--extra"
              title="Löschen"
              onClick={() => removeRow(row)}
            >
              <MockIcon ctx="row" n="trash" size={15} />
            </button>
          </>
        ) : null}
      </div>
    )
  }

  function renderNameLink(row: AuftragDokumentZeile, className?: string) {
    const href = rowHref(row)
    const ready = rowPdfReady(row)
    if (ready && href) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(className, 'hover:text-bw-link')}
          onClick={(e) => e.stopPropagation()}
        >
          {row.name}
        </a>
      )
    }
    return <span className={className}>{row.name}</span>
  }

  function renderDeskRow(row: AuftragDokumentZeile) {
    const href = rowHref(row)
    const ready = rowPdfReady(row)
    const openable = Boolean(ready && href)
    const meta = [
      dokumentTypLabel(row.quelle),
      row.datum ? formatDatum(row.datum) : null,
      row.beschreibung && row.beschreibung !== '—' ? row.beschreibung : null,
    ]
      .filter(Boolean)
      .join(' · ')
    return (
      <div
        key={row.id}
        className={cn('list-row', openable && 'dok-list__row--openable')}
        style={{ cursor: openable ? 'pointer' : 'default' }}
        role={openable ? 'button' : undefined}
        tabIndex={openable ? 0 : undefined}
        onClick={() => {
          if (openable && href) window.open(href, '_blank', 'noopener,noreferrer')
        }}
        onKeyDown={(e) => {
          if (!openable || !href) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            window.open(href, '_blank', 'noopener,noreferrer')
          }
        }}
      >
        <div className="dok-list__main min-w-0">
          <div className="dok-list__name">
            {renderNameLink(row)}
            {meta ? <span className="dok-list__name-size"> · {meta}</span> : null}
          </div>
        </div>
        <div className="dok-list__freigabe" onClick={(e) => e.stopPropagation()}>
          {renderFreigabe(row)}
        </div>
        {renderActions(row)}
      </div>
    )
  }

  function renderMobileCard(row: AuftragDokumentZeile) {
    const href = rowHref(row)
    const ready = rowPdfReady(row)
    const openable = Boolean(ready && href)
    const meta = [
      dokumentTypLabel(row.quelle),
      row.datum ? formatDatum(row.datum) : null,
      row.beschreibung && row.beschreibung !== '—' ? row.beschreibung : null,
    ]
      .filter(Boolean)
      .join(' · ')
    const freigabeLabelText = freigabeLabel(row)
    return (
      <DokMobileCard
        key={row.id}
        title={row.name}
        meta={meta}
        onClick={
          openable && href
            ? () => window.open(href, '_blank', 'noopener,noreferrer')
            : undefined
        }
        className={!openable ? 'dok-card--static' : undefined}
        badge={
          <span className={cn('dok-card__tag', row.fuerKunde && 'is-kunde')}>
            {freigabeLabelText}
          </span>
        }
      />
    )
  }

  return (
    <div className="auftrag-dok-panel pb-4">
      <Card
        className="dshell-framed"
        collapsible={false}
        title={`Dokumente · ${zeilen.length}`}
        action={
          isMobile ? undefined : (
            <button
              type="button"
              className="btn primary sm inline-flex gap-1.5"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <MockIcon ctx="btn" n="upload" size={15} />
              Datei hochladen
            </button>
          )
        }
      >
        {!isMobile ? (
          <p className="mb-3 text-[length:var(--fs-meta)] text-bw-text-muted">
            Projekt-Dokumente (Angebot, Rechnungen, Uploads). Partner-Compliance findest du im Tab{' '}
            <span className="font-medium text-bw-text">Compliance</span>.
          </p>
        ) : null}

        {!isMobile ? (
          <>
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              multiple
              onChange={(e) => {
                if (e.target.files?.length) void uploadFiles(e.target.files)
                e.target.value = ''
              }}
            />

            <div
              className={cn(
                'dok-upload-zone',
                dragOver && 'dok-upload-zone-active',
                busy && 'pointer-events-none opacity-60'
              )}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files)
              }}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
              }}
            >
              <MockIcon ctx="btn" n="cloud-upload" size={18} />
              {uploading ? 'Wird hochgeladen…' : 'Dateien hier ablegen oder klicken'}
            </div>
          </>
        ) : null}

        {zeilen.length > 0 ? (
          <div className="dok-sort" role="toolbar" aria-label="Sortierung">
            <span className="dok-sort__label">Sortieren</span>
            {(
              [
                { key: 'datum', label: 'Datum' },
                { key: 'name', label: 'Name' },
                { key: 'typ', label: 'Typ' },
              ] as const
            ).map(({ key, label }) => (
              <MockChip key={key} active={sortKey === key} onClick={() => toggleSort(key)}>
                {label}
                {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
              </MockChip>
            ))}
          </div>
        ) : null}

        {zeilen.length === 0 ? (
          <p className="py-6 text-center text-[length:var(--fs-text)] text-bw-text-muted">
            {isMobile
              ? 'Noch keine Dokumente. Über „Dokument“ oben hochladen.'
              : 'Noch keine Dokumente.'}
          </p>
        ) : isMobile ? (
          <div className="dok-cards">{zeilen.map(renderMobileCard)}</div>
        ) : (
          <div className="dok-list">{zeilen.map(renderDeskRow)}</div>
        )}
      </Card>

      <EditorSheet
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title="Dokument bearbeiten"
        crumb="Dokumente >"
        context="detail"
        dirty
        size="md"
        footer={<DokumentEditFooter pending={pending} onSave={saveEdit} />}
      >
        <div className="space-y-3">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Textarea
            label="Beschreibung"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={3}
          />
        </div>
      </EditorSheet>
    </div>
  )
}

function DokumentEditFooter({ pending, onSave }: { pending: boolean; onSave: () => void }) {
  const requestClose = useEditorSheetRequestClose()
  return (
    <div className="sheet-footer-actions ldr-cta">
      <Button type="button" variant="secondary" onClick={() => requestClose?.()} disabled={pending}>
        Abbrechen
      </Button>
      <Button type="button" variant="primary" loading={pending} onClick={onSave}>
        Speichern
      </Button>
    </div>
  )
}
