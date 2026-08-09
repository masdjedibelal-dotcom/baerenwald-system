'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
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
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [formulare, setFormulare] = useState<Record<string, BewertungFormular>>({})

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void loadHandwerkerBewertungenFuerAuftrag(auftragId).then((r) => {
      setLoading(false)
      if (!r.ok) {
        toast.error(r.message)
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
        toast.error(r.message)
        return
      }
      toast.success(
        r.gespeichert === 1
          ? '1 Handwerker-Bewertung gespeichert'
          : `${r.gespeichert} Handwerker-Bewertungen gespeichert`
      )
      onSaved()
      onClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Handwerker bewerten"
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-bw-text-muted">
            {vollstaendigCount}/{ziele.length} Handwerker vollständig bewertet
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={pending}
              disabled={loading || vollstaendigCount === 0}
              onClick={speichern}
            >
              Bewertungen speichern
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-bw-text-muted">
          Bewerten Sie jeden beteiligten Handwerker in fünf Kategorien (1–5 Sterne). Die Durchschnittswerte
          werden am Handwerker-Profil gespeichert.
        </p>

        {loading ? (
          <p className="py-8 text-center text-sm text-bw-text-muted">Bewertungen werden geladen…</p>
        ) : ziele.length === 0 ? (
          <p className="py-8 text-center text-sm text-bw-text-muted">
            Keine Handwerker an diesem Auftrag hinterlegt.
          </p>
        ) : (
          <div className="space-y-4">
            {ziele.map((z) => {
              const f = formulare[z.handwerkerId] ?? formularAusGespeichert()
              const avg = durchschnittAusBewertung(f)
              return (
                <div
                  key={z.handwerkerId}
                  className="rounded-lg border border-bw-border bg-bw-card p-4 shadow-sm"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-bw-text">{z.name}</p>
                      <p className="text-sm text-bw-text-muted">
                        {[z.firma, z.gewerkName].filter(Boolean).join(' · ') || 'Handwerker'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.gespeichert ? (
                        <span className="rounded-full bg-bw-green-bg px-2 py-0.5 text-xs font-medium text-bw-primary">
                          Gespeichert
                        </span>
                      ) : null}
                      {avg > 0 ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-amber-900'
                          )}
                        >
                          <Star className="h-3 w-3 fill-current" aria-hidden />
                          Ø {avg.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
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
                    <Textarea
                      label="Interne Notiz (optional)"
                      rows={2}
                      value={f.notiz}
                      disabled={pending}
                      onChange={(e) => updateFormular(z.handwerkerId, { notiz: e.target.value })}
                      placeholder="z. B. Besonderheiten zur Zusammenarbeit…"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
