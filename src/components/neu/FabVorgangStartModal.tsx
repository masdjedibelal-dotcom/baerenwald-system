'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { KundeAuswahlFeld } from '@/components/kunden/KundeAuswahlFeld'
import { toast } from '@/components/ui/app-toast'
import {
  listAuftraegeFuerKunde,
  type FabKundeAuftragZeile,
} from '@/app/(dashboard)/neu/fab-neu-actions'
import { formatDatum } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Kunde } from '@/lib/types'
import { createKundeHref } from '@/lib/crm/create-entry'
import { fachbegriff } from '@/lib/crm/fachbegriffe'

export type FabVorgangArt = 'anfrage' | 'angebot' | 'rechnung'

const TITEL: Record<FabVorgangArt, string> = {
  anfrage: 'Neue Anfrage',
  angebot: 'Neues Angebot',
  rechnung: 'Neue Rechnung',
}

/**
 * FAB-Zwischenschritt: immer neu erstellen.
 * Anfrage & Angebot: kein Modal — Kunde im Funnel bzw. Gate.
 * Rechnung: 1) Kunde wählen → 2) optional Vorgang → Wizard/Detail.
 */
export function FabVorgangStartModal({
  open,
  art,
  onClose,
  initialKundeId,
}: {
  open: boolean
  art: FabVorgangArt | null
  onClose: () => void
  /** Optional vorausgewählt (Deep-Link / Kunden-Detail) */
  initialKundeId?: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [kundeId, setKundeId] = useState<string | null>(null)
  const [kunde, setKunde] = useState<Kunde | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [auftraege, setAuftraege] = useState<FabKundeAuftragZeile[]>([])
  const [auftragId, setAuftragId] = useState<string | null>(null)
  const [loadingAuftraege, setLoadingAuftraege] = useState(false)

  // Anfrage / Angebot: Kunde nur einmal im Ziel-Flow — Modal überspringen
  useEffect(() => {
    if (!open || (art !== 'anfrage' && art !== 'angebot')) return
    const kid = initialKundeId?.trim()
    const href =
      art === 'anfrage'
        ? kid
          ? `/anfragen/neu?kunde_id=${encodeURIComponent(kid)}`
          : '/anfragen/neu'
        : kid
          ? `/angebote/neu?kunde_id=${encodeURIComponent(kid)}`
          : '/angebote/neu'
    router.push(href)
    onClose()
    // onClose absichtlich nicht in deps — vermeidet Re-Navigation bei Parent-Rerenders
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei open/art/kunde
  }, [open, art, initialKundeId, router])

  useEffect(() => {
    if (!open || !art || art === 'anfrage' || art === 'angebot') return
    const kid = initialKundeId?.trim() || null
    setKundeId(kid)
    setKunde(null)
    setAuftraege([])
    setAuftragId(null)

    if (art === 'rechnung' && kid) {
      setStep(1)
      setLoadingAuftraege(false)
      return
    }

    setStep(1)
    setLoadingAuftraege(false)
  }, [open, art, initialKundeId])

  if (!art || art === 'anfrage' || art === 'angebot') return null

  function loadAuftraegeAndGoStep2() {
    if (!kundeId) {
      toast.error('Bitte einen Kunden wählen.')
      return
    }
    setLoadingAuftraege(true)
    startTransition(async () => {
      const r = await listAuftraegeFuerKunde(kundeId)
      setLoadingAuftraege(false)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setAuftraege(r.auftraege)
      setAuftragId(null)
      setStep(2)
    })
  }

  function startRechnung(withAuftragId: string | null) {
    if (!kundeId) {
      toast.error('Bitte einen Kunden wählen.')
      return
    }
    onClose()
    if (withAuftragId) {
      router.push(
        `/rechnungen/neu?kunde_id=${encodeURIComponent(kundeId)}&auftrag_id=${encodeURIComponent(withAuftragId)}&neu=1`
      )
      return
    }
    router.push(`/rechnungen/neu?kunde_id=${encodeURIComponent(kundeId)}`)
  }

  function onWeiter() {
    if (art === 'rechnung') {
      if (step === 1) {
        // Primär: direkt ohne Vorgang (UX2-7) — Verknüpfung ist optional via Step 2
        return startRechnung(null)
      }
      return startRechnung(auftragId)
    }
  }

  function openVorgangSchritt() {
    loadAuftraegeAndGoStep2()
  }

  const weiterDisabled = pending || loadingAuftraege || (step === 1 && !kundeId)
  const kundeVorausgewaehlt = Boolean(initialKundeId?.trim())

  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title={TITEL[art]}
      size="lg"
    >
      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-bw-text-muted">
            Kunden wählen — danach startet der Rechnungs-Wizard. Vorgang optional verknüpfen.
          </p>
          <KundeAuswahlFeld
            label="Kunde"
            hint="Suche nach Name, E-Mail oder Telefon."
            kundeId={kundeId}
            bekannterKunde={kunde}
            onKundeIdChange={setKundeId}
            onKundeGewaehlt={setKunde}
            disabled={pending}
          />
          <p className="text-xs text-bw-text-muted">
            Noch kein Kunde?{' '}
            <button
              type="button"
              className="text-bw-link underline"
              onClick={() => {
                onClose()
                router.push(createKundeHref())
              }}
            >
              Kunden anlegen
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-bw-text-muted">
            Optional einen bestehenden Vorgang verknüpfen — oder ohne Vorgang als Direktrechnung
            weiter.
          </p>

          {loadingAuftraege ? (
            <p className="rounded-lg border border-dashed border-bw-border px-3 py-6 text-center text-sm text-bw-text-muted">
              Vorgänge werden geladen…
            </p>
          ) : (
            <ul className="m-0 max-h-72 list-none divide-y divide-bw-border overflow-auto rounded-lg border border-bw-border p-0">
              <li>
                <button
                  type="button"
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left',
                    !auftragId && 'bg-bw-green-bg/35'
                  )}
                  onClick={() => setAuftragId(null)}
                >
                  <span className="text-sm font-medium text-bw-text">Ohne Vorgang</span>
                  <span className="text-[12px] text-bw-text-muted" title={fachbegriff('ohne_vorgang')}>
                    Direktrechnung ohne Verknüpfung
                  </span>
                </button>
              </li>
              {auftraege.map((a) => {
                const selected = auftragId === a.id
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left',
                        selected && 'bg-bw-green-bg/35'
                      )}
                      onClick={() => setAuftragId(a.id)}
                    >
                      <span className="text-sm font-medium text-bw-text">
                        {a.titel?.trim() || `Auftrag ${a.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      <span className="text-[12px] text-bw-text-muted">
                        {a.status}
                        {a.created_at ? ` · ${formatDatum(a.created_at)}` : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {!loadingAuftraege && auftraege.length === 0 ? (
            <p className="text-xs text-bw-text-muted">
              Keine Vorgänge zu diesem Kunden — „Ohne Vorgang“ ist vorausgewählt.
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <MockBtn
            kind="ghost"
            disabled={pending}
            onClick={() => {
              if (step === 2 && !kundeVorausgewaehlt) setStep(1)
              else onClose()
            }}
          >
            {step === 2 && !kundeVorausgewaehlt ? 'Zurück' : 'Abbrechen'}
          </MockBtn>
          {step === 1 && kundeId ? (
            <MockBtn kind="ghost" disabled={pending || loadingAuftraege} onClick={openVorgangSchritt}>
              Vorgang verknüpfen…
            </MockBtn>
          ) : null}
        </div>
        <MockBtn kind="primary" icon="arrow-right" disabled={weiterDisabled} onClick={onWeiter}>
          {pending || loadingAuftraege
            ? 'Bitte warten…'
            : 'Rechnung erstellen'}
        </MockBtn>
      </div>
    </Modal>
  )
}
