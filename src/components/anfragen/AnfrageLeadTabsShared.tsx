'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockField } from '@/components/mock-ui/MockForm'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useTransition } from '@/components/ui/action-busy'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Note } from '@/components/ui/note'
import { RichTextContent } from '@/components/ui/RichTextContent'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { addLeadNotizRow, deleteLeadNotizRow } from '@/app/(dashboard)/anfragen/actions'
import { leadNotizFotoUrls } from '@/lib/anfragen/lead-notiz-fotos'
import { toast } from '@/components/ui/app-toast'
import type { LeadNotizRow } from '@/lib/types'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { formatAngebotEurKurzBrutto } from '@/lib/vorgang/projekt-kontext-labels'
import { richTextToPlain } from '@/lib/rich-text'
import { formatDatum, formatDatumZeit, formatRelativeDate } from '@/lib/utils'
import { deleteWithUndo } from '@/lib/ui/delete-with-undo'
import { TOAST } from '@/lib/copy'

function leadNotizErstellerLabel(n: LeadNotizRow): string {
  const name = n.user_profiles?.name?.trim()
  if (name) return name
  if (n.erstellt_von) return 'Nutzer:in'
  return 'System'
}

function istBildAnhangUrl(url: string): boolean {
  const u = url.split('?')[0].toLowerCase()
  if (u.includes('/lead-notizen-fotos/')) return true
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(u)
}

function LeadNotizFotoLightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  if (!url) return null
  return (
    <EditorSheet open onClose={onClose} title="Foto" size="lg">
      <div className="flex max-h-[min(85vh,800px)] items-center justify-center overflow-auto p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Notiz-Foto" className="max-h-full max-w-full object-contain" />
      </div>
    </EditorSheet>
  )
}

function LeadNotizFotoToolbar({
  pending,
  canSave,
  onGalleryClick,
  onCameraClick,
  onSave,
  galleryLabel = 'Foto auswählen',
  cameraLabel = 'Aufnehmen',
  saveLabel = 'Speichern',
}: {
  pending: boolean
  canSave: boolean
  onGalleryClick: () => void
  onCameraClick: () => void
  onSave: () => void
  galleryLabel?: string
  cameraLabel?: string
  saveLabel?: string
}) {
  return (
    <div className="lead-notiz-compose__actions">
      <div className="lead-notiz-compose__media">
        <MockBtn kind="ghost" sm className="inline-flex items-center justify-center gap-1.5" type="button" disabled={pending} onClick={onGalleryClick}>
          <MockIcon n="photo-plus" ctx="default" className="h-4 w-4 shrink-0" aria-hidden />
          {galleryLabel}
        </MockBtn>
        <MockBtn kind="ghost" sm className="inline-flex items-center justify-center gap-1.5" type="button" disabled={pending} onClick={onCameraClick}>
          <MockIcon n="photo" ctx="default" className="h-4 w-4 shrink-0" aria-hidden />
          {cameraLabel}
        </MockBtn>
      </div>
      <MockBtn kind="primary" sm className="lead-notiz-compose__save" type="button" disabled={!canSave} onClick={onSave}>
        {saveLabel}
      </MockBtn>
    </div>
  )
}

