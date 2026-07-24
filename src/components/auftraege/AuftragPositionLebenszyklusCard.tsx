'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockModal } from '@/components/mock-ui/MockModal'
import { toast } from '@/components/ui/app-toast'
import {
  createCrmPositionEintrag,
  deleteCrmEintragFoto,
  listAuftragPositionEintraege,
  listBautagebuchHiddenPositionIds,
  setBautagebuchPositionHidden,
  setWeitereArbeitAnerkennung,
  updateCrmPositionEintrag,
  upsertCrmVorherNachherFoto,
} from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import {
  eintragTypLabel,
  formatZeitMinuten,
  isDokuUeberfaellig,
  lebenszyklusLabel,
  type EintragFoto,
  type EintragQuelle,
  type EintragTyp,
  type PositionEintrag,
} from '@/lib/auftraege/position-lebenszyklus'
import type { AuftragPosition } from '@/lib/types'
import { cn, formatDatumZeit } from '@/lib/utils'

const QUELLE_OPTIONS: { value: EintragQuelle; label: string }[] = [
  { value: 'telefonisch', label: 'Telefonisch' },
  { value: 'foto_erhalten', label: 'Foto erhalten' },
  { value: 'vor_ort', label: 'Vor Ort' },
]

const FREE_KEY = '__ohne_leistung__'

type FormState = {
  mode: 'create' | 'edit'
  /** leer = Eintrag ohne Leistungsbezug */
  positionId: string
  positionName: string
  eintragId?: string
  typ: EintragTyp
  beschreibung: string
  quelle: EintragQuelle
  rueckgrund: string
  ereignisZeit: string
  zeitStd: string
  zeitMin: string
  fotoPath: string
}

