'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockModal } from '@/components/mock-ui/MockModal'
import { WerkzeugPanel } from '@/components/crm/WerkzeugPanel'
import { VorOrtPortalHinweis } from '@/components/auftraege/AuftragVorOrtPanel'
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
import { heuteYmd } from '@/lib/angebot-einfach'
import { downloadPdfFromBase64 } from '@/lib/download-pdf-base64'
import type { AuftragPosition, Gewerk } from '@/lib/types'
import { cn, formatDatumZeit } from '@/lib/utils'

type GewerkOpt = Pick<Gewerk, 'id' | 'name' | 'slug'>

/** Bestehende Abnahme-Status beibehalten, fehlende Leistungen aus Auftrag ergänzen. */
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
    // Mangel gewinnt vor ok vor offen
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

function abnahmeLabelForLeistung(punkte: AbnahmePunkt[]): {
  label: string
  kind: string
} {
  if (!punkte.length) return { label: '—', kind: 'fertig' }
  if (punkte.some((p) => p.status === 'mangel')) return { label: 'Mangel', kind: 'cancel' }
  if (leistungFuerAbnahmeAusgewaehlt(punkte)) return { label: 'OK', kind: 'aktiv' }
  return { label: 'Offen', kind: 'warten' }
}

/**
 * Eine Leistungstabelle = Quelle für Tagebuch + Abnahme.
 * Leistungen hier CRUD — dürfen vom Angebot abweichen.
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
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [leistungForm, setLeistungForm] = useState<{
    mode: 'create' | 'edit'
    id?: string
    name: string
    beschreibung: string
    gewerkSlug: string
  } | null>(null)
  const [tagebuchForm, setTagebuchForm] = useState<{
    positionId: string
    positionName: string
    text: string
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
        // Immer Auftragspositionen — nicht Angebot (kann abweichen)
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
  const dokuCount = eintraege.filter((e) => e.position_id).length

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
                  gewerke.find((g) => g.slug === leistungForm.gewerkSlug)?.name ??
                  undefined,
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
      onChanged?.()
    })
  }

  function saveTagebuch() {
    if (!tagebuchForm) return
    const text = tagebuchForm.text.trim()
    if (!text) {
      toast.error('Kurzbeschreibung fehlt.')
      return
    }
    startTransition(async () => {
      const r = await createCrmPositionEintrag({
        auftragId,
        positionId: tagebuchForm.positionId,
        typ: 'fortschritt',
        beschreibung: text,
        quelle: 'vor_ort',
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Tagebuch-Eintrag gespeichert')
      setTagebuchForm(null)
      const list = await listAuftragPositionEintraege(auftragId)
      setEintraege(list)
      onChanged?.()
    })
  }

  return (
    <WerkzeugPanel
      title="Leistungen vor Ort"
      icon="list-details"
      purpose="Eine Tabelle steuert alles: Leistungen (auch abweichend vom Angebot) → Tagebuch-Einträge → Abnahme-Checkliste. Der Abschlussbericht unten fasst das zusammen."
      framed
      actions={
        <div className="werkzeug-panel__actions">
          <MockBtn
            sm
            kind="ghost"
            icon="file-text"
            disabled={pending || statistik.ok + statistik.mangel === 0}
            onClick={persistAbnahmePdf}
          >
            Abnahme-PDF
          </MockBtn>
          <MockBtn
            sm
            kind="primary"
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

      {loading ? (
        <p className="text-sm text-bw-text-muted py-3">Lädt Leistungen…</p>
      ) : sorted.length === 0 ? (
        <MockEmpty
          icon="list-details"
          title="Noch keine Leistungen"
          hint="Leistung hinzufügen — unabhängig vom ursprünglichen Angebot."
        />
      ) : (
        <div className="vor-ort-table">
          <div className="vor-ort-table__head">
            <div>Leistung</div>
            <div>Tagebuch</div>
            <div>Abnahme</div>
            <div />
          </div>
          {sorted.map((pos) => {
            const rows = byPos.get(pos.id) ?? []
            const abn = punkteByLeistung.get(pos.id) ?? []
            const abnUi = abnahmeLabelForLeistung(abn)
            const open = openIds.has(pos.id)
            return (
              <div key={pos.id} className={cn('vor-ort-table__block', open && 'is-open')}>
                <div
                  className="vor-ort-table__row"
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
                  <div className="vor-ort-table__leistung">
                    <span className="vor-ort-table__name">{pos.leistung_name}</span>
                    <span className="vor-ort-table__meta">
                      {pos.gewerk_name}
                      {' · '}
                      <MockBadge kind={pos.leistung_status === 'erledigt' ? 'done' : 'order'}>
                        {lebenszyklusLabel(pos.leistung_status)}
                      </MockBadge>
                    </span>
                  </div>
                  <div className="vor-ort-table__tagebuch">
                    {rows.length === 0 ? 'Keine Einträge' : `${rows.length} Eintrag${rows.length === 1 ? '' : 'e'}`}
                  </div>
                  <div className="vor-ort-table__abnahme">
                    <MockBadge kind={abnUi.kind}>{abnUi.label}</MockBadge>
                  </div>
                  <div
                    className="vor-ort-table__actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MockBtn
                      sm
                      kind="ghost"
                      icon="pencil"
                      title="Bearbeiten"
                      disabled={pending}
                      onClick={() =>
                        setLeistungForm({
                          mode: 'edit',
                          id: pos.id,
                          name: pos.leistung_name,
                          beschreibung: pos.beschreibung ?? '',
                          gewerkSlug: pos.gewerk_slug ?? gewerke[0]?.slug ?? '',
                        })
                      }
                    />
                    <MockBtn
                      sm
                      kind="ghost"
                      icon="trash"
                      title="Entfernen"
                      disabled={pending}
                      onClick={() => removeLeistung(pos)}
                    />
                    <ChevronDown
                      size={16}
                      className={cn('vor-ort-table__chev', open && 'is-open')}
                      aria-hidden
                    />
                  </div>
                </div>

                {open ? (
                  <div className="vor-ort-table__detail">
                    <div className="vor-ort-table__detail-col">
                      <div className="vor-ort-table__detail-h">Tagebuch</div>
                      {rows.length === 0 ? (
                        <p className="vor-ort-table__empty">Noch keine Einträge (Portal oder CRM).</p>
                      ) : (
                        <ul className="vor-ort-table__eintraege">
                          {rows.map((e) => (
                            <li key={e.id}>
                              <strong>{eintragTypLabel(e.typ)}</strong>
                              <span>
                                {e.ereignis_zeit || e.created_at
                                  ? formatDatumZeit(String(e.ereignis_zeit || e.created_at))
                                  : '—'}
                                {' · '}
                                {e.erfasst_von === 'crm_intern' ? 'CRM' : 'Partner'}
                              </span>
                              {e.beschreibung ? <p>{e.beschreibung}</p> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                      <MockBtn
                        sm
                        kind="primary"
                        icon="plus"
                        disabled={pending}
                        onClick={() =>
                          setTagebuchForm({
                            positionId: pos.id,
                            positionName: pos.leistung_name,
                            text: '',
                          })
                        }
                      >
                        Eintrag
                      </MockBtn>
                    </div>
                    <div className="vor-ort-table__detail-col">
                      <div className="vor-ort-table__detail-h">Abnahme</div>
                      <div className="vor-ort-table__abn-btns" role="group" aria-label="Abnahme">
                        {(
                          [
                            ['offen', 'Nicht relevant'],
                            ['ok', 'OK'],
                            ['mangel', 'Mangel'],
                          ] as const
                        ).map(([st, lbl]) => {
                          const active =
                            st === 'offen'
                              ? !leistungFuerAbnahmeAusgewaehlt(abn) &&
                                !abn.some((p) => p.status === 'mangel')
                              : st === 'mangel'
                                ? abn.some((p) => p.status === 'mangel')
                                : leistungFuerAbnahmeAusgewaehlt(abn) &&
                                  !abn.some((p) => p.status === 'mangel')
                          return (
                            <button
                              key={st}
                              type="button"
                              className={cn('werkzeug-tile', active && 'is-on')}
                              disabled={pending}
                              onClick={() => setAbnahmeStatus(pos.id, st)}
                            >
                              <span className="werkzeug-tile__lbl">{lbl}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

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
          <div className="form-grid form-grid--sheet">
            <label className="field full">
              <span className="field-label">Name</span>
              <input
                className="txt"
                value={leistungForm.name}
                onChange={(e) => setLeistungForm({ ...leistungForm, name: e.target.value })}
                placeholder="z. B. Fliesen Bad"
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
                placeholder="Optional"
              />
            </label>
            {gewerke.length ? (
              <label className="field full">
                <span className="field-label">Gewerk</span>
                <select
                  className="txt"
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

      <MockModal
        open={Boolean(tagebuchForm)}
        onClose={() => setTagebuchForm(null)}
        icon="clipboard-list"
        title="Tagebuch-Eintrag"
        sub={tagebuchForm?.positionName}
        footer={
          <>
            <MockBtn kind="ghost" onClick={() => setTagebuchForm(null)} disabled={pending}>
              Abbrechen
            </MockBtn>
            <MockBtn kind="primary" onClick={saveTagebuch} disabled={pending}>
              Speichern
            </MockBtn>
          </>
        }
      >
        {tagebuchForm ? (
          <label className="field full">
            <span className="field-label">Was ist passiert?</span>
            <textarea
              className="txt"
              rows={4}
              value={tagebuchForm.text}
              onChange={(e) => setTagebuchForm({ ...tagebuchForm, text: e.target.value })}
              placeholder="Kurzbeschreibung (Partner macht das meist im Portal)"
              autoFocus
            />
          </label>
        ) : null}
      </MockModal>
    </WerkzeugPanel>
  )
}
