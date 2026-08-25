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
import { DokMobileCard } from '@/components/ui/DokMobileCard'
import {
  DokumenteVorgangAccordions,
  groupByVorgangTitel,
} from '@/components/ui/DokumenteVorgangAccordions'
import { useIsMobile } from '@/hooks/useIsMobile'
import { resolveAkteVorgangTitel } from '@/lib/vorgang/vorgang-anzeige-titel'
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
  groupKey: string
  groupTitle: string
}

const COLS = 'minmax(0, 1fr) auto'
const ALLGEMEIN_KEY = 'allgemein'
const ALLGEMEIN_TITLE = 'Allgemein'

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

function openDokumentDatei(url: string) {
  const href = url.trim()
  if (!href) return
  window.open(href, '_blank', 'noopener,noreferrer')
}

function normalizeAuftragAngebote(
  raw:
    | {
        id?: string
        pdf_url?: string | null
        created_at?: string | null
        status?: string
        lead_id?: string | null
        leistungsumfang?: string | null
        notizen?: string | null
      }
    | {
        id?: string
        pdf_url?: string | null
        created_at?: string | null
        status?: string
        lead_id?: string | null
        leistungsumfang?: string | null
        notizen?: string | null
      }[]
    | null
    | undefined
) {
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

type AngTitelQuelle = {
  leistungsumfang?: string | null
  notizen?: string | null
}

function pickAngebotFuerTitel(list: AngTitelQuelle[]): AngTitelQuelle | null {
  return (
    list.find((a) => Boolean(a.leistungsumfang?.trim() || a.notizen?.trim())) ??
    list[0] ??
    null
  )
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
  const isMobile = useIsMobile()
  const [meta, setMeta] = useState<
    Record<string, { name?: string; beschreibung: string; freigabe: boolean; created_at?: string }>
  >({})
  const [editId, setEditId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const docs = useMemo((): DocRow[] => {
    const rows: DocRow[] = []
    const seen = new Set<string>()

    const leadById = new Map(leads.map((l) => [l.id, l]))
    const auftragById = new Map(auftraege.map((a) => [a.id, a]))
    const angebotById = new Map<string, AngTitelQuelle & { id: string; lead_id?: string | null }>()

    for (const l of leads) {
      for (const ang of l.angebote ?? []) {
        if (!ang?.id) continue
        angebotById.set(ang.id, {
          id: ang.id,
          lead_id: l.id,
          leistungsumfang: ang.leistungsumfang,
          notizen: ang.notizen,
        })
      }
    }
    for (const a of auftraege) {
      for (const ang of normalizeAuftragAngebote(a.angebote)) {
        if (!ang?.id) continue
        angebotById.set(ang.id, {
          id: ang.id,
          lead_id: ang.lead_id ?? a.lead_id ?? null,
          leistungsumfang: ang.leistungsumfang,
          notizen: ang.notizen,
        })
      }
    }

    function groupForVorgang(opts: {
      leadId?: string | null
      auftragId?: string | null
      angebot?: AngTitelQuelle | null
      rechnungTitel?: string | null
    }): { groupKey: string; groupTitle: string } {
      const lead = opts.leadId ? leadById.get(opts.leadId) : undefined
      const auftrag = opts.auftragId ? auftragById.get(opts.auftragId) : undefined
      const angsFromAuftrag = auftrag
        ? normalizeAuftragAngebote(auftrag.angebote)
        : []
      const angsFromLead = lead?.angebote ?? []
      const angebot =
        opts.angebot ??
        pickAngebotFuerTitel([
          ...angsFromAuftrag,
          ...angsFromLead.map((x) => ({
            leistungsumfang: x.leistungsumfang,
            notizen: x.notizen,
          })),
        ])

      const title = resolveAkteVorgangTitel({
        angebot,
        auftragTitel: auftrag?.titel,
        rechnungTitel: opts.rechnungTitel,
        situation: lead?.situation,
        bereiche: lead?.bereiche,
        fallback: auftrag?.titel || 'Vorgang',
      })

      if (opts.leadId) {
        return { groupKey: `lead:${opts.leadId}`, groupTitle: title }
      }
      if (opts.auftragId) {
        return { groupKey: `auftrag:${opts.auftragId}`, groupTitle: title }
      }
      return { groupKey: ALLGEMEIN_KEY, groupTitle: ALLGEMEIN_TITLE }
    }

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
        groupKey: ALLGEMEIN_KEY,
        groupTitle: ALLGEMEIN_TITLE,
      })
      seen.add(id)
    }

    for (const a of auftraege) {
      const leadId =
        a.lead_id?.trim() ||
        normalizeAuftragAngebote(a.angebote).find((x) => x.lead_id)?.lead_id ||
        null
      const group = groupForVorgang({ leadId, auftragId: a.id })
      for (const ang of normalizeAuftragAngebote(a.angebote)) {
        if (!ang?.id || seen.has(`angebot-${ang.id}`)) continue
        const id = `angebot-${ang.id}`
        const m = meta[id]
        const group = groupForVorgang({
          leadId,
          auftragId: a.id,
          angebot: ang,
        })
        rows.push({
          id,
          name: m?.name?.trim() || `Angebot ${String(ang.id).slice(0, 8).toUpperCase()}`,
          href: ang.pdf_url?.trim() || `/api/angebote/${String(ang.id)}/pdf`,
          created_at: m?.created_at || ang.created_at || a.created_at,
          groesse_bytes: null,
          quelle: 'angebot',
          beschreibung: m?.beschreibung ?? '',
          freigabe: m?.freigabe ?? true,
          ...group,
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
          beschreibung: m?.beschreibung ?? '',
          freigabe: m?.freigabe ?? true,
          ...group,
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
        beschreibung: abschlussMeta?.beschreibung ?? '',
        freigabe: abschlussMeta?.freigabe ?? true,
        ...group,
      })
    }

    for (const l of leads) {
      for (const ang of l.angebote ?? []) {
        if (!ang?.id || seen.has(`angebot-${ang.id}`)) continue
        // Orphan/Merge-Fall:
        // Wenn zwar `auftrag_id` gesetzt ist, der zugehörige Auftrag aber nicht geladen ist,
        // darf das Angebot trotzdem in der Akte erscheinen.
        const offerAuftragId = ('auftrag_id' in ang
          ? (ang as { auftrag_id?: string | null }).auftrag_id?.trim()
          : null) as string | null
        if (offerAuftragId && auftragById.has(offerAuftragId)) continue
        const id = `angebot-${ang.id}`
        const m = meta[id]
        const offerGroup = groupForVorgang({ leadId: l.id, angebot: ang })
        rows.push({
          id,
          name: m?.name?.trim() || `Angebot ${ang.id.slice(0, 8).toUpperCase()}`,
          href: ang.pdf_url?.trim() || `/api/angebote/${ang.id}/pdf`,
          created_at: m?.created_at || ang.created_at || l.created_at,
          groesse_bytes: null,
          quelle: 'angebot',
          beschreibung: m?.beschreibung ?? '',
          freigabe: m?.freigabe ?? true,
          ...offerGroup,
        })
        seen.add(id)
      }
    }

    for (const r of rechnungen) {
      const id = `rechnung-${r.id}`
      const m = meta[id]
      const auftragId = (r as { auftrag_id?: string | null }).auftrag_id?.trim() || null
      const angebotId = (r as { angebot_id?: string | null }).angebot_id?.trim() || null
      const auftrag = auftragId ? auftragById.get(auftragId) : undefined
      const ang = angebotId ? angebotById.get(angebotId) : null
      const leadId =
        ang?.lead_id?.trim() ||
        auftrag?.lead_id?.trim() ||
        normalizeAuftragAngebote(auftrag?.angebote).find((x) => x.lead_id)?.lead_id ||
        null
      const group =
        leadId || auftragId
          ? groupForVorgang({
              leadId,
              auftragId,
              angebot: ang,
            })
          : { groupKey: ALLGEMEIN_KEY, groupTitle: ALLGEMEIN_TITLE }
      rows.push({
        id,
        name: m?.name?.trim() || r.rechnungsnummer?.trim() || 'Rechnung',
        href: r.pdf_url?.trim() || `/api/rechnungen/${r.id}/pdf`,
        created_at: m?.created_at || r.rechnungsdatum || r.bezahlt_at || new Date().toISOString(),
        groesse_bytes: null,
        quelle: 'rechnung',
        beschreibung: m?.beschreibung ?? '',
        freigabe: m?.freigabe ?? true,
        ...group,
      })
    }

    return rows.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [dokumente, auftraege, leads, rechnungen, meta])

  const groups = useMemo(() => groupByVorgangTitel(docs), [docs])

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
      onReload()
    })
  }

  const busy = uploading || pending

  function renderDocList(items: DocRow[]) {
    if (isMobile) {
      return (
        <div className="dok-cards">
          {items.map((d) => {
            const sizeLabel = formatBytes(d.groesse_bytes)
            const metaLine = [formatDatum(d.created_at), sizeLabel].filter(Boolean).join(' · ')
            return (
              <DokMobileCard
                key={d.id}
                title={d.name}
                meta={metaLine}
                onClick={() => openDokumentDatei(d.href)}
                badge={
                  <span className={cn('dok-card__tag', d.freigabe && 'is-kunde')}>
                    {d.freigabe ? 'Kunde' : 'intern'}
                  </span>
                }
              />
            )
          })}
        </div>
      )
    }

    return (
      <div className="dok-list dok-list--kunde">
        {items.map((d) => {
          const editing = editId === d.id
          const sizeLabel = formatBytes(d.groesse_bytes)
          const beschreibung = d.beschreibung?.trim() || ''
          const subline =
            beschreibung ||
            [formatDatum(d.created_at), sizeLabel].filter(Boolean).join(' · ')
          return (
            <div
              key={d.id}
              className={cn('list-row', !editing && 'dok-list__row--openable')}
              style={{
                gridTemplateColumns: COLS,
                cursor: editing ? 'default' : 'pointer',
                alignItems: 'center',
              }}
              role={editing ? undefined : 'button'}
              tabIndex={editing ? undefined : 0}
              onClick={() => {
                if (!editing) openDokumentDatei(d.href)
              }}
              onKeyDown={(e) => {
                if (editing) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openDokumentDatei(d.href)
                }
              }}
            >
              {editing ? (
                <div
                  className="dok-list__main min-w-0"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <input
                    className="txt"
                    value={d.name}
                    onChange={(e) => upd(d.id, { name: e.target.value })}
                    style={{ height: 30 }}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="dok-list__main min-w-0">
                  <div className="dok-list__name">
                    {d.name}
                    {subline ? (
                      <span className="dok-list__name-size"> · {subline}</span>
                    ) : null}
                  </div>
                </div>
              )}
              <div
                className="dok-list__actions"
                style={{ display: 'flex', gap: 0, justifyContent: 'flex-end' }}
                onClick={(e) => e.stopPropagation()}
              >
                {editing ? (
                  <MockBtn
                    sm
                    kind="ghost"
                    icon="check"
                    title="Fertig"
                    onClick={() => setEditId(null)}
                  />
                ) : null}
                {d.quelle === 'upload' ? (
                  <MockBtn
                    sm
                    kind="ghost"
                    icon="trash"
                    title="Löschen"
                    disabled={busy}
                    onClick={() => removeDoc(d)}
                  />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <MockDokumenteCard count={docs.length}>
        {!isMobile ? (
          <>
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
          </>
        ) : null}

        {docs.length === 0 ? (
          <p className="py-4 text-center text-[length:var(--fs-meta)] text-bw-text-muted">
            {isMobile
              ? 'Noch keine Dokumente. Über „Dokument“ oben hochladen.'
              : 'Noch keine Dokumente.'}
          </p>
        ) : (
          <DokumenteVorgangAccordions groups={groups} renderItems={renderDocList} />
        )}
      </MockDokumenteCard>
    </>
  )
}
