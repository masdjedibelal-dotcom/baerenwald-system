'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockField } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useLocalTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
<<<<<<< Updated upstream
=======
import { Star } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { MockBtn } from '@/components/mock-ui'
import { Textarea } from '@/components/ui/Textarea'
>>>>>>> Stashed changes
import { StarRatingInput } from '@/components/ui/StarRatingInput'
import { toast } from '@/components/ui/app-toast'
import {
  loadHandwerkerBewertungenFuerAuftrag,
  saveHandwerkerBewertungen,
  type GespeicherteHandwerkerBewertung,
} from '@/app/(dashboard)/auftraege/handwerker-bewertung-actions'
import {
  durchschnittAusBewertung,
  HANDWERKER_BEWERTUNG_KATEGORIEN,
  istHandwerkerBewertungVollstaendig,
  leereHandwerkerBewertung,
  type HandwerkerBewertungWerte,
} from '@/lib/handwerker/bewertung-kategorien'
import type { HandwerkerBewertungZiel } from '@/lib/handwerker/handwerker-aus-auftrag'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format/geld-datum'

type BewertungFormular = HandwerkerBewertungWerte & {
  notiz: string
  gespeichert: boolean
}

function formularAusGespeichert(b?: GespeicherteHandwerkerBewertung): BewertungFormular {
  if (!b) {
    return { ...leereHandwerkerBewertung(), notiz: '', gespeichert: false }
  }
  return {
    qualitaet: b.qualitaet,
    termintreue: b.termintreue,
    sauberkeit: b.sauberkeit,
    kommunikation: b.kommunikation,
    preis_leistung: b.preis_leistung,
    notiz: b.notiz ?? '',
    gespeichert: true,
  }
}