export function LeadNotizenListeTab({
  leadId,
  notizen,
  onReload,
}: {
  leadId: string
  notizen: LeadNotizRow[]
  onReload: () => void
}) {
  const router = useRouter()
  const [neue, setNeue] = useState('')
  const [pendingFoto, setPendingFoto] = useState<{ file: File; url: string } | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set())
  const [pending, startTransition] = useTransition()
  const fileGalleryRef = useRef<HTMLInputElement>(null)
  const fileCameraRef = useRef<HTMLInputElement>(null)
  const pendingFotoRef = useRef(pendingFoto)
  pendingFotoRef.current = pendingFoto

  useEffect(() => {
    return () => {
      const p = pendingFotoRef.current
      if (p) URL.revokeObjectURL(p.url)
    }
  }, [])

  function clearPendingFoto() {
    setPendingFoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
    if (fileGalleryRef.current) fileGalleryRef.current.value = ''
    if (fileCameraRef.current) fileCameraRef.current.value = ''
  }

  function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const maxBytes = 8 * 1024 * 1024
    if (f.size > maxBytes) {
      toast.error(TOAST.datei_zu_gross_max_8_mb)
      e.target.value = ''
      return
    }
    setPendingFoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return { file: f, url: URL.createObjectURL(f) }
    })
  }

  async function speichern() {
    const plain = richTextToPlain(neue).trim()
    if (!plain && !pendingFoto) return
    startTransition(async () => {
      let fotoUrl: string | null = null
      if (pendingFoto) {
        const fd = new FormData()
        fd.append('file', pendingFoto.file)
        const res = await fetch(`/api/anfragen/${leadId}/notiz-foto`, { method: 'POST', body: fd })
        if (res.status === 413) {
          toast.error(TOAST.datei_zu_gross_max_8_mb)
          return
        }
        const js: { url?: unknown; error?: unknown } = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = typeof js.error === 'string' ? js.error : 'Foto-Upload fehlgeschlagen.'
          toast.error(msg)
          return
        }
        fotoUrl = typeof js.url === 'string' ? js.url : null
        if (!fotoUrl) {
          toast.error(TOAST.keine_bild_url_erhalten)
          return
        }
      }
      const r = await addLeadNotizRow(leadId, neue, fotoUrl)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.notizHinzugefuegt)
      setNeue('')
      clearPendingFoto()
      onReload()
      afterServerActionRefresh()
    })
  }

  async function loeschen(id: string, _preview?: string) {
    deleteWithUndo({
      key: `lead-notiz:${id}`,
      removeOptimistic: () =>
        setHiddenIds((prev) => new Set(prev).add(id)),
      restoreOptimistic: () =>
        setHiddenIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        }),
      commit: async () => {
        const r = await deleteLeadNotizRow(id, leadId)
        if (!r.ok) {
          toast.systemError(r)
          setHiddenIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
          return
        }
        onReload()
        afterServerActionRefresh()
      },
      message: TOAST.geloescht,
    })
  }

  const allgemeineNotizen = useMemo(
    () =>
      notizen.filter(
        (n) => !n.kalender_termin_id?.trim() && !hiddenIds.has(n.id)
      ),
    [notizen, hiddenIds]
  )

  const canSave = !!(richTextToPlain(neue).trim() || pendingFoto) && !pending

  return (
    <div className="lead-notiz-tab min-w-0 px-3 py-3 md:p-4">
      <LeadNotizFotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      <div className="lead-notiz-compose">
        <RichTextEditor value={typeof (neue) === 'string' ? (neue) : ''} onChange={(__v) => setNeue(__v)} placeholder="Notiz hinzufügen…" minHeight={120} aria-label="Notiz hinzufügen…" />

        <input
          ref={fileGalleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={onFileChosen}
        />
        <input
          ref={fileCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={onFileChosen}
        />

        <LeadNotizFotoToolbar
          pending={pending}
          canSave={canSave}
          onGalleryClick={() => fileGalleryRef.current?.click()}
          onCameraClick={() => fileCameraRef.current?.click()}
          onSave={() => void speichern()}
        />

        {pendingFoto ? (
          <div className="relative mt-3 inline-block max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingFoto.url}
              alt="Vorschau"
              className="max-h-40 max-w-full rounded-button border border-bw-border object-contain"
            />
            <MockBtn className="absolute right-1 top-1 rounded-pill bg-black/55 p-1.5 text-white hover:bg-black/75" type="button" onClick={() => clearPendingFoto()} aria-label="Foto löschen">
              <MockIcon n="x" ctx="default" className="h-3.5 w-3.5" aria-hidden />
            </MockBtn>
          </div>
        ) : null}

        <p className="lead-notiz-compose__hint">Optional mit Foto · bis 8 MB · JPEG, PNG, WebP, GIF, HEIC</p>
      </div>

      {allgemeineNotizen.length === 0 ? (
        <div className="py-10 text-center text-[length:var(--fs-text)] text-bw-text-muted">Noch keine Notizen</div>
      ) : (
        <div className="lead-notiz-liste mt-4 space-y-3">
          {allgemeineNotizen.map((n) => {
            const fotos = leadNotizFotoUrls(n).filter(istBildAnhangUrl)
            return (
            <div key={n.id} className="relative">
              <Note
                variant="plain"
                meta={
                  <div className="pr-6">
                    <div className="text-[length:var(--fs-text)] font-semibold leading-tight text-bw-text">
                      {leadNotizErstellerLabel(n)}
                    </div>
                    <div className="mt-0.5 tabular-nums text-bw-text-muted">{formatDatumZeit(n.created_at)}</div>
                  </div>
                }
              >
                {n.inhalt.trim() ? (
                  <RichTextContent html={n.inhalt} className="text-bw-text-mid" />
                ) : null}
                {fotos.length ? (
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {fotos.map((url) => (
                      <MockBtn className="block overflow-hidden rounded-button border border-bw-border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-bw-ring" key={url} type="button" onClick={() => setLightboxUrl(url)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Notiz-Anhang"
                          className="aspect-square w-full object-cover"
                        />
                      </MockBtn>
                    ))}
                  </div>
                ) : n.datei_url ? (
                  <a
                    href={n.datei_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-[length:var(--fs-meta)] text-bw-link"
                  >
                    Anhang öffnen
                  </a>
                ) : null}
              </Note>
              <div className="absolute right-2 top-2">
                <MockEntityRowMenu
                  title="Notiz"
                  items={
                    [
                      {
                        icon: 'trash',
                        label: 'Löschen',
                        danger: true,
                        onClick: () =>
                          void loeschen(
                            n.id,
                            richTextToPlain(n.inhalt ?? '').trim().split('\n')[0] || 'Notiz'
                          ),
                      },
                    ] satisfies EntityMenuItem[]
                  }
                />
              </div>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

type AngebotZeile = {
  id: string
  status: string
  gesamt_fix?: number | null
  gesamt_min: number | null
  gesamt_max: number | null
  created_at?: string | null
}

export function AngeboteListeTab({
  leadId,
  angebote,
  variant = 'default',
  onAngebotErstellen,
}: {
  leadId: string
  angebote: AngebotZeile[]
  variant?: 'default' | 'wireframe'
  /** Wizard/Modal auf der Anfrage-Detailseite statt /angebote/neu */
  onAngebotErstellen?: () => void
}) {
  const router = useRouter()
  const rows = useMemo(
    () =>
      [...angebote].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      ),
    [angebote]
  )

  if (variant === 'wireframe') {
    return (
      <div>
        <div>
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[length:var(--fs-text)] text-bw-text-muted">Noch kein Angebot</div>
          ) : (
            rows.map((a) => (
              <MockBtn fullWidth className="list-row-grid border-b border-bw-border text-left last:border-b-0 hover:bg-bw-hover" key={a.id} type="button" onClick={() => router.push(`/angebote/${a.id}`)} style={{ gridTemplateColumns: '7.5rem 1fr 6.25rem 6.8750remrem 2.75rem' }}>
                <span className="font-mono text-[length:var(--fs-meta)] text-bw-text-muted">AN-{a.id.slice(0, 8).toUpperCase()}</span>
                <span>
                  <span className="block text-[length:var(--fs-text)] font-medium text-bw-text">Angebot</span>
                  <span className="block text-[length:var(--fs-meta)] text-bw-text-muted">
                    {a.created_at ? `erstellt ${formatRelativeDate(a.created_at)}` : '—'}
                  </span>
                </span>
                <span className="text-right text-[length:var(--fs-text)] font-medium tabular-nums text-bw-text">
                  {formatAngebotEurKurzBrutto(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)}
                </span>
                <StatusBadge status={a.status} />
                <MockIcon n="external-link" ctx="default" className="mx-auto h-4 w-4 text-bw-text-muted" aria-hidden />
              </MockBtn>
            ))
          )}
        </div>
        <div className="border-t border-bw-border px-4 py-3">
          {onAngebotErstellen ? (
            <MockBtn kind="primary" sm type="button" onClick={onAngebotErstellen}>
              <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" />
              Neues Angebot
            </MockBtn>
          ) : (
            <Link href={`/angebote/neu?lead_id=${leadId}`} className="btn primary sm">
              <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" />
              Neues Angebot
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[length:var(--fs-text)] font-medium text-bw-text">Angebote</h3>
        {onAngebotErstellen ? (
          <MockBtn kind="primary" sm type="button" onClick={onAngebotErstellen}>
            + Angebot erstellen
          </MockBtn>
        ) : (
          <Link href={`/angebote/neu?lead_id=${leadId}`} className="btn primary sm">
            + Angebot erstellen
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <MockEmpty
          icon="file-text"
          title="Noch kein Angebot"
          hint="Erstelle ein Angebot basierend auf den Projektdetails. Über „+ Angebot erstellen“ oben."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((a) => (
            <MockBtn fullWidth className="flex items-center justify-between rounded-button bg-bw-hover p-3 text-left transition-colors hover:bg-bw-border" key={a.id} type="button" onClick={() => router.push(`/angebote/${a.id}/bearbeiten`)}>
              <div>
                <div className="text-[length:var(--fs-text)] font-medium text-bw-text">
                  {formatAngebotEurKurzBrutto(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)}
                </div>
                <div className="mt-0.5 text-[length:var(--fs-meta)] text-bw-text-muted">
                  {a.created_at ? formatDatum(a.created_at) : '—'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} />
                <MockIcon n="chevron-right" ctx="default" className="h-4 w-4 text-bw-text-muted" aria-hidden />
              </div>
            </MockBtn>
          ))}
        </div>
      )}
    </div>
  )
}
