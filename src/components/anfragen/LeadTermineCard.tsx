'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from 'react'
import {
  Calendar,
  Camera,
  ChevronDown,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ModalFormFooter } from '@/components/ui/ModalFormFooter'
import { Textarea } from '@/components/ui/Textarea'
import { RichTextContent } from '@/components/ui/RichTextContent'
import {
  addLeadNotizRow,
  deleteLeadNotizRow,
  loadCrmTeamFuerTermin,
  updateLeadNotizRow,
} from '@/app/(dashboard)/anfragen/actions'
import { LeadTerminEditModal } from '@/components/anfragen/LeadTerminEditModal'
import { kalenderTitelZeile } from '@/components/kalender/KalenderTerminZeile'
import { toast } from '@/components/ui/app-toast'
import {
  dedupeKalenderTermineAnzeige,
  formatTerminUhrzeitKurz,
  normalizeKalenderTermineList,
} from '@/lib/anfragen/normalize-kalender-termine'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type { KalenderTermin, LeadNotizRow } from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'

function teamMitgliedName(team: CrmTeamMitglied[], id: string | null | undefined): string {
  if (!id?.trim()) return '—'
  return team.find((m) => m.id === id)?.name?.trim() || 'Mitarbeiter'
}

function terminZeileKurz(t: KalenderTermin): string {
  const titel = kalenderTitelZeile(t)
  const datum = formatDatum(t.datum)
  const zeit = t.uhrzeit_von?.slice(0, 5)
  return zeit ? `${titel} · ${datum} · ${zeit} Uhr` : `${titel} · ${datum}`
}

function TerminNotizLightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  if (!url) return null
  return (
    <Modal open={!!url} onClose={onClose} title="Foto" size="xl">
      <div className="flex max-h-[min(85vh,800px)] items-center justify-center overflow-auto p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Termin-Foto" className="max-h-full max-w-full object-contain" />
      </div>
    </Modal>
  )
}

function istBildAnhangUrl(url: string): boolean {
  const u = url.split('?')[0].toLowerCase()
  if (u.includes('/lead-notizen-fotos/')) return true
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(u)
}

function TerminNotizFormModal({
  open,
  onClose,
  leadId,
  terminId,
  mode,
  notiz,
  onReload,
}: {
  open: boolean
  onClose: () => void
  leadId: string
  terminId: string
  mode: 'add' | 'edit'
  notiz?: LeadNotizRow
  onReload: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [pendingFoto, setPendingFoto] = useState<{ file: File; url: string } | null>(null)
  const fileGalleryRef = useRef<HTMLInputElement>(null)
  const fileCameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && notiz) {
      setTitel(notiz.titel?.trim() ?? '')
      setBeschreibung((notiz.inhalt ?? '').trim())
    } else {
      setTitel('')
      setBeschreibung('')
    }
    setPendingFoto(null)
  }, [open, mode, notiz])

  function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setPendingFoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return { file: f, url: URL.createObjectURL(f) }
    })
  }

  function clearPendingFoto() {
    setPendingFoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
    if (fileGalleryRef.current) fileGalleryRef.current.value = ''
    if (fileCameraRef.current) fileCameraRef.current.value = ''
  }

  async function speichern() {
    const titelTrim = titel.trim()
    const text = beschreibung.trim()
    if (!titelTrim) {
      toast.error('Bitte einen Titel eingeben.')
      return
    }
    if (!text && (mode === 'edit' || !pendingFoto)) {
      toast.error('Bitte Beschreibung oder Foto hinzufügen.')
      return
    }
    startTransition(async () => {
      if (mode === 'edit' && notiz) {
        const r = await updateLeadNotizRow(notiz.id, leadId, { titel: titelTrim, inhalt: text })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      } else {
        let fotoUrl: string | null = null
        if (pendingFoto) {
          const fd = new FormData()
          fd.append('file', pendingFoto.file)
          const res = await fetch(`/api/anfragen/${leadId}/notiz-foto`, { method: 'POST', body: fd })
          const js: { url?: unknown; error?: unknown } = await res.json().catch(() => ({}))
          if (!res.ok) {
            toast.error(typeof js.error === 'string' ? js.error : 'Foto-Upload fehlgeschlagen.')
            return
          }
          fotoUrl = typeof js.url === 'string' ? js.url : null
          if (!fotoUrl) {
            toast.error('Keine Bild-URL erhalten.')
            return
          }
        }
        const r = await addLeadNotizRow(leadId, text, fotoUrl, {
          kalender_termin_id: terminId,
          titel: titelTrim,
        })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      }
      onReload()
      router.refresh()
      toast.success(mode === 'edit' ? 'Notiz aktualisiert' : 'Notiz gespeichert')
      onClose()
    })
  }

  const canSave =
    !!titel.trim() && !!(beschreibung.trim() || (mode === 'add' && pendingFoto)) && !pending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}
      size="md"
    >
      <Input
        label="Titel"
        placeholder="z. B. Badzustand, Maße Küche…"
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
      />
      <div className="mt-3">
        <Textarea
          label="Beschreibung"
          rows={4}
          placeholder="Beobachtungen, Maße, Besonderheiten…"
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
        />
      </div>
      {mode === 'add' ? (
        <>
          <input
            ref={fileGalleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChosen}
          />
          <input
            ref={fileCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileChosen}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => fileGalleryRef.current?.click()}
              className="btn btn-secondary btn-sm inline-flex items-center gap-1.5"
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
              Foto
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => fileCameraRef.current?.click()}
              className="btn btn-secondary btn-sm inline-flex items-center gap-1.5"
            >
              <Camera className="h-4 w-4" aria-hidden />
              Aufnehmen
            </button>
          </div>
          {pendingFoto ? (
            <div className="relative mt-3 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingFoto.url}
                alt=""
                className="max-h-32 rounded-md border border-bw-border object-contain"
              />
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white"
                onClick={clearPendingFoto}
                aria-label="Foto entfernen"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      <ModalFormFooter
        onCancel={onClose}
        onSubmit={() => void speichern()}
        submitLabel={mode === 'edit' ? 'Speichern' : 'Notiz speichern'}
        loading={pending}
        submitDisabled={!canSave}
      />
    </Modal>
  )
}

