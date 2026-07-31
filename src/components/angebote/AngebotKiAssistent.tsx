'use client'

import { useState } from 'react'
import { MockField } from '@/components/mock-ui/MockForm'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockModal } from '@/components/mock-ui/MockModal'
import { toast } from '@/components/ui/app-toast'
import { KiChatComposer } from '@/components/assistent/KiChatComposer'
import {
  angebotKiGenerate,
  angebotKiLernen,
} from '@/app/(dashboard)/angebote/angebot-ki-actions'
import type {
  AngebotKiErgebnis,
  AngebotKiKontextPosition,
  AngebotKiKontextPreisliste,
  AngebotKiPositionVorschlag,
} from '@/lib/angebote/angebot-ki-types'
import { formatEurBetrag } from '@/lib/dokument-zeilen'

function matchBadge(p: AngebotKiPositionVorschlag) {
  if (p.rolle === 'titel') {
    return <MockBadge kind="ph-angebot">Titel</MockBadge>
  }
  if (p.rolle === 'beschreibung') {
    return <MockBadge kind="ph-angebot">Beschreibung</MockBadge>
  }
  if (p.match.kind === 'vorhanden_wizard') {
    return <MockBadge kind="warten">Vorhanden · update</MockBadge>
  }
  if (p.match.kind === 'preisliste') {
    return <MockBadge kind="neu">Preisliste</MockBadge>
  }
  return <MockBadge kind="aktiv">Neu</MockBadge>
}

function posText(p: AngebotKiPositionVorschlag) {
  if (p.rolle === 'titel') return p.leistung
  if (p.rolle === 'beschreibung') return p.beschreibung || p.leistung
  return p.leistung
}

export type AngebotKiApplyPayload = {
  titel?: string | null
  beschreibung?: string | null
  positionen: AngebotKiPositionVorschlag[]
}

