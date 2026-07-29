'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useRef, useState } from 'react'
import {
  deleteKundeDokument,
  insertKundeDokument,
} from '@/app/(dashboard)/kunden/dokumente-actions'
import { toast } from '@/components/ui/app-toast'
import type { KundenDokumentRow } from '@/lib/types'
import type { KundeDetailPayload } from '@/lib/kunden/load-kunde-detail'
import { MockDokumenteCard } from '@/components/mock-ui/MockDetailCards'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockModal } from '@/components/mock-ui/MockModal'
import { cn } from '@/lib/utils'

type DocRow = {
  id: string
  name: string
  href: string
  created_at: string
  groesse_bytes: number | null
  quelle: 'upload' | 'angebot' | 'rechnung' | 'dokumentation'
  dokumentId?: string
  beschreibung: string
  freigabe: boolean
}

type ViewState = {
  id: string
  name: string
  url: string
  isImage: boolean
  date: string
  size: string | null
  beschreibung: string
}

const COLS = '28px 1.6fr 1fr 120px 110px 70px'

function formatBytes(n: number | null | undefined): string | null {
  if (n == null || n <= 0) return null
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDatum(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function isImageDoc(name: string, url: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(`${name} ${url}`)
}

function normalizeAuftragAngebote(
  raw:
    | {
        id?: string
        pdf_url?: string | null
        created_at?: string | null
        status?: string
      }
    | {
        id?: string
        pdf_url?: string | null
        created_at?: string | null
        status?: string
      }[]
    | null
    | undefined
) {
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

export function KundenDokumenteTab({
  kundeId,
  dokumente,
  auftraege,
  leads,
  rechnungen,
  onReload,
}: {
  kundeId: string
  dokumente: KundenDokumentRow[]
  auftraege: NonNullable<KundeDetailPayload['auftraege']>
  leads: NonNullable<KundeDetailPayload['leads']>
  rechnungen: NonNullable<KundeDetailPayload['rechnungen']>
  onReload: () => void
}) {
  const [meta, setMeta] = useState<
    Record<string, { name?: string; beschreibung: string; freigabe: boolean; created_at?: string }>
  >({})
  const [editId, setEditId] = useState<string | null>(null)
  const [view, setView] = useState<ViewState | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const docs = useMemo((): DocRow[] => {
    const rows: DocRow[] = []
    const seen = new Set<string>()

    for (const d of dokumente) {
      if (d.typ === 'protokoll') continue
      const href = d.datei_url?.trim()
      if (!href) continue
      const id = `upload-${d.id}`
      const m = meta[id]
      rows.push({
        id,
        name: m?.name?.trim() || d.name.trim() || 'Dokument',
        href,
        created_at: m?.created_at || d.created_at,
        groesse_bytes: d.groesse_bytes,
        quelle: 'upload',
        dokumentId: d.id,
        beschreibung: m?.beschreibung ?? '',
        freigabe: m?.freigabe ?? false,
      })
      seen.add(id)
    }

    for (const a of auftraege) {
      for (const ang of normalizeAuftragAngebote(a.angebote)) {
        if (!ang?.id || seen.has(`angebot-${ang.id}`)) continue
        const id = `angebot-${ang.id}`
        const m = meta[id]
        rows.push({
          id,
          name: m?.name?.trim() || `Angebot ${String(ang.id).slice(0, 8).toUpperCase()}`,
          href: ang.pdf_url?.trim() || `/api/angebote/${String(ang.id)}/pdf`,
          created_at: m?.created_at || ang.created_at || a.created_at,
          groesse_bytes: null,
          quelle: 'angebot',
          beschreibung: m?.beschreibung ?? (a.titel?.trim() || ''),
          freigabe: m?.freigabe ?? true,
        })
        seen.add(id)
      }

      if (a.abnahme_protokoll_url?.trim()) {
        const id = `abnahme-${a.id}`
        const m = meta[id]
        rows.push({
          id,
          name: m?.name?.trim() || 'Abnahmeprotokoll',
          href: a.abnahme_protokoll_url.trim(),
          created_at: m?.created_at || a.created_at,
          groesse_bytes: null,
          quelle: 'dokumentation',
          beschreibung: m?.beschreibung ?? (a.titel?.trim() || ''),
          freigabe: m?.freigabe ?? true,
        })
      }

      const abschlussId = `abschluss-${a.id}`
      const abschlussMeta = meta[abschlussId]
      rows.push({
        id: abschlussId,
        name: abschlussMeta?.name?.trim() || 'Abschlussdokumentation (PDF)',
        href: `/api/auftraege/${a.id}/abschlussdokumentation/pdf`,
        created_at: abschlussMeta?.created_at || a.created_at,
        groesse_bytes: null,
        quelle: 'dokumentation',
        beschreibung: abschlussMeta?.beschreibung ?? (a.titel?.trim() || ''),
        freigabe: abschlussMeta?.freigabe ?? true,
      })
    }

    for (const l of leads) {
      for (const ang of l.angebote ?? []) {
        if (!ang?.id || seen.has(`angebot-${ang.id}`)) continue
        if ('auftrag_id' in ang && ang.auftrag_id) continue
        const id = `angebot-${ang.id}`
        const m = meta[id]
        rows.push({
          id,
          name: m?.name?.trim() || `Angebot ${ang.id.slice(0, 8).toUpperCase()}`,
          href: ang.pdf_url?.trim() || `/api/angebote/${ang.id}/pdf`,
          created_at: m?.created_at || ang.created_at || l.created_at,
          groesse_bytes: null,
          quelle: 'angebot',
          beschreibung: m?.beschreibung ?? '',
          freigabe: m?.freigabe ?? true,
        })
        seen.add(id)
      }
    }

    for (const r of rechnungen) {
      const id = `rechnung-${r.id}`
      const m = meta[id]
      rows.push({
        id,
        name: m?.name?.trim() || r.rechnungsnummer?.trim() || 'Rechnung',
        href: r.pdf_url?.trim() || `/api/rechnungen/${r.id}/pdf`,
        created_at: m?.created_at || r.rechnungsdatum || r.bezahlt_at || new Date().toISOString(),
        groesse_bytes: null,
        quelle: 'rechnung',
        beschreibung: m?.beschreibung ?? '',
        freigabe: m?.freigabe ?? true,
      })
    }

    return rows.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [dokumente, auftraege, leads, rechnungen, meta])

  const upd = (
    id: string,
    patch: Partial<{ name: string; beschreibung: string; freigabe: boolean; created_at: string }>
  ) => {
    setMeta((prev) => {
      const cur = prev[id] ?? { beschreibung: '', freigabe: false }
      return { ...prev, [id]: { ...cur, ...patch } }
    })
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 5)
    if (!list.length) return
    setUploading(true)
    try {
      for (const file of list) {
        const fd = new FormData()
        fd.set('file', file)
        fd.set('filename', file.name)
        const res = await fetch(`/api/kunden/${kundeId}/dokument/upload`, {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json()) as {
          url?: string
          groesse_bytes?: number
          error?: string
        }
        if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')

        const ins = await insertKundeDokument({
          kundeId,
          name: file.name,
          datei_url: json.url,
          groesse_bytes: json.groesse_bytes ?? file.size,
          typ: 'sonstiges',
        })
        if (!ins.ok) throw new Error(ins.message)
      }

      toast.success(
        list.length === 1 ? 'Dokument hochgeladen' : `${list.length} Dokumente hochgeladen`
      )
      startTransition(() => onReload())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removeDoc(row: DocRow) {
    if (row.quelle !== 'upload' || !row.dokumentId) return
    if (!confirm(`„${row.name}" wirklich löschen?`)) return
    startTransition(async () => {
      const r = await deleteKundeDokument(row.dokumentId!, kundeId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Dokument gelöscht')
      if (editId === row.id) setEditId(null)
      if (view?.id === row.id) setView(null)
      onReload()
    })
  }

  const openView = (d: DocRow) => {
    setView({
      id: d.id,
      name: d.name,
      url: d.href,
      isImage: isImageDoc(d.name, d.href),
      date: formatDatum(d.created_at),
      size: formatBytes(d.groesse_bytes),
      beschreibung: d.beschreibung,
    })
  }

  const busy = uploading || pending

  return (
    <>
      <MockDokumenteCard count={docs.length}>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={busy}
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
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
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
        >
          <MockIcon ctx="btn" n="cloud-upload" size={18} />
          {uploading ? 'Wird hochgeladen…' : 'Dateien hier ablegen oder klicken'}
        </div>

        {docs.length === 0 ? null : (
          <div className="dok-list">
            <div className="list-row head" style={{ gridTemplateColumns: COLS }} aria-hidden>
              <div />
              <div>Name</div>
              <div>Beschreibung</div>
              <div>Datum</div>
              <div>Freigabe</div>
              <div />
            </div>
            {docs.map((d) => {
              const editing = editId === d.id
              const sizeLabel = formatBytes(d.groesse_bytes)
              const isFoto = isImageDoc(d.name, d.href)
              return (
                <div
                  key={d.id}
                  className="list-row"
                  style={{
                    gridTemplateColumns: COLS,
                    cursor: 'default',
                    alignItems: editing ? 'start' : 'center',
                  }}
                >
                  <MockIcon
                    ctx="row"
                    n={isFoto ? 'photo' : 'file-text'}
                    size={18}
                    style={{ color: 'var(--text-3)' }}
                  />
                  {editing ? (
                    <input
                      className="txt"
                      value={d.name}
                      onChange={(e) => upd(d.id, { name: e.target.value })}
                      style={{ height: 30 }}
                      autoFocus
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.name}
                      {sizeLabel ? (
                        <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>
                          {' '}
                          · {sizeLabel}
                        </span>
                      ) : null}
                    </div>
                  )}
                  {editing ? (
                    <input
                      className="txt"
                      value={d.beschreibung}
                      onChange={(e) => upd(d.id, { beschreibung: e.target.value })}
                      placeholder="Beschreibung…"
                      style={{ height: 30 }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: 'var(--text-3)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.beschreibung || <span style={{ color: 'var(--text-4)' }}>—</span>}
                    </div>
                  )}
                  {editing ? (
                    <input
                      className="txt"
                      type="date"
                      defaultValue={d.created_at.slice(0, 10)}
                      onChange={(e) => {
                        if (!e.target.value) return
                        upd(d.id, {
                          created_at: new Date(e.target.value).toISOString(),
                        })
                      }}
                      style={{ height: 30, fontSize: 12 }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {formatDatum(d.created_at)}
                    </div>
                  )}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontSize: 11.5,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={d.freigabe}
                      onChange={(e) => upd(d.id, { freigabe: e.target.checked })}
                      style={{ accentColor: 'var(--green)', margin: 0 }}
                    />
                    <span style={{ color: d.freigabe ? 'var(--green)' : 'var(--text-3)' }}>
                      {d.freigabe ? 'Kunde' : 'intern'}
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: 0, justifyContent: 'flex-end' }}>
                    {editing ? (
                      <MockBtn
                        sm
                        kind="ghost"
                        icon="check"
                        title="Fertig"
                        onClick={() => setEditId(null)}
                      />
                    ) : (
                      <MockBtn
                        sm
                        kind="ghost"
                        icon="eye"
                        title="Ansehen"
                        onClick={() => openView(d)}
                      />
                    )}
                    {d.quelle === 'upload' ? (
                      <MockBtn
                        sm
                        kind="ghost"
                        icon="trash"
                        title="Löschen"
                        disabled={busy}
                        onClick={() => removeDoc(d)}
                      />
                    ) : (
                      <span style={{ width: 28 }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </MockDokumenteCard>

      <MockModal
        open={!!view}
        onClose={() => setView(null)}
        icon={view?.isImage ? 'photo' : 'file-text'}
        title={view?.name ?? 'Dokument'}
        sub={view ? `${view.date}${view.size ? ` · ${view.size}` : ''}` : undefined}
        footer={
          <>
            <MockBtn
              sm
              kind="ghost"
              icon="pencil"
              onClick={() => {
                if (!view) return
                setEditId(view.id)
                setView(null)
              }}
            >
              Bearbeiten
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn sm kind="primary" icon="x" onClick={() => setView(null)}>
              Schließen
            </MockBtn>
          </>
        }
      >
        {view ? (
          view.isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={view.url}
              alt={view.name}
              style={{ width: '100%', borderRadius: 8, display: 'block' }}
            />
          ) : (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                background: 'var(--bg-soft)',
                borderRadius: 10,
                border: '0.5px solid var(--border)',
              }}
            >
              <MockIcon
                ctx="empty"
                n="file-text"
                size={44}
                style={{ color: 'var(--text-4)' }}
              />
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 10 }}>{view.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                <a
                  href={view.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn ghost sm"
                  style={{ marginTop: 12, display: 'inline-flex' }}
                >
                  Datei öffnen
                </a>
              </div>
            </div>
          )
        ) : null}
        {view?.beschreibung ? (
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 12 }}>
            {view.beschreibung}
          </div>
        ) : null}
      </MockModal>
    </>
  )
}
