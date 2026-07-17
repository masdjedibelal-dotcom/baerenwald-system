'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { toast } from '@/components/ui/app-toast'
import { BautagebuchKundeSendModal } from '@/components/auftraege/BautagebuchKundeSendModal'
import {
  BautagebuchEintragModal,
  type BautagebuchEditorDraft,
} from '@/components/auftraege/BautagebuchEintragModal'
import {
  anfrageHandwerkerBautagebuchEintrag,
  createAuftragBautagebuchEintrag,
  deleteAuftragBautagebuchEintrag,
  freigebenBautagebuchEintrag,
  listAuftragBautagebuch,
  updateAuftragBautagebuchEintrag,
} from '@/app/(dashboard)/auftraege/bautagebuch-actions'
import {
  BAUTAGEBUCH_MAX_FOTOS,
  mergeBautagebuchFotoUrls,
} from '@/lib/auftraege/bautagebuch-fotos'
import type { AuftragBautagebuchEintrag, AuftragPosition } from '@/lib/types'
import { formatDatum } from '@/lib/utils'
import { heuteYmd } from '@/lib/angebot-einfach'
import type { GewerkOpt } from '@/lib/auftraege/auftrag-position-blocks'
import { richTextToPlain } from '@/lib/rich-text'

const BAUTAGEBUCH_POLL_MS = 20_000

function eintragFotosAnzeige(e: AuftragBautagebuchEintrag): string[] {
  if (e.foto_display_urls?.length) return e.foto_display_urls
  return e.foto_urls ?? []
}

function beschreibungPlain(html: string | null | undefined): string {
  if (!html?.trim()) return ''
  return richTextToPlain(html).trim()
}

function draftFromEintrag(e: AuftragBautagebuchEintrag): BautagebuchEditorDraft {
  return {
    id: e.id,
    titel: e.titel || '',
    beschreibung: e.beschreibung || '',
    datum: e.datum?.slice(0, 10) || heuteYmd(),
    foto_urls: [...(e.foto_urls ?? [])],
    foto_display_urls: [...eintragFotosAnzeige(e)],
  }
}

function emptyDraft(): BautagebuchEditorDraft {
  return {
    titel: '',
    beschreibung: '',
    datum: heuteYmd(),
    foto_urls: [],
    foto_display_urls: [],
  }
}

function istPartnerEntwurf(e: AuftragBautagebuchEintrag): boolean {
  return Boolean(e.handwerker_id) && !e.fuer_kunde_freigegeben
}