export function HandwerkerBewertungModal({
  open,
  onClose,
  auftragId,
  ziele,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  ziele: HandwerkerBewertungZiel[]
  onSaved: () => void
}) {
  const [pending, startTransition] = useLocalTransition()
  const [loading, setLoading] = useState(false)
  const [formulare, setFormulare] = useState<Record<string, BewertungFormular>>({})

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void loadHandwerkerBewertungenFuerAuftrag(auftragId).then((r) => {
      setLoading(false)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      const byHw = new Map(r.bewertungen.map((b) => [b.handwerkerId, b]))
      const next: Record<string, BewertungFormular> = {}
      for (const z of ziele) {
        next[z.handwerkerId] = formularAusGespeichert(byHw.get(z.handwerkerId))
      }
      setFormulare(next)
    })
  }, [open, auftragId, ziele])

  const vollstaendigCount = useMemo(
    () => ziele.filter((z) => istHandwerkerBewertungVollstaendig(formulare[z.handwerkerId] ?? leereHandwerkerBewertung())).length,
    [ziele, formulare]
  )

  function updateFormular(handwerkerId: string, patch: Partial<BewertungFormular>) {
    setFormulare((prev) => ({
      ...prev,
      [handwerkerId]: {
        ...(prev[handwerkerId] ?? formularAusGespeichert()),
        ...patch,
        gespeichert: false,
      },
    }))
  }

  function speichern() {
    const eingaben = ziele
      .map((z) => {
        const f = formulare[z.handwerkerId]
        if (!f || !istHandwerkerBewertungVollstaendig(f)) return null
        return {
          handwerkerId: z.handwerkerId,
          gewerkId: z.gewerkId,
          qualitaet: f.qualitaet,
          termintreue: f.termintreue,
          sauberkeit: f.sauberkeit,
          kommunikation: f.kommunikation,
          preis_leistung: f.preis_leistung,
          notiz: f.notiz.trim() || null,
        }
      })
      .filter(Boolean) as Parameters<typeof saveHandwerkerBewertungen>[1]

    startTransition(async () => {
      const r = await saveHandwerkerBewertungen(auftragId, eingaben)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(
        r.gespeichert === 1
          ? '1 Partner-Bewertung gespeichert'
          : `${r.gespeichert} Partner-Bewertungen gespeichert`
      )
      onSaved()
      onClose()
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Partner bewerten"
      size="lg"
<<<<<<< Updated upstream
      secondary={{ label: 'Abbrechen' }}
      primary={{
        label: 'Bewertungen speichern',
        busy: pending,
        disabled: loading || vollstaendigCount === 0,
        onClick: speichern,
      }}
=======
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
            {vollstaendigCount}/{ziele.length} Handwerker vollständig bewertet
          </p>
          <div className="flex flex-wrap gap-2">
            <MockBtn type="button" kind="secondary" onClick={onClose}>
              Abbrechen
            </MockBtn>
            <MockBtn
              type="button"
              kind="primary"
              loading={pending}
              disabled={loading || vollstaendigCount === 0}
              onClick={speichern}
            >
              Bewertungen speichern
            </MockBtn>
          </div>
        </div>
      }
>>>>>>> Stashed changes
    >
      <div className="space-y-4">
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">
          Bewerte jeden beteiligten Partner in fünf Kategorien (1–5 Sterne). Die Durchschnittswerte
          werden am Partner-Profil gespeichert.
        </p>
        <p className="m-0 text-[length:var(--fs-meta)] text-bw-text-muted">
          {vollstaendigCount}/{ziele.length} Handwerker vollständig bewertet
        </p>

        {loading ? (
          <p className="py-8 text-center text-[length:var(--fs-text)] text-bw-text-muted">Bewertungen werden geladen…</p>
        ) : ziele.length === 0 ? (
          <p className="py-8 text-center text-[length:var(--fs-text)] text-bw-text-muted">
            Keine Partner an diesem Auftrag hinterlegt.
          </p>
        ) : (
          <div className="space-y-4">
            {ziele.map((z) => {
              const f = formulare[z.handwerkerId] ?? formularAusGespeichert()
              const avg = durchschnittAusBewertung(f)
              return (
                <div
                  key={z.handwerkerId}
                  className="rounded-card border border-bw-border bg-surface p-4 shadow-sm"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-bw-text">{z.name}</p>
                      <p className="text-[length:var(--fs-text)] text-bw-text-muted">
                        {[z.firma, z.gewerkName].filter(Boolean).join(' · ') || 'Partner'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.gespeichert ? (
                        <span className="rounded-pill bg-bw-green-bg px-2 py-0.5 text-[length:var(--fs-meta)] font-medium text-bw-primary">
                          Gespeichert
                        </span>
                      ) : null}
                      {avg > 0 ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-pill bg-status-contact-bg px-2.5 py-0.5 text-[length:var(--fs-meta)] font-semibold tabular-nums text-status-contact-text'
                          )}
                        >
                          <MockIcon n="star" ctx="default" className="h-3 w-3 fill-current" aria-hidden />
                          Ø {formatNumber(avg, { decimals: 1 })}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-bw-border pt-4">
                    {HANDWERKER_BEWERTUNG_KATEGORIEN.map((kat) => (
                      <StarRatingInput
                        key={kat.key}
                        label={kat.label}
                        hint={kat.hint}
                        value={f[kat.key]}
                        disabled={pending}
                        onChange={(val) => updateFormular(z.handwerkerId, { [kat.key]: val })}
                      />
                    ))}
                  </div>

                  <div className="mt-4 border-t border-bw-border pt-4">
                    <MockField label="Interne Notiz (optional)"><RichTextEditor value={typeof (f.notiz) === 'string' ? (f.notiz) : ''} onChange={(__v) => updateFormular(z.handwerkerId, { notiz: __v })} disabled={pending} placeholder="z. B. Besonderheiten zur Zusammenarbeit…" minHeight={120} aria-label="Interne Notiz (optional)" /></MockField>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </EditorSheet>
  )
}
