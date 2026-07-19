'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Check, Clock, Plus } from 'lucide-react'
import { AbnahmeprotokollChecklist } from '@/components/auftraege/AbnahmeprotokollChecklist'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/app-toast'
import {
  loadAbnahmeprotokollSummary,
  saveAbnahmeprotokollDraft,
  saveAbnahmeprotokollPdfOnly,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import {
  abnahmePunkteStatistik,
  buildAbnahmePunkteInitial,
  gruppiereAbnahmePunkte,
  leistungFuerAbnahmeAusgewaehlt,
  maengelAusPunkten,
  neuerAbnahmePunktFreitext,
  notizenFuerLeistung,
  setNotizenFuerLeistung,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { heuteYmd } from '@/lib/angebot-einfach'
import { downloadPdfFromBase64 } from '@/lib/download-pdf-base64'
import { looksLikeHtml, richTextToPlain } from '@/lib/rich-text'
import type { AngebotPosition, AuftragPosition, Gewerk } from '@/lib/types'
import { cn } from '@/lib/utils'

function sanitizePunkte(punkte: AbnahmePunkt[]): AbnahmePunkt[] {
  return punkte.map((p) => {
    const raw = p.beschreibung ?? ''
    if (!raw || !looksLikeHtml(raw)) return p
    return { ...p, beschreibung: richTextToPlain(raw) }
  })
}

function leistungHatMangel(punkte: AbnahmePunkt[]): boolean {
  return punkte.some((p) => p.status === 'mangel')
}

function leistungSubtitle(leistungName: string, punkte: AbnahmePunkt[]): string {
  const lines = punkte
    .map((p) => p.beschreibung?.trim())
    .filter((t): t is string => Boolean(t) && t !== leistungName.trim())
  if (!lines.length) return ''
  if (lines.length === 1) return lines[0]!
  return lines.join(' · ')
}

function metaNotizen(opts: {
  abnehmerName: string
  frei?: string
}): string | null {
  const parts = [
    opts.abnehmerName.trim() ? `Abnehmender: ${opts.abnehmerName.trim()}` : null,
    opts.frei?.trim() || null,
  ].filter(Boolean)
  return parts.length ? parts.join('\n') : null
}

export function AuftragAbnahmeprotokollInline({
  auftragId,
  positionen,
  angebotPositionen,
  gewerke = [],
  kundeName,
  onChanged,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  angebotPositionen?: AngebotPosition[] | null
  gewerke?: Pick<Gewerk, 'id' | 'name' | 'slug'>[]
  kundeName: string
  onChanged?: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [punkte, setPunkte] = useState<AbnahmePunkt[]>([])
  const [abnahmeDatum, setAbnahmeDatum] = useState(heuteYmd())
  const [abnehmerName, setAbnehmerName] = useState(kundeName)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [dirty, setDirty] = useState(false)
  const baselineRef = useRef<{
    punkte: AbnahmePunkt[]
    abnahmeDatum: string
    abnehmerName: string
  } | null>(null)

  const blocks = useMemo(() => gruppiereAbnahmePunkte(punkte), [punkte])
  const leistungen = useMemo(
    () => blocks.flatMap((b) => b.leistungen.map((l) => ({ ...l, gewerk: b.gewerk }))),
    [blocks]
  )
  const ausgewaehltCount = useMemo(
    () => leistungen.filter((l) => leistungFuerAbnahmeAusgewaehlt(l.punkte)).length,
    [leistungen]
  )
  const gesamtLeistungen = leistungen.length
  const statistik = useMemo(() => abnahmePunkteStatistik(punkte), [punkte])
  const statusLabel = pdfUrl ? 'PDF erstellt' : ausgewaehltCount > 0 ? 'Bereit' : 'Offen'
  const statusKind = pdfUrl ? 'aktiv' : ausgewaehltCount > 0 ? 'aktiv' : 'warten'

  const reload = useCallback(async () => {
    setLoading(true)
    const saved = await loadAbnahmeprotokollSummary(auftragId)
    if (saved?.punkte.length) {
      setPunkte(sanitizePunkte(saved.punkte))
      setAbnahmeDatum(saved.abnahme_datum?.slice(0, 10) || heuteYmd())
      setPdfUrl(saved.pdf_url)
    } else {
      const initial = buildAbnahmePunkteInitial({
        positionen,
        angebotPositionen,
        gewerke,
      })
      setPunkte(sanitizePunkte(initial))
      setAbnahmeDatum(heuteYmd())
      setPdfUrl(null)
    }
    setAbnehmerName(kundeName)
    setDirty(false)
    setLoading(false)
    const nextPunkte = sanitizePunkte(
      saved?.punkte.length
        ? saved.punkte
        : buildAbnahmePunkteInitial({ positionen, angebotPositionen, gewerke })
    )
    const nextDatum = saved?.abnahme_datum?.slice(0, 10) || heuteYmd()
    baselineRef.current = {
      punkte: structuredClone(nextPunkte),
      abnahmeDatum: nextDatum,
      abnehmerName: kundeName,
    }
  }, [auftragId, positionen, angebotPositionen, gewerke, kundeName])

  useEffect(() => {
    void reload()
  }, [reload])

  function captureBaseline() {
    baselineRef.current = {
      punkte: structuredClone(punkte),
      abnahmeDatum,
      abnehmerName,
    }
  }

  function abbrechen() {
    const b = baselineRef.current
    if (!b) return
    setPunkte(structuredClone(b.punkte))
    setAbnahmeDatum(b.abnahmeDatum)
    setAbnehmerName(b.abnehmerName)
    setDirty(false)
    setEditMode(false)
  }

  function patchPunkte(next: AbnahmePunkt[]) {
    setPunkte(next)
    setDirty(true)
  }

  function persist(opts?: { regeneratePdf?: boolean }) {
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const r = await saveAbnahmeprotokollDraft({
          auftragId,
          abnahmeDatum: abnahmeDatum || heuteYmd(),
          punkte,
          maengel: maengelAusPunkten(punkte),
          notizen: metaNotizen({ abnehmerName }),
          regeneratePdf: opts?.regeneratePdf,
        })
        if (!r.ok) {
          toast.error(r.message)
          resolve(false)
          return
        }
        setDirty(false)
        captureBaseline()
        onChanged?.()
        resolve(true)
      })
    })
  }

  function toggleLeistung(leistungId: string, current: AbnahmePunkt[]) {
    const nextSelected = !leistungFuerAbnahmeAusgewaehlt(current)
    patchPunkte(
      punkte.map((p) => {
        const key = p.leistung_id?.trim() || p.id
        if (key !== leistungId) return p
        return { ...p, status: nextSelected ? 'ok' : 'offen' }
      })
    )
  }

  function setLeistungNotizen(leistungId: string, next: string[]) {
    patchPunkte(setNotizenFuerLeistung(punkte, leistungId, next))
  }

  function alsPdf() {
    startTransition(async () => {
      const existing = await loadAbnahmeprotokollSummary(auftragId)
      const payload = {
        auftragId,
        abnahmeDatum: abnahmeDatum || heuteYmd(),
        punkte,
        maengel: maengelAusPunkten(punkte),
        notizen: metaNotizen({ abnehmerName }),
      }
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
      setDirty(false)
      captureBaseline()
      toast.success('PDF erstellt')
      onChanged?.()
    })
  }

  function addLeistung() {
    patchPunkte([...punkte, neuerAbnahmePunktFreitext()])
    setEditMode(true)
  }

  if (loading) {
    return (
      <div className="abnahme-inline" id="auftrag-abnahmeprotokoll">
        <p className="text-sm text-bw-text-muted">Abnahmeprotokoll wird geladen…</p>
      </div>
    )
  }

  return (
    <div className="abnahme-inline" id="auftrag-abnahmeprotokoll">
      <div className="abnahme-inline__head">
        <div className="abnahme-inline__title-row">
          <MockIcon ctx="btn" n="checklist" size={18} />
          <h2 className="abnahme-inline__title">Abnahmeprotokoll</h2>
          <MockBadge kind={statusKind}>{statusLabel}</MockBadge>
        </div>
        <p className="abnahme-inline__lead">
          Nur abnahme-relevante Leistungen anhaken — nicht ausgewählte erscheinen nicht im PDF.
          Danach als PDF speichern.
        </p>
        <div className="abnahme-inline__progress">
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            {ausgewaehltCount}/{gesamtLeistungen || statistik.gesamt} Leistungen für Abnahme
            ausgewählt
          </span>
        </div>
      </div>

      {editMode ? (
        <div className="abnahme-inline__edit">
          <div className="abnahme-inline__edit-bar">
            <p className="text-[13px] text-bw-text-muted">
              Gewerke und Leistungen anpassen — Checkpunkte ergänzen oder entfernen.
            </p>
            <div className="inline-edit-actions">
              <MockBtn sm kind="ghost" onClick={abbrechen} disabled={pending}>
                Abbrechen
              </MockBtn>
              <MockBtn
                sm
                kind="primary"
                onClick={() => {
                  void persist().then((ok) => {
                    if (ok) {
                      toast.success('Checkliste gespeichert')
                      setEditMode(false)
                    }
                  })
                }}
                disabled={pending}
              >
                Speichern
              </MockBtn>
            </div>
          </div>
          <AbnahmeprotokollChecklist punkte={punkte} onChange={patchPunkte} mode="edit" />
        </div>
      ) : (
        <div className="abnahme-inline__list">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="abnahme-inline__section-label mb-0">Leistungen für Abnahme auswählen</p>
            {dirty ? (
              <div className="inline-edit-actions">
                <MockBtn sm kind="ghost" onClick={abbrechen} disabled={pending}>
                  Abbrechen
                </MockBtn>
                <MockBtn
                  sm
                  kind="primary"
                  disabled={pending}
                  onClick={() => {
                    void persist().then((ok) => {
                      if (ok) toast.success('Gespeichert')
                    })
                  }}
                >
                  Speichern
                </MockBtn>
              </div>
            ) : null}
          </div>
          {blocks.length === 0 ? (
            <div className="abnahme-empty">
              <MockIcon ctx="empty" n="checklist" size={26} />
              <div className="abnahme-empty__title">Keine Leistungen</div>
              <div className="abnahme-empty__text">
                Noch keine Positionen im Auftrag — füge Checkpunkte über Edit hinzu.
              </div>
            </div>
          ) : (
            blocks.map((block) => (
              <div key={block.gewerk} className="abnahme-inline__gewerk">
                <h3 className="abnahme-inline__gewerk-title">{block.gewerk}</h3>
                <ul className="abnahme-inline__items">
                  {block.leistungen.map((leistung) => {
                    const selected = leistungFuerAbnahmeAusgewaehlt(leistung.punkte)
                    const mangel = leistungHatMangel(leistung.punkte)
                    const sub = leistungSubtitle(leistung.leistung_name, leistung.punkte)
                    const notizen = notizenFuerLeistung(leistung.punkte)
                    return (
                      <li key={leistung.leistung_id} className="abnahme-inline__item">
                        <button
                          type="button"
                          className={cn(
                            'abnahme-inline__check',
                            selected && 'is-ok',
                            mangel && !selected && 'is-mangel'
                          )}
                          aria-pressed={selected}
                          aria-label={
                            selected
                              ? `${leistung.leistung_name} für Abnahme ausgewählt`
                              : `${leistung.leistung_name} für Abnahme auswählen`
                          }
                          onClick={() => toggleLeistung(leistung.leistung_id, leistung.punkte)}
                        >
                          {selected ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : null}
                        </button>
                        <div className="abnahme-inline__item-body">
                          <p className="abnahme-inline__item-title">{leistung.leistung_name}</p>
                          {sub ? <p className="abnahme-inline__item-sub">{sub}</p> : null}
                          {notizen.length > 0 ? (
                            <div className="mt-2 space-y-2">
                              {notizen.map((n, i) => (
                                <Input
                                  key={i}
                                  autoFocus={n === ''}
                                  placeholder="Notiz zur Leistung…"
                                  value={n}
                                  onChange={(e) => {
                                    const next = [...notizen]
                                    next[i] = e.target.value
                                    setLeistungNotizen(leistung.leistung_id, next)
                                  }}
                                />
                              ))}
                            </div>
                          ) : null}
                          <button
                            type="button"
                            className="abnahme-inline__add-note"
                            onClick={() =>
                              setLeistungNotizen(leistung.leistung_id, [...notizen, ''])
                            }
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                            Notiz hinzufügen
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      )}

      {!editMode ? (
        <div className="abnahme-inline__sign">
          <p className="abnahme-inline__sign-label">Abnahme &amp; PDF</p>

          <div className="abnahme-inline__fields">
            <Input
              label="Abnahmedatum"
              type="date"
              value={abnahmeDatum}
              onChange={(e) => {
                setAbnahmeDatum(e.target.value)
                setDirty(true)
              }}
            />
            <Input
              label="Name des Abnehmenden (Kunde)"
              value={abnehmerName}
              onChange={(e) => {
                setAbnehmerName(e.target.value)
                setDirty(true)
              }}
            />
          </div>

          {dirty ? (
            <div className="abnahme-inline__actions inline-edit-actions">
              <MockBtn kind="ghost" onClick={abbrechen} disabled={pending}>
                Abbrechen
              </MockBtn>
              <MockBtn
                kind="primary"
                icon="check"
                disabled={pending}
                onClick={() => {
                  void persist().then((ok) => {
                    if (ok) toast.success('Gespeichert')
                  })
                }}
              >
                Speichern
              </MockBtn>
            </div>
          ) : null}

          <div className="abnahme-inline__actions">
            <MockBtn
              kind="primary"
              icon="file-text"
              disabled={pending || punkte.length === 0 || dirty}
              onClick={alsPdf}
            >
              Als PDF
            </MockBtn>
          </div>
          <p className="abnahme-inline__hint">
            Abnahmedatum erfassen und Änderungen speichern, danach PDF erstellen.
          </p>
        </div>
      ) : null}

      <div className="abnahme-inline__fab fab-wrap fab-desktop">
        <button
          type="button"
          className="fab-btn"
          title="Leistung hinzufügen"
          onClick={addLeistung}
        >
          <Plus className="h-6 w-6" aria-hidden />
        </button>
        <button
          type="button"
          className={cn('abnahme-inline__fab-edit', editMode && 'is-active')}
          title={editMode ? 'Bearbeiten beenden' : 'Checkliste bearbeiten'}
          onClick={() => setEditMode((v) => !v)}
        >
          <MockIcon ctx="btn" n="pencil" size={14} />
          Edit
        </button>
      </div>
    </div>
  )
}