export function AuftragBautagebuchCard({
  auftragId,
  eintraege,
  kundeName,
  positionen = [],
  onChanged,
}: {
  auftragId: string
  eintraege: AuftragBautagebuchEintrag[]
  kundeName: string
  positionen?: AuftragPosition[]
  gewerke?: GewerkOpt[]
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [rows, setRows] = useState(eintraege)
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState<BautagebuchEditorDraft | null>(null)
  const [sendEintrag, setSendEintrag] = useState<AuftragBautagebuchEintrag | null>(null)
  const fotoImportRef = useRef<HTMLInputElement>(null)
  const seenPartnerIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    setRows(eintraege)
  }, [eintraege])

  useEffect(() => {
    let cancelled = false
    const poll = () => {
      void listAuftragBautagebuch(auftragId).then((list) => {
        if (cancelled) return
        setRows(list)
        const neu = list.filter((e) => istPartnerEntwurf(e) && !seenPartnerIds.current.has(e.id))
        for (const e of neu) seenPartnerIds.current.add(e.id)
      })
    }
    poll()
    const id = window.setInterval(poll, BAUTAGEBUCH_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [auftragId])

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const d = new Date(b.datum).getTime() - new Date(a.datum).getTime()
        if (d !== 0) return d
        return (b.sort_order ?? 0) - (a.sort_order ?? 0)
      }),
    [rows]
  )

  const selIds = useMemo(() => Object.keys(sel).filter((k) => sel[k]), [sel])

  const zugewiesenePartner = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const p of positionen) {
      if (!p.handwerker_id) continue
      map.set(p.handwerker_id, {
        id: p.handwerker_id,
        name: p.handwerker?.name?.trim() || 'Partner',
      })
    }
    return Array.from(map.values())
  }, [positionen])

  function toggleSel(id: string) {
    setSel((s) => ({ ...s, [id]: !s[id] }))
  }

  function clearSel() {
    setSel({})
  }

  function requestPartnerBautagebuch(handwerkerId: string, name: string) {
    startTransition(async () => {
      const res = await anfrageHandwerkerBautagebuchEintrag({ auftragId, handwerkerId })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(`Tagebucheintrag an ${name} angefordert.`)
      onChanged()
    })
  }

  function openNew() {
    setDraft(emptyDraft())
  }

  function openEdit(e: AuftragBautagebuchEintrag) {
    setDraft(draftFromEintrag(e))
  }

  function patchDraft(patch: Partial<BautagebuchEditorDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d))
  }

  async function saveDraft() {
    if (!draft?.titel.trim()) {
      toast.error('Bitte einen Titel eingeben.')
      return
    }
    const payload = {
      titel: draft.titel.trim(),
      beschreibung: draft.beschreibung.trim() || null,
      datum: draft.datum || heuteYmd(),
      foto_urls: draft.foto_urls,
    }
    startTransition(async () => {
      if (draft.id) {
        const r = await updateAuftragBautagebuchEintrag({
          auftragId,
          eintragId: draft.id,
          ...payload,
        })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      } else {
        const r = await createAuftragBautagebuchEintrag({
          auftragId,
          ...payload,
        })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      }
      setDraft(null)
      toast.success('Gespeichert')
      onChanged()
    })
  }

  function removeEintrag(id: string) {
    startTransition(async () => {
      const r = await deleteAuftragBautagebuchEintrag({ auftragId, eintragId: id })
      if (!r.ok) toast.error(r.message)
      else {
        setSel((s) => {
          const n = { ...s }
          delete n[id]
          return n
        })
        if (draft?.id === id) setDraft(null)
        onChanged()
      }
    })
  }

  function confirmRemove(e: AuftragBautagebuchEintrag) {
    if (!confirm(`„${e.titel || 'Eintrag'}“ wirklich löschen?`)) return
    removeEintrag(e.id)
  }

  function dupEintrag(e: AuftragBautagebuchEintrag) {
    startTransition(async () => {
      const r = await createAuftragBautagebuchEintrag({
        auftragId,
        titel: `${e.titel || 'Eintrag'} (Kopie)`,
        beschreibung: e.beschreibung ?? null,
        datum: heuteYmd(),
        foto_urls: e.foto_urls ?? [],
      })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Kopie erstellt')
        onChanged()
      }
    })
  }

  function freigebenLive(e: AuftragBautagebuchEintrag) {
    startTransition(async () => {
      const r = await freigebenBautagebuchEintrag({ auftragId, eintragId: e.id })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Eintrag ist auf der Kunden-Projektseite sichtbar.')
        onChanged()
      }
    })
  }

  async function importFotoEntries(files: FileList | null) {
    if (!files?.length) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    startTransition(async () => {
      for (const file of list) {
        try {
          const fd = new FormData()
          fd.set('file', file)
          fd.set('filename', file.name)
          const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
            method: 'POST',
            body: fd,
          })
          const json = (await res.json()) as { url?: string; error?: string }
          if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
          const titel = file.name.replace(/\.[^.]+$/, '') || 'Foto'
          const r = await createAuftragBautagebuchEintrag({
            auftragId,
            titel,
            beschreibung: null,
            datum: heuteYmd(),
            foto_urls: mergeBautagebuchFotoUrls([], [json.url]).slice(0, BAUTAGEBUCH_MAX_FOTOS),
          })
          if (!r.ok) throw new Error(r.message)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Foto-Import fehlgeschlagen')
          return
        }
      }
      toast.success(list.length === 1 ? 'Foto-Eintrag erstellt' : `${list.length} Foto-Einträge erstellt`)
      onChanged()
    })
  }

  function bulkDelete() {
    if (!selIds.length) return
    if (!confirm(`${selIds.length} Eintrag(e) wirklich löschen?`)) return
    startTransition(async () => {
      for (const id of selIds) {
        const r = await deleteAuftragBautagebuchEintrag({ auftragId, eintragId: id })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      }
      clearSel()
      onChanged()
    })
  }

  function bulkCopy() {
    startTransition(async () => {
      for (const id of selIds) {
        const e = rows.find((x) => x.id === id)
        if (!e) continue
        const r = await createAuftragBautagebuchEintrag({
          auftragId,
          titel: `${e.titel || 'Eintrag'} (Kopie)`,
          beschreibung: e.beschreibung ?? null,
          datum: heuteYmd(),
          foto_urls: e.foto_urls ?? [],
        })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      }
      clearSel()
      toast.success('Kopien erstellt')
      onChanged()
    })
  }

  function itemActions(e: AuftragBautagebuchEintrag): ActionsMenuItem[] {
    const items: ActionsMenuItem[] = [
      {
        label: 'Bearbeiten',
        icon: <MockIcon ctx="row" n="pencil" size={16} />,
        onClick: () => openEdit(e),
      },
      {
        label: 'Kopieren',
        icon: <MockIcon ctx="row" n="copy" size={16} />,
        onClick: () => dupEintrag(e),
      },
      {
        label: 'An Kunde versenden',
        icon: <MockIcon ctx="row" n="mail-forward" size={16} />,
        onClick: () => setSendEintrag(e),
      },
    ]
    if (istPartnerEntwurf(e)) {
      items.push({
        label: 'Live stellen',
        icon: <MockIcon ctx="row" n="eye" size={16} />,
        onClick: () => freigebenLive(e),
      })
    }
    items.push('sep', {
      label: 'Löschen',
      icon: <MockIcon ctx="row" n="trash" size={16} />,
      danger: true,
      onClick: () => confirmRemove(e),
    })
    return items
  }

  function statusBadge(e: AuftragBautagebuchEintrag) {
    if (e.an_kunde_gesendet_at || e.fuer_kunde_freigegeben) {
      return (
        <MockBadge kind="aktiv">
          <MockIcon ctx="row" n="check" size={10} /> Aktiv
        </MockBadge>
      )
    }
    return (
      <MockBadge kind="fertig">
        <MockIcon ctx="row" n="file-pencil" size={10} /> Entwurf
      </MockBadge>
    )
  }

  return (
    <>
      <MockCard
        id="auftrag-bautagebuch"
        title={`Bautagebuch · ${sorted.length}`}
        icon="clipboard-list"
        actions={
          <>
            <input
              ref={fotoImportRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(ev) => {
                void importFotoEntries(ev.target.files)
                ev.target.value = ''
              }}
            />
            <MockBtn
              sm
              kind="ghost"
              icon="photo-plus"
              disabled={pending}
              onClick={() => fotoImportRef.current?.click()}
            >
              Foto
            </MockBtn>
            <MockBtn sm kind="primary" icon="plus" disabled={pending} onClick={openNew}>
              Eintrag
            </MockBtn>
          </>
        }
      >
        {zugewiesenePartner.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {zugewiesenePartner.map((hw) => (
              <MockBtn
                key={hw.id}
                sm
                kind="ghost"
                disabled={pending}
                onClick={() => requestPartnerBautagebuch(hw.id, hw.name)}
              >
                Tagebuch einfordern · {hw.name}
              </MockBtn>
            ))}
          </div>
        ) : null}

        {selIds.length > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              marginBottom: 12,
              background: 'var(--green-dark)',
              color: '#fff',
              borderRadius: 10,
            }}
          >
            <MockIcon ctx="row" n="checks" size={16} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>{selIds.length} ausgewählt</span>
            <div style={{ flex: 1 }} />
            {[
              {
                icon: 'mail-forward',
                label: 'An Kunde versenden',
                onClick: () => {
                  const first = rows.find((x) => x.id === selIds[0])
                  if (first) setSendEintrag(first)
                },
              },
              { icon: 'copy', label: 'Kopieren', onClick: bulkCopy },
              { icon: 'trash', label: 'Löschen', onClick: bulkDelete },
            ].map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'rgba(255,255,255,0.16)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <MockIcon ctx="btn" n={a.icon} size={15} />
                {a.label}
              </button>
            ))}
            <button
              type="button"
              onClick={clearSel}
              title="Auswahl aufheben"
              style={{
                display: 'inline-flex',
                padding: 6,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
              }}
            >
              <MockIcon ctx="row" n="x" size={16} />
            </button>
          </div>
        ) : null}

        {sorted.length === 0 ? (
          <MockEmpty
            icon="clipboard-list"
            title="Noch keine Einträge"
            hint="Dokumentiere den Baufortschritt mit Titel, Beschreibung und Fotos."
          />
        ) : (
          <div className="bt-list">
            {sorted.map((e) => {
              const fotos = eintragFotosAnzeige(e)
              const desc = beschreibungPlain(e.beschreibung)
              const selected = Boolean(sel[e.id])
              return (
                <div key={e.id} className={`bt-entry${selected ? ' sel' : ''}`}>
                  <span
                    role="checkbox"
                    aria-checked={selected}
                    tabIndex={0}
                    onClick={() => toggleSel(e.id)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault()
                        toggleSel(e.id)
                      }
                    }}
                  >
                    <span className={`bt-check${selected ? ' on' : ''}`}>
                      {selected ? <MockIcon ctx="row" n="check" size={11} /> : null}
                    </span>
                  </span>
                  <div className="bt-thumb">
                    {fotos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotos[0]} alt="" />
                    ) : (
                      <MockIcon ctx="empty" n="photo" size={22} style={{ color: 'var(--text-4)' }} />
                    )}
                    {fotos.length > 1 ? <span className="count">+{fotos.length - 1}</span> : null}
                  </div>
                  <div
                    className="bt-main"
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(e)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault()
                        openEdit(e)
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="bt-title">
                      {e.titel || '(ohne Titel)'} {statusBadge(e)}
                      {e.handwerker_id ? (
                        <MockBadge kind="plain">
                          Partner{e.handwerker?.name ? ` · ${e.handwerker.name}` : ''}
                        </MockBadge>
                      ) : null}
                    </div>
                    {desc ? <div className="bt-desc">{desc}</div> : null}
                    <div className="bt-meta">
                      {formatDatum(e.datum)}
                      {fotos.length
                        ? ` · ${fotos.length} Foto${fotos.length === 1 ? '' : 's'}`
                        : ''}
                    </div>
                  </div>
                  <div className="bt-act">
                    <ActionsMenu
                      align="right"
                      trigger={
                        <button type="button" className="qa-btn" title="Aktionen">
                          <MockIcon ctx="row" n="dots" size={16} />
                        </button>
                      }
                      items={itemActions(e)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </MockCard>

      <BautagebuchEintragModal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        draft={draft}
        auftragId={auftragId}
        saving={pending}
        onChange={patchDraft}
        onSave={saveDraft}
        onRemove={
          draft?.id
            ? () => {
                const row = rows.find((x) => x.id === draft.id)
                if (row) confirmRemove(row)
              }
            : undefined
        }
      />

      <BautagebuchKundeSendModal
        open={Boolean(sendEintrag)}
        onClose={() => setSendEintrag(null)}
        auftragId={auftragId}
        eintrag={sendEintrag}
        kundeName={kundeName}
        onSent={() => {
          setSendEintrag(null)
          clearSel()
          onChanged()
        }}
      />
    </>
  )
}