function TerminNotizZeile({
  notiz,
  leadId,
  onReload,
}: {
  notiz: LeadNotizRow
  leadId: string
  onReload: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function loeschen() {
    if (!window.confirm('Notiz löschen?')) return
    startTransition(async () => {
      const r = await deleteLeadNotizRow(notiz.id, leadId)
      if (!r.ok) toast.error(r.message)
      else {
        onReload()
        router.refresh()
      }
    })
  }

  const titel = notiz.titel?.trim() || 'Notiz'

  return (
    <li className="lead-notiz-row">
      <div className="lead-notiz-row__header">
        <button
          type="button"
          className="lead-notiz-row__trigger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="lead-notiz-row__meta">{formatDatum(notiz.created_at)}</span>
          <span className="lead-notiz-row__title">{titel}</span>
          <ChevronDown className={cn('lead-notiz-row__chevron', open && 'is-open')} aria-hidden />
        </button>
        <div className="lead-notiz-row__actions">
          <button
            type="button"
            className="lead-notiz-row__icon-btn"
            onClick={() => setEditOpen(true)}
            aria-label="Notiz bearbeiten"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className="lead-notiz-row__icon-btn lead-notiz-row__icon-btn--danger"
            onClick={() => void loeschen()}
            disabled={pending}
            aria-label="Notiz löschen"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
      {open ? (
        <div className="lead-notiz-row__body">
          {(notiz.inhalt ?? '').trim() ? (
            <RichTextContent html={notiz.inhalt ?? ''} className="text-sm text-bw-text-mid" />
          ) : null}
          {notiz.datei_url && istBildAnhangUrl(notiz.datei_url) ? (
            <button
              type="button"
              className="mt-2 block max-w-full text-left"
              onClick={() => setLightboxUrl(notiz.datei_url!)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={notiz.datei_url}
                alt=""
                className="max-h-40 max-w-full rounded-md border border-bw-border object-contain"
              />
            </button>
          ) : null}
        </div>
      ) : null}
      <TerminNotizFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        leadId={leadId}
        terminId={notiz.kalender_termin_id ?? ''}
        mode="edit"
        notiz={notiz}
        onReload={onReload}
      />
      <TerminNotizLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </li>
  )
}

function TerminNotizenBlock({
  leadId,
  terminId,
  notizen,
  onReload,
}: {
  leadId: string
  terminId: string
  notizen: LeadNotizRow[]
  onReload: () => void
}) {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="lead-termin-notizen border-t border-bw-border pt-3">
      <div className="lead-termin-notizen__head">
        <p className="text-xs font-medium uppercase tracking-wide text-bw-text-muted">
          Notizen zum Termin
        </p>
        <button
          type="button"
          className="btn btn-secondary btn-sm inline-flex items-center gap-1"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Hinzufügen
        </button>
      </div>

      {notizen.length === 0 ? (
        <p className="mt-2 text-sm text-bw-text-muted">Noch keine Notizen zu diesem Termin.</p>
      ) : (
        <ul className="lead-notiz-list mt-2">
          {notizen.map((n) => (
            <TerminNotizZeile key={n.id} notiz={n} leadId={leadId} onReload={onReload} />
          ))}
        </ul>
      )}

      <TerminNotizFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        leadId={leadId}
        terminId={terminId}
        mode="add"
        onReload={onReload}
      />
    </div>
  )
}

function LeadTerminZeile({
  termin,
  team,
  leadId,
  notizen,
  onReload,
}: {
  termin: KalenderTermin
  team: CrmTeamMitglied[]
  leadId: string
  notizen: LeadNotizRow[]
  onReload: () => void
}) {
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const zeit = formatTerminUhrzeitKurz(termin.uhrzeit_von, termin.uhrzeit_bis)
  const wer = teamMitgliedName(team, termin.zugewiesen_an)
  const wann = `${formatDatum(termin.datum)}${zeit ? ` · ${zeit} Uhr` : ''}`
  const wo = termin.adresse?.trim() || '—'

  return (
    <div className="detail-section-card lead-termin-row">
      <div className="detail-section-card__header">
        <button
          type="button"
          className="detail-section-card__trigger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="detail-section-card__title">{terminZeileKurz(termin)}</span>
          <ChevronDown
            className={cn('detail-section-card__chevron', open && 'is-open')}
            aria-hidden
          />
        </button>
        <div className="detail-section-card__action">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-bw-text-muted transition-colors hover:bg-bw-hover hover:text-bw-text"
            onClick={() => setEditOpen(true)}
            aria-label="Termin bearbeiten"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      {open ? (
        <div className="detail-section-card__body">
          <div className="detail-section-card__body-inner space-y-2 text-sm">
            <dl className="lead-termin-facts grid gap-2">
              <div className="lead-termin-facts__row">
                <dt className="lead-termin-facts__label">Wer</dt>
                <dd className="lead-termin-facts__value">{wer}</dd>
              </div>
              <div className="lead-termin-facts__row">
                <dt className="lead-termin-facts__label">Wann</dt>
                <dd className="lead-termin-facts__value">{wann}</dd>
              </div>
              <div className="lead-termin-facts__row">
                <dt className="lead-termin-facts__label">Wohin</dt>
                <dd className="lead-termin-facts__value">{wo}</dd>
              </div>
            </dl>
            <TerminNotizenBlock
              leadId={leadId}
              terminId={termin.id}
              notizen={notizen}
              onReload={onReload}
            />
          </div>
        </div>
      ) : null}
      {editOpen ? (
        <LeadTerminEditModal
          open
          onClose={() => setEditOpen(false)}
          termin={termin}
          onSaved={onReload}
        />
      ) : null}
    </div>
  )
}

export function LeadTermineCard({
  leadId,
  termine,
  notizen,
  onReload,
  variant = 'card',
}: {
  leadId: string
  termine: KalenderTermin[] | KalenderTermin | null | undefined
  notizen: LeadNotizRow[]
  onReload: () => void
  variant?: 'card' | 'plain'
}) {
  const [team, setTeam] = useState<CrmTeamMitglied[]>([])

  useEffect(() => {
    void loadCrmTeamFuerTermin()
      .then(setTeam)
      .catch(() => setTeam([]))
  }, [])

  const sorted = useMemo(() => {
    const unique = dedupeKalenderTermineAnzeige(normalizeKalenderTermineList(termine))
    return unique.sort((a, b) => {
      const da = new Date(a.datum).getTime()
      const db = new Date(b.datum).getTime()
      if (da !== db) return db - da
      const ua = a.uhrzeit_von ?? ''
      const ub = b.uhrzeit_von ?? ''
      return ub.localeCompare(ua)
    })
  }, [termine])

  const notizenByTermin = useMemo(() => {
    const map = new Map<string, LeadNotizRow[]>()
    for (const n of notizen) {
      const tid = n.kalender_termin_id?.trim()
      if (!tid) continue
      const list = map.get(tid) ?? []
      list.push(n)
      map.set(tid, list)
    }
    Array.from(map.values()).forEach((list) => {
      list.sort(
        (a: LeadNotizRow, b: LeadNotizRow) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    })
    return map
  }, [notizen])

  const body =
    sorted.length === 0 ? (
      <div className="py-6 text-center">
        <Calendar className="mx-auto h-8 w-8 text-bw-text-muted" aria-hidden />
        <p className="mt-2 text-sm font-medium text-bw-text">Noch kein Termin</p>
        <p className="mt-1 text-xs text-bw-text-muted">
          Termin über <strong>Aktionen → Termin vereinbart</strong> anlegen — Kalender-Eintrag und
          Bestätigungs-Mail laufen automatisch mit.
        </p>
      </div>
    ) : (
      <div className="lead-termin-list space-y-2">
        {sorted.map((t) => (
          <LeadTerminZeile
            key={t.id}
            termin={t}
            team={team}
            leadId={leadId}
            notizen={notizenByTermin.get(t.id) ?? []}
            onReload={onReload}
          />
        ))}
      </div>
    )

  if (variant === 'plain') return <div>{body}</div>

  return <Card collapsible title="Termine">{body}</Card>
}