export function AngebotKiAssistentButton({
  leadKurz,
  titel,
  beschreibung,
  positionen,
  preislisten,
  gewerke,
  onApply,
  label = 'Mit KI',
  sm,
  dokumentLabel = 'Dokument',
}: {
  leadKurz?: string | null
  titel?: string | null
  beschreibung?: string | null
  positionen: AngebotKiKontextPosition[]
  preislisten: AngebotKiKontextPreisliste[]
  gewerke: Array<{ slug: string; name: string }>
  onApply: (payload: AngebotKiApplyPayload) => void
  label?: string
  sm?: boolean
  /** z. B. Angebot / Rechnung — nur Anzeige */
  dokumentLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [ergebnis, setErgebnis] = useState<AngebotKiErgebnis | null>(null)
  const [pending, setPending] = useState(false)

  async function generieren() {
    setPending(true)
    try {
      const res = await angebotKiGenerate({
        prompt,
        scope: 'positionen',
        leadKurz: leadKurz ?? null,
        titel: titel ?? null,
        beschreibung: beschreibung ?? null,
        positionen,
        preislisten,
        gewerke,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setErgebnis(res.ergebnis)
    } finally {
      setPending(false)
    }
  }

  function togglePos(id: string) {
    if (!ergebnis) return
    setErgebnis({
      ...ergebnis,
      positionen: ergebnis.positionen.map((p) =>
        p.id === id ? { ...p, anwenden: !p.anwenden } : p
      ),
    })
  }

  function uebernehmen() {
    if (!ergebnis) return
    const selected = ergebnis.positionen.filter((p) => p.anwenden)
    const titelPos = selected.find((p) => p.rolle === 'titel')
    const beschPos = selected.find((p) => p.rolle === 'beschreibung')
    const payload: AngebotKiApplyPayload = {
      titel: titelPos ? posText(titelPos) : undefined,
      beschreibung: beschPos ? posText(beschPos) : undefined,
      positionen: selected.filter((p) => p.rolle === 'leistung'),
    }
    onApply(payload)
    void angebotKiLernen({
      scope: 'positionen',
      prompt,
      gewerk_slug: payload.positionen[0]?.gewerk_slug ?? null,
      kontext: {
        leadKurz: leadKurz ?? null,
        titel: titel ?? null,
        positionenCount: positionen.length,
        dokumentLabel,
      },
      ergebnis: {
        positionen: selected,
      },
    })
    toast.success('Übernommen — KI lernt aus dieser Annahme')
    setOpen(false)
    setErgebnis(null)
    setPrompt('')
  }

  return (
    <>
      <MockBtn
        sm={sm}
        kind="ghost"
        icon="sparkles"
        title="Positionen mit KI (Titel & Beschreibung als Positionen)"
        onClick={() => setOpen(true)}
      >
        {label}
      </MockBtn>

      <MockModal
        open={open}
        onClose={() => !pending && setOpen(false)}
        icon="sparkles"
        title={`${dokumentLabel}-KI · Positionen`}
        sub="Titel und Beschreibung sind eigene Positionen. Vorhanden / Preisliste / Neu wird erkannt — Übernahmen lernt die KI."
        footer={
          <>
            <MockBtn kind="ghost" disabled={pending} onClick={() => setOpen(false)}>
              Schließen
            </MockBtn>
            <div style={{ flex: 1 }} />
            {!ergebnis ? (
              <MockBtn
                kind="primary"
                icon="sparkles"
                disabled={pending || !prompt.trim()}
                onClick={() => void generieren()}
              >
                {pending ? 'Generiert…' : 'Generieren'}
              </MockBtn>
            ) : (
              <>
                <MockBtn kind="ghost" disabled={pending} onClick={() => setErgebnis(null)}>
                  Neu generieren
                </MockBtn>
                <MockBtn kind="primary" disabled={pending} onClick={uebernehmen}>
                  Übernehmen
                </MockBtn>
              </>
            )}
          </>
        }
      >
        <div className="angebot-ki space-y-4">
          {pending && !ergebnis ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8" aria-live="polite">
              <span className="page-loading__spinner page-loading__spinner--sm" aria-hidden />
              <p className="m-0 text-[length:var(--fs-text)] text-bw-text-muted">
                KI generiert Vorschläge…
              </p>
            </div>
          ) : null}
          {!ergebnis && !pending ? (
            <MockField
              label="Prompt"
              hint="Beschreib konkret, was rein soll — Gewerk, Mengen, Qualität. Mobil: Tippen oder Sprechen."
              full
            >
              <KiChatComposer
                value={prompt}
                onChange={setPrompt}
                onSubmit={() => void generieren()}
                disabled={pending}
                placeholder="z. B. Bad 8 m²: Abbruch Altfliesen, Abdichtung, Fliesenwand/-boden Mittelklasse…"
              />
            </MockField>
          ) : null}
          {ergebnis ? (
            <div className="angebot-ki__preview space-y-3">
              {ergebnis.hinweis ? (
                <p className="angebot-ki__hint">{ergebnis.hinweis}</p>
              ) : null}
              <div>
                <div className="angebot-ki__lbl">
                  Positionen · Titel / Beschreibung / Leistung
                </div>
                {ergebnis.positionen.length === 0 ? (
                  <p className="angebot-ki__hint">Keine Positionen vorgeschlagen.</p>
                ) : (
                  <ul className="angebot-ki__pos">
                    {ergebnis.positionen.map((p) => (
                      <li key={p.id}>
                        <label className="angebot-ki__pos-row">
                          <input
                            type="checkbox"
                            checked={p.anwenden}
                            onChange={() => togglePos(p.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="angebot-ki__pos-top">
                              <strong>
                                {p.rolle === 'beschreibung'
                                  ? 'Beschreibung'
                                  : p.rolle === 'titel'
                                    ? 'Titel'
                                    : p.leistung}
                              </strong>
                              {matchBadge(p)}
                            </div>
                            {p.rolle === 'titel' ? (
                              <p className="angebot-ki__pos-desc">{p.leistung}</p>
                            ) : null}
                            {p.rolle === 'beschreibung' && (p.beschreibung || p.leistung) ? (
                              <p className="angebot-ki__pos-desc">
                                {p.beschreibung || p.leistung}
                              </p>
                            ) : null}
                            {p.rolle === 'leistung' && p.beschreibung ? (
                              <p className="angebot-ki__pos-desc">{p.beschreibung}</p>
                            ) : null}
                            {p.rolle === 'leistung' ? (
                              <span className="angebot-ki__pos-meta">
                                {p.menge} {p.einheit} · {formatEurBetrag(p.preis_netto)} netto
                                {p.match.label && p.match.kind !== 'neu'
                                  ? ` · Match: ${p.match.label}`
                                  : ''}
                              </span>
                            ) : (
                              <span className="angebot-ki__pos-meta">
                                {p.match.kind === 'vorhanden_wizard'
                                  ? 'Aktualisiert bestehendes Feld'
                                  : 'Neu setzen'}
                              </span>
                            )}
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </MockModal>
    </>
  )
}