function defaultTypForPos(pos: AuftragPosition): EintragTyp {
  if (pos.leistung_status === 'erledigt') return 'weitere_arbeit'
  if (pos.leistung_status === 'in_arbeit' || pos.gestartet_am) return 'fortschritt'
  return 'start'
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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

async function downloadFotoUrl(url: string, filename: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('fetch failed')
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/**
 * Bautagebuch im Leistungen-Tabellenstil: Zeile pro Leistung, Accordion mit Einträgen,
 * Hinzufügen/Bearbeiten im Modal.
 */
export function AuftragPositionLebenszyklusCard({
  auftragId,
  positionen,
  onChanged,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  onChanged?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [eintraege, setEintraege] = useState<PositionEintrag[]>([])
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [form, setForm] = useState<FormState | null>(null)
  const [viewer, setViewer] = useState<{
    label: string
    foto: EintragFoto
    positionId: string
    slot: 'vorher' | 'nachher'
  } | null>(null)

  function reload() {
    startTransition(async () => {
      const [list, hidden] = await Promise.all([
        listAuftragPositionEintraege(auftragId),
        listBautagebuchHiddenPositionIds(auftragId),
      ])
      setEintraege(list)
      setHiddenIds(hidden)
    })
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auftragId])

  const byPos = useMemo(() => {
    const m = new Map<string, PositionEintrag[]>()
    for (const e of eintraege) {
      const key = e.position_id || FREE_KEY
      const arr = m.get(key) ?? []
      arr.push(e)
      m.set(key, arr)
    }
    return m
  }, [eintraege])

  const freeEintraege = byPos.get(FREE_KEY) ?? []
  const freeOpen = openIds.has(FREE_KEY)

  const visiblePositionen = useMemo(
    () => positionen.filter((p) => !hiddenIds.includes(p.id)),
    [positionen, hiddenIds]
  )

  const hiddenPositionen = useMemo(
    () => positionen.filter((p) => hiddenIds.includes(p.id)),
    [positionen, hiddenIds]
  )

  const blocks = useMemo(() => {
    const sorted = [...visiblePositionen].sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        a.leistung_name.localeCompare(b.leistung_name)
    )
    const map = new Map<string, { key: string; gewerkName: string; positionen: AuftragPosition[] }>()
    for (const p of sorted) {
      const key = p.gewerk_name?.trim() || 'Sonstige'
      const cur = map.get(key) ?? { key, gewerkName: key, positionen: [] }
      cur.positionen.push(p)
      map.set(key, cur)
    }
    return Array.from(map.values())
  }, [visiblePositionen])

  function toggleOpen(posId: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(posId)) next.delete(posId)
      else next.add(posId)
      return next
    })
  }

  function openCreate(pos: AuftragPosition) {
    setOpenIds((prev) => new Set(prev).add(pos.id))
    setForm({
      mode: 'create',
      positionId: pos.id,
      positionName: pos.leistung_name,
      typ: defaultTypForPos(pos),
      beschreibung: '',
      quelle: 'telefonisch',
      rueckgrund: '',
      ereignisZeit: '',
      zeitStd: '',
      zeitMin: '',
      fotoPath: '',
    })
  }

  function openEdit(pos: AuftragPosition | null, e: PositionEintrag) {
    const mins = Number(e.zeit_minuten) || 0
    const ohneLeistung = !pos || !e.position_id
    setForm({
      mode: 'edit',
      positionId: pos?.id ?? '',
      positionName: pos?.leistung_name ?? 'Ohne Leistungsbezug',
      eintragId: e.id,
      typ: ohneLeistung ? 'notiz' : (e.typ as EintragTyp) || 'fortschritt',
      beschreibung: e.beschreibung?.trim() || '',
      quelle: (e.quelle as EintragQuelle) || 'telefonisch',
      rueckgrund: e.rueckdatiert_grund?.trim() || '',
      ereignisZeit: toDatetimeLocal(e.ereignis_zeit || e.created_at),
      zeitStd: mins >= 60 ? String(Math.floor(mins / 60)) : '',
      zeitMin: mins % 60 ? String(mins % 60) : mins > 0 && mins < 60 ? String(mins) : '',
      fotoPath: '',
    })
  }

  function openCreateFrei() {
    setOpenIds((prev) => new Set(prev).add(FREE_KEY))
    setForm({
      mode: 'create',
      positionId: '',
      positionName: 'Ohne Leistungsbezug',
      typ: 'notiz',
      beschreibung: '',
      quelle: 'telefonisch',
      rueckgrund: '',
      ereignisZeit: '',
      zeitStd: '',
      zeitMin: '',
      fotoPath: '',
    })
  }

  function hidePosition(posId: string) {
    startTransition(async () => {
      const r = await setBautagebuchPositionHidden({
        auftragId,
        positionId: posId,
        hidden: true,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Leistung aus Bautagebuch entfernt')
      setHiddenIds((prev) => (prev.includes(posId) ? prev : [...prev, posId]))
      setOpenIds((prev) => {
        const next = new Set(prev)
        next.delete(posId)
        return next
      })
    })
  }

  function showPosition(posId: string) {
    startTransition(async () => {
      const r = await setBautagebuchPositionHidden({
        auftragId,
        positionId: posId,
        hidden: false,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Leistung wieder im Bautagebuch')
      setHiddenIds((prev) => prev.filter((id) => id !== posId))
    })
  }

  function patchForm(patch: Partial<FormState>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function submitForm() {
    if (!form) return
    if (form.ereignisZeit && !form.rueckgrund.trim()) {
      toast.error('Bei Rückdatierung ist ein Grund Pflicht.')
      return
    }
    startTransition(async () => {
      const payload = {
        typ: form.typ,
        beschreibung: form.beschreibung,
        quelle: form.quelle,
        rueckdatiertGrund: form.rueckgrund || null,
        ereignisZeit: form.ereignisZeit ? new Date(form.ereignisZeit).toISOString() : null,
        zeitStd: form.zeitStd ? Number(form.zeitStd) : null,
        zeitMin: form.zeitMin ? Number(form.zeitMin) : null,
        fotoStoragePath: form.fotoPath.trim() || null,
      }
      const r =
        form.mode === 'edit' && form.eintragId
          ? await updateCrmPositionEintrag({ eintragId: form.eintragId, ...payload })
          : await createCrmPositionEintrag({
              positionId: form.positionId || null,
              auftragId,
              ...payload,
              typ: form.positionId ? form.typ : 'notiz',
            })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(form.mode === 'edit' ? 'Eintrag aktualisiert' : 'Eintrag erstellt')
      setForm(null)
      reload()
      onChanged?.()
    })
  }

  function pruefen(posId: string, status: 'anerkannt' | 'abgelehnt' | 'in_pruefung') {
    startTransition(async () => {
      const r = await setWeitereArbeitAnerkennung({ positionId: posId, status })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success(
          status === 'anerkannt'
            ? 'Anerkannt'
            : status === 'abgelehnt'
              ? 'Abgelehnt'
              : 'Rückfrage gesetzt'
        )
        onChanged?.()
      }
    })
  }

  function saveSlotFoto(positionId: string, slot: 'vorher' | 'nachher', file: File) {
    startTransition(async () => {
      const url = await uploadTimelineFoto(auftragId, file)
      if (!url) return
      const r = await upsertCrmVorherNachherFoto({ positionId, slot, storagePath: url })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(slot === 'vorher' ? 'Vorher-Foto gespeichert' : 'Nachher-Foto gespeichert')
      setViewer(null)
      setOpenIds((prev) => new Set(prev).add(positionId))
      reload()
      onChanged?.()
    })
  }

  function deleteSlotFoto(fotoId: string) {
    if (!window.confirm('Foto wirklich löschen?')) return
    startTransition(async () => {
      const r = await deleteCrmEintragFoto({ fotoId })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Foto gelöscht')
      setViewer(null)
      reload()
      onChanged?.()
    })
  }

  const ohneLeistung = Boolean(form && !form.positionId)

  return (
    <>
      <div className="pos-v3">
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1 }}>
            Bautagebuch
            {visiblePositionen.length
              ? ` · ${visiblePositionen.length} Leistung${visiblePositionen.length === 1 ? '' : 'en'}`
              : ''}
            {hiddenPositionen.length
              ? ` · ${hiddenPositionen.length} ausgeblendet`
              : ''}
          </span>
          <MockBtn type="button" kind="ghost" sm disabled={pending} onClick={reload}>
            Aktualisieren
          </MockBtn>
        </div>

        <div className="postable2">
          {!visiblePositionen.length && !freeEintraege.length ? (
            <div style={{ padding: 24 }}>
              <MockEmpty
                title={positionen.length ? 'Keine Leistungen sichtbar' : 'Noch keine Einträge'}
                hint={
                  positionen.length
                    ? 'Leistungen unten wieder einblenden oder Eintrag ohne Leistung hinzufügen.'
                    : 'Unten Einträge ohne Leistungsbezug anlegen — oder Leistungen im Auftrag.'
                }
              />
            </div>
          ) : null}

          {blocks.map((block) => (
            <div key={block.key}>
              <div className="pt2-sub">
                <span className="g">{block.gewerkName}</span>
                <span className="gt">· {block.positionen.length}</span>
              </div>

              {block.positionen.map((pos) => {
                const rows = byPos.get(pos.id) ?? []
                const open = openIds.has(pos.id)
                const lastAt =
                  rows.length > 0
                    ? rows[rows.length - 1]?.ereignis_zeit || rows[rows.length - 1]?.created_at
                    : null
                const ueberfaellig = isDokuUeberfaellig({
                  leistungStatus: pos.leistung_status,
                  gestartetAm: pos.gestartet_am,
                  letzterEintragAt: lastAt,
                })
                const startFoto = rows.find((e) => e.typ === 'start')?.eintrag_fotos?.[0]
                const ergebnisFoto = [...rows]
                  .reverse()
                  .find((e) => e.typ === 'ergebnis')?.eintrag_fotos?.[0]
                const inPruefung = pos.anerkennung_status === 'in_pruefung'

                return (
                  <div key={pos.id}>
                    <div
                      className={cn('pt2-row', 'bt-pos-row', open && 'bt-pos-row--open')}
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      onClick={() => toggleOpen(pos.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleOpen(pos.id)
                        }
                      }}
                    >
                      <div className="pt2-main">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className="pt-name">{pos.leistung_name}</span>
                          <MockBadge kind={pos.leistung_status === 'erledigt' ? 'done' : 'order'}>
                            {lebenszyklusLabel(pos.leistung_status)}
                          </MockBadge>
                          {ueberfaellig ? (
                            <MockBadge kind="cancel">Doku überfällig</MockBadge>
                          ) : null}
                          {inPruefung ? (
                            <MockBadge kind="offer">Prüfung</MockBadge>
                          ) : null}
                        </div>
                        <div className="pt-desc">
                          {rows.length === 0
                            ? 'Noch keine Einträge'
                            : `${rows.length} Eintrag${rows.length === 1 ? '' : 'e'}`}
                        </div>
                      </div>
                      <div className="pt2-act" onClick={(e) => e.stopPropagation()}>
                        <MockBtn
                          type="button"
                          sm
                          kind="ghost"
                          disabled={pending}
                          title="Nur aus dem Bautagebuch entfernen — Leistung bleibt im Auftrag"
                          onClick={() => hidePosition(pos.id)}
                        >
                          Entfernen
                        </MockBtn>
                        <MockBtn
                          type="button"
                          sm
                          kind="primary"
                          icon="plus"
                          disabled={pending}
                          onClick={() => openCreate(pos)}
                        >
                          Hinzufügen
                        </MockBtn>
                      </div>
                      <div className="bt-chevron" aria-hidden>
                        <ChevronDown
                          size={16}
                          style={{
                            transition: 'transform .15s ease',
                            transform: open ? 'rotate(180deg)' : undefined,
                            color: 'var(--text-3)',
                          }}
                        />
                      </div>
                    </div>

                    {open ? (
                      <div className="bt-accordion">
                        <div className="bt-accordion__fotos">
                          <FotoSlot
                            label="Vorher"
                            foto={startFoto ?? null}
                            disabled={pending}
                            onUpload={(file) => saveSlotFoto(pos.id, 'vorher', file)}
                            onOpen={
                              startFoto
                                ? () =>
                                    setViewer({
                                      label: 'Vorher',
                                      foto: startFoto,
                                      positionId: pos.id,
                                      slot: 'vorher',
                                    })
                                : undefined
                            }
                          />
                          <FotoSlot
                            label="Nachher"
                            foto={ergebnisFoto ?? null}
                            disabled={pending}
                            onUpload={(file) => saveSlotFoto(pos.id, 'nachher', file)}
                            onOpen={
                              ergebnisFoto
                                ? () =>
                                    setViewer({
                                      label: 'Nachher',
                                      foto: ergebnisFoto,
                                      positionId: pos.id,
                                      slot: 'nachher',
                                    })
                                : undefined
                            }
                          />
                        </div>

                        {rows.length === 0 ? (
                          <p className="bt-accordion__empty">
                            Noch keine Einträge — „Hinzufügen“ neben der Leistung nutzen.
                          </p>
                        ) : (
                          <ul className="bt-eintrag-list">
                            {rows.map((e) => (
                              <li key={e.id}>
                                <button
                                  type="button"
                                  className="bt-eintrag-row"
                                  disabled={pending}
                                  onClick={() => openEdit(pos, e)}
                                >
                                  <div className="bt-eintrag-row__top">
                                    <span className="bt-eintrag-row__typ">
                                      {eintragTypLabel(e.typ)}
                                    </span>
                                    <span className="bt-eintrag-row__meta">
                                      {e.ereignis_zeit || e.created_at
                                        ? formatDatumZeit(
                                            String(e.ereignis_zeit || e.created_at)
                                          )
                                        : '—'}
                                      {' · '}
                                      {e.erfasst_von === 'crm_intern' ? 'CRM' : 'Partner'}
                                      {e.zeit_minuten
                                        ? ` · ${formatZeitMinuten(e.zeit_minuten)}`
                                        : ''}
                                    </span>
                                  </div>
                                  {e.beschreibung ? (
                                    <p className="bt-eintrag-row__text">{e.beschreibung}</p>
                                  ) : (
                                    <p className="bt-eintrag-row__text bt-eintrag-row__text--muted">
                                      Tippen zum Bearbeiten
                                    </p>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {inPruefung ? (
                          <div className="bt-accordion__actions">
                            <MockBtn
                              type="button"
                              sm
                              kind="primary"
                              disabled={pending}
                              onClick={() => pruefen(pos.id, 'anerkannt')}
                            >
                              Anerkennen
                            </MockBtn>
                            <MockBtn
                              type="button"
                              sm
                              kind="ghost"
                              disabled={pending}
                              onClick={() => pruefen(pos.id, 'in_pruefung')}
                            >
                              Rückfrage
                            </MockBtn>
                            <MockBtn
                              type="button"
                              sm
                              kind="danger"
                              disabled={pending}
                              onClick={() => pruefen(pos.id, 'abgelehnt')}
                            >
                              Ablehnen
                            </MockBtn>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}

          <div className="pt2-sub" style={{ marginTop: blocks.length ? 8 : 0 }}>
            <span className="g">Ohne Leistungsbezug</span>
            <span className="gt">
              · {freeEintraege.length || 'frei'}
            </span>
          </div>

          <div>
            <div
              className={cn('pt2-row', 'bt-pos-row', freeOpen && 'bt-pos-row--open')}
              role="button"
              tabIndex={0}
              aria-expanded={freeOpen}
              onClick={() => toggleOpen(FREE_KEY)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleOpen(FREE_KEY)
                }
              }}
            >
              <div className="pt2-main">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="pt-name">Allgemeine Einträge</span>
                  <MockBadge kind="order">ohne Leistung</MockBadge>
                </div>
                <div className="pt-desc">
                  {freeEintraege.length === 0
                    ? 'Notizen & Updates ohne Positionsbezug'
                    : `${freeEintraege.length} Eintrag${freeEintraege.length === 1 ? '' : 'e'}`}
                </div>
              </div>
              <div className="pt2-act" onClick={(e) => e.stopPropagation()}>
                <MockBtn
                  type="button"
                  sm
                  kind="primary"
                  icon="plus"
                  disabled={pending}
                  onClick={openCreateFrei}
                >
                  Hinzufügen
                </MockBtn>
              </div>
              <div className="bt-chevron" aria-hidden>
                <ChevronDown
                  size={16}
                  style={{
                    transition: 'transform .15s ease',
                    transform: freeOpen ? 'rotate(180deg)' : undefined,
                    color: 'var(--text-3)',
                  }}
                />
              </div>
            </div>

            {freeOpen ? (
              <div className="bt-accordion">
                {freeEintraege.length === 0 ? (
                  <p className="bt-accordion__empty">
                    Noch keine freien Einträge — „Hinzufügen“ nutzen.
                  </p>
                ) : (
                  <ul className="bt-eintrag-list">
                    {freeEintraege.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          className="bt-eintrag-row"
                          disabled={pending}
                          onClick={() => openEdit(null, e)}
                        >
                          <div className="bt-eintrag-row__top">
                            <span className="bt-eintrag-row__typ">
                              {eintragTypLabel(e.typ)}
                            </span>
                            <span className="bt-eintrag-row__meta">
                              {e.ereignis_zeit || e.created_at
                                ? formatDatumZeit(String(e.ereignis_zeit || e.created_at))
                                : '—'}
                              {' · '}
                              {e.erfasst_von === 'crm_intern' ? 'CRM' : 'Partner'}
                              {e.zeit_minuten ? ` · ${formatZeitMinuten(e.zeit_minuten)}` : ''}
                            </span>
                          </div>
                          {e.beschreibung ? (
                            <p className="bt-eintrag-row__text">{e.beschreibung}</p>
                          ) : (
                            <p className="bt-eintrag-row__text bt-eintrag-row__text--muted">
                              Tippen zum Bearbeiten
                            </p>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          {hiddenPositionen.length ? (
            <div className="bt-hidden-leistungen">
              <div className="pt2-sub">
                <span className="g">Ausgeblendete Leistungen</span>
                <span className="gt">· {hiddenPositionen.length}</span>
              </div>
              <ul className="bt-hidden-leistungen__list">
                {hiddenPositionen.map((pos) => (
                  <li key={pos.id} className="bt-hidden-leistungen__item">
                    <span>{pos.leistung_name}</span>
                    <MockBtn
                      type="button"
                      sm
                      kind="ghost"
                      disabled={pending}
                      onClick={() => showPosition(pos.id)}
                    >
                      Wieder einblenden
                    </MockBtn>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <MockModal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        icon="clipboard-list"
        title={form?.mode === 'edit' ? 'Eintrag bearbeiten' : 'Eintrag hinzufügen'}
        sub={form?.positionName}
        footer={
          <>
            <MockBtn type="button" kind="ghost" disabled={pending} onClick={() => setForm(null)}>
              Abbrechen
            </MockBtn>
            <MockBtn type="button" kind="primary" disabled={pending} onClick={submitForm}>
              Speichern
            </MockBtn>
          </>
        }
      >
        {form ? (
          <div className="space-y-3">
            {ohneLeistung ? (
              <p className="text-[12px] text-bw-text-muted">
                Freier Bautagebuch-Eintrag ohne Bezug zu einer Leistung.
              </p>
            ) : (
              <label className="block text-[12px] font-medium text-bw-text">
                Typ
                <select
                  className="mt-1 w-full rounded-md border border-bw-border px-3 py-2 text-[13px]"
                  value={form.typ}
                  onChange={(e) => patchForm({ typ: e.target.value as EintragTyp })}
                >
                  <option value="start">Start</option>
                  <option value="fortschritt">Fortschritt</option>
                  <option value="ergebnis">Ergebnis / Erledigt</option>
                  <option value="weitere_arbeit">Weitere Arbeit</option>
                </select>
              </label>
            )}

            <label className="block text-[12px] font-medium text-bw-text">
              Beschreibung
              <textarea
                className="mt-1 w-full rounded-md border border-bw-border px-3 py-2 text-[13px]"
                rows={3}
                placeholder="Was wurde gemacht?"
                value={form.beschreibung}
                onChange={(e) => patchForm({ beschreibung: e.target.value })}
                autoFocus
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-[12px] font-medium text-bw-text">
                Quelle
                <select
                  className="mt-1 w-full rounded-md border border-bw-border px-3 py-2 text-[13px]"
                  value={form.quelle}
                  onChange={(e) => patchForm({ quelle: e.target.value as EintragQuelle })}
                >
                  {QUELLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[12px] font-medium text-bw-text">
                Ereigniszeit
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-md border border-bw-border px-3 py-2 text-[13px]"
                  value={form.ereignisZeit}
                  onChange={(e) => patchForm({ ereignisZeit: e.target.value })}
                />
              </label>
            </div>

            {form.ereignisZeit ? (
              <label className="block text-[12px] font-medium text-bw-text">
                Grund für Rückdatierung
                <input
                  className="mt-1 w-full rounded-md border border-bw-border px-3 py-2 text-[13px]"
                  value={form.rueckgrund}
                  onChange={(e) => patchForm({ rueckgrund: e.target.value })}
                />
              </label>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[12px] font-medium text-bw-text">
                Stunden
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-md border border-bw-border px-3 py-2 text-[13px]"
                  value={form.zeitStd}
                  onChange={(e) => patchForm({ zeitStd: e.target.value })}
                />
              </label>
              <label className="block text-[12px] font-medium text-bw-text">
                Minuten
                <input
                  type="number"
                  min={0}
                  max={59}
                  className="mt-1 w-full rounded-md border border-bw-border px-3 py-2 text-[13px]"
                  value={form.zeitMin}
                  onChange={(e) => patchForm({ zeitMin: e.target.value })}
                />
              </label>
            </div>

            <div>
              <p className="mb-1 text-[12px] font-medium text-bw-text">
                Foto {form.mode === 'edit' ? '(optional ersetzen)' : '(optional)'}
              </p>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-[12px]"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  void uploadTimelineFoto(auftragId, f).then((url) => {
                    if (url) {
                      patchForm({ fotoPath: url })
                      toast.success('Foto hochgeladen')
                    }
                  })
                }}
              />
              {form.fotoPath ? (
                <p className="mt-1 text-[12px] text-emerald-800">Foto bereit</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </MockModal>

      <MockModal
        open={Boolean(viewer)}
        onClose={() => setViewer(null)}
        icon="photo"
        title={viewer ? `${viewer.label}-Foto` : 'Foto'}
        footer={
          viewer ? (
            <>
              <MockBtn type="button" kind="ghost" disabled={pending} onClick={() => setViewer(null)}>
                Schließen
              </MockBtn>
              <MockBtn
                type="button"
                kind="ghost"
                icon="download"
                disabled={pending || !viewer.foto.display_url}
                onClick={() => {
                  const url = viewer.foto.display_url
                  if (!url) return
                  void downloadFotoUrl(url, `${viewer.slot}-${viewer.foto.id.slice(0, 8)}.jpg`)
                }}
              >
                Herunterladen
              </MockBtn>
              <label className="btn sm ghost inline-flex cursor-pointer items-center gap-1">
                Ändern
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={pending}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f && viewer) saveSlotFoto(viewer.positionId, viewer.slot, f)
                  }}
                />
              </label>
              <MockBtn
                type="button"
                kind="danger"
                icon="trash"
                disabled={pending}
                onClick={() => deleteSlotFoto(viewer.foto.id)}
              >
                Löschen
              </MockBtn>
            </>
          ) : null
        }
      >
        {viewer?.foto.display_url ? (
          <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-md bg-bw-surface-2 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewer.foto.display_url}
              alt={viewer.label}
              className="max-h-[65vh] max-w-full object-contain"
            />
          </div>
        ) : (
          <p className="text-sm text-bw-text-muted">Kein Vorschaubild verfügbar.</p>
        )}
      </MockModal>
    </>
  )
}

function FotoSlot({
  label,
  foto,
  disabled,
  onUpload,
  onOpen,
}: {
  label: string
  foto?: EintragFoto | null
  disabled?: boolean
  onUpload: (file: File) => void
  onOpen?: () => void
}) {
  const url = foto?.display_url
  const inputId = `bt-foto-${label}-${foto?.id ?? 'empty'}`

  if (url) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        title={`${label} — ansehen / bearbeiten`}
        className="bt-foto-slot bt-foto-slot--filled"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} />
        <span>{label}</span>
      </button>
    )
  }

  return (
    <label htmlFor={inputId} title={`${label} hochladen`} className="bt-foto-slot bt-foto-slot--empty">
      <strong>{label}</strong>
      <em>Hochladen</em>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onUpload(f)
        }}
      />
    </label>
  )
}
