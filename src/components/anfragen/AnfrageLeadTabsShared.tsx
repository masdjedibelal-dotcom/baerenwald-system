'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from 'react'
import { Camera, ChevronRight, ExternalLink, FileText, ImagePlus, Plus, X } from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
import { Note } from '@/components/ui/note'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { RichTextContent } from '@/components/ui/RichTextContent'
import { AngebotStatusBadge } from '@/components/ui/AngebotStatusBadge'
import { addLeadNotizRow, deleteLeadNotizRow } from '@/app/(dashboard)/anfragen/actions'
import { leadNotizFotoUrls } from '@/lib/anfragen/lead-notiz-fotos'
import { toast } from '@/components/ui/app-toast'
import type { LeadNotizRow } from '@/lib/types'
import { betragAnzeige } from '@/lib/angebot-einfach'
import { richTextToPlain } from '@/lib/rich-text'
import { formatDatumZeit, formatRelativeDate } from '@/lib/utils'

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
    <Modal open onClose={onClose} title="Foto" size="xl">
      <div className="flex max-h-[min(85vh,800px)] items-center justify-center overflow-auto p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Notiz-Foto" className="max-h-full max-w-full object-contain" />
      </div>
    </Modal>
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
        <button
          type="button"
          disabled={pending}
          onClick={onGalleryClick}
          className="btn btn-secondary btn-sm inline-flex items-center justify-center gap-1.5"
        >
          <ImagePlus className="h-4 w-4 shrink-0" aria-hidden />
          {galleryLabel}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCameraClick}
          className="btn btn-secondary btn-sm inline-flex items-center justify-center gap-1.5"
        >
          <Camera className="h-4 w-4 shrink-0" aria-hidden />
          {cameraLabel}
        </button>
      </div>
      <button
        type="button"
        disabled={!canSave}
        onClick={onSave}
        className="btn btn-primary btn-sm lead-notiz-compose__save"
      >
        {saveLabel}
      </button>
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
        const js: { url?: unknown; error?: unknown } = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = typeof js.error === 'string' ? js.error : 'Foto-Upload fehlgeschlagen.'
          toast.error(msg)
          return
        }
        fotoUrl = typeof js.url === 'string' ? js.url : null
        if (!fotoUrl) {
          toast.error('Keine Bild-URL erhalten.')
          return
        }
      }
      const r = await addLeadNotizRow(leadId, neue, fotoUrl)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setNeue('')
      clearPendingFoto()
      onReload()
      router.refresh()
    })
  }

  async function loeschen(id: string) {
    if (!window.confirm('Notiz löschen?')) return
    startTransition(async () => {
      const r = await deleteLeadNotizRow(id, leadId)
      if (!r.ok) toast.error(r.message)
      else {
        onReload()
        router.refresh()
      }
    })
  }

  const allgemeineNotizen = useMemo(
    () => notizen.filter((n) => !n.kalender_termin_id?.trim()),
    [notizen]
  )

  const canSave = !!(richTextToPlain(neue).trim() || pendingFoto) && !pending

  return (
    <div className="lead-notiz-tab min-w-0 px-3 py-3 md:p-4">
      <LeadNotizFotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      <div className="lead-notiz-compose">
        <Textarea
          rows={3}
          placeholder="Notiz hinzufügen…"
          value={neue}
          onChange={(e) => setNeue(e.target.value)}
        />

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
              className="max-h-40 max-w-full rounded-md border border-bw-border object-contain"
            />
            <button
              type="button"
              className="absolute right-1 top-1 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/75"
              onClick={() => clearPendingFoto()}
              aria-label="Foto entfernen"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ) : null}

        <p className="lead-notiz-compose__hint">Optional mit Foto · bis 5 MB · JPEG, PNG, WebP, GIF, HEIC</p>
      </div>

      {allgemeineNotizen.length === 0 ? (
        <div className="py-10 text-center text-sm text-bw-text-muted">Noch keine Notizen</div>
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
                    <div className="text-[13px] font-semibold leading-tight text-bw-text">
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
                      <button
                        key={url}
                        type="button"
                        className="block overflow-hidden rounded-md border border-bw-border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-bw-ring"
                        onClick={() => setLightboxUrl(url)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Notiz-Anhang"
                          className="aspect-square w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : n.datei_url ? (
                  <a
                    href={n.datei_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-xs text-bw-link"
                  >
                    Anhang öffnen
                  </a>
                ) : null}
              </Note>
              <button
                type="button"
                className="absolute right-2 top-2 text-xs text-bw-text-muted hover:text-status-cancel-text"
                onClick={() => void loeschen(n.id)}
                aria-label="Notiz löschen"
              >
                ×
              </button>
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
            <div className="px-4 py-8 text-center text-sm text-bw-text-muted">Noch kein Angebot</div>
          ) : (
            rows.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => router.push(`/angebote/${a.id}`)}
                className="list-row-grid w-full border-b border-bw-border text-left last:border-b-0 hover:bg-bw-hover"
                style={{ gridTemplateColumns: '120px 1fr 100px 110px 44px' }}
              >
                <span className="font-mono text-xs text-bw-text-muted">AN-{a.id.slice(0, 8).toUpperCase()}</span>
                <span>
                  <span className="block text-[13px] font-medium text-bw-text">Angebot</span>
                  <span className="block text-xs text-bw-text-muted">
                    {a.created_at ? `erstellt ${formatRelativeDate(a.created_at)}` : '—'}
                  </span>
                </span>
                <span className="text-right text-[13px] font-medium tabular-nums text-bw-text">
                  {betragAnzeige(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)}
                </span>
                <AngebotStatusBadge status={a.status} />
                <ExternalLink className="mx-auto h-4 w-4 text-bw-text-muted" aria-hidden />
              </button>
            ))
          )}
        </div>
        <div className="border-t border-bw-border px-4 py-3">
          {onAngebotErstellen ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={onAngebotErstellen}>
              <Plus className="h-3.5 w-3.5" />
              Neues Angebot
            </button>
          ) : (
            <Link href={`/angebote/neu?lead_id=${leadId}`} className="btn btn-primary btn-sm">
              <Plus className="h-3.5 w-3.5" />
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
        <h3 className="text-sm font-medium text-bw-text">Angebote</h3>
        {onAngebotErstellen ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={onAngebotErstellen}>
            + Angebot erstellen
          </button>
        ) : (
          <Link href={`/angebote/neu?lead_id=${leadId}`} className="btn btn-primary btn-sm">
            + Angebot erstellen
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Noch kein Angebot"
          description="Erstelle ein Angebot basierend auf den Projektdetails."
          action={
            onAngebotErstellen ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={onAngebotErstellen}>
                + Angebot erstellen
              </button>
            ) : (
              <Link href={`/angebote/neu?lead_id=${leadId}`} className="btn btn-primary btn-sm">
                + Angebot erstellen
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {rows.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => router.push(`/angebote/${a.id}/bearbeiten`)}
              className="flex w-full items-center justify-between rounded-lg bg-bw-hover p-3 text-left transition-colors hover:bg-bw-border"
            >
              <div>
                <div className="text-sm font-medium text-bw-text">
                  {betragAnzeige(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)}
                </div>
                <div className="mt-0.5 text-xs text-bw-text-muted">
                  {a.created_at ? new Date(a.created_at).toLocaleDateString('de') : '—'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AngebotStatusBadge status={a.status} />
                <ChevronRight className="h-4 w-4 text-bw-text-muted" aria-hidden />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
