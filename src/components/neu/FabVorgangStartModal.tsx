'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { KundeAuswahlFeld } from '@/components/kunden/KundeAuswahlFeld'
import { toast } from '@/components/ui/app-toast'
import {
  createAnfrageFuerKunde,
  createDirektAuftrag,
  listAuftraegeFuerKunde,
  type FabKundeAuftragZeile,
} from '@/app/(dashboard)/neu/fab-neu-actions'
import { formatDatum } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Kunde } from '@/lib/types'

export type FabVorgangArt = 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'

const TITEL: Record<FabVorgangArt, string> = {
  anfrage: 'Neue Anfrage',
  angebot: 'Neues Angebot',
  auftrag: 'Neuer Auftrag',
  rechnung: 'Neue Rechnung',
}

/**
 * FAB-Zwischenschritt: immer neu erstellen.
 * 1) Kunde wählen → 2) bei Rechnung optional Auftrag → Wizard/Detail.
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
  /** Optional vorausgewählt (Deep-Link) */
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

  useEffect(() => {
    if (!open) return
    setKundeId(initialKundeId?.trim() || null)
    setKunde(null)
    setStep(1)
    setAuftraege([])
    setAuftragId(null)
  }, [open, art, initialKundeId])

  if (!art) return null

  function startAnfrage() {
    if (!kundeId) {
      toast.error('Bitte einen Kunden wählen.')
      return
    }
    onClose()
    router.push(`/anfragen/neu?kunde_id=${encodeURIComponent(kundeId)}`)
  }

  function startAngebot() {
    if (!kundeId) {
      toast.error('Bitte einen Kunden wählen.')
      return
    }
    startTransition(async () => {
      try {
        const r = await createAnfrageFuerKunde(kundeId)
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        onClose()
        toast.success('Anfrage angelegt — Angebot-Wizard öffnet sich…')
        router.push(`/anfragen/${r.leadId}?angebot_wizard=1`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Angebot konnte nicht gestartet werden.')
      }
    })
  }

  function startAuftrag() {
    if (!kundeId) {
      toast.error('Bitte einen Kunden wählen.')
      return
    }
    startTransition(async () => {
      const r = await createDirektAuftrag({ kundeId })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Auftrag angelegt')
      onClose()
      router.push(`/auftraege/${r.auftragId}`)
    })
  }

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
    if (art === 'anfrage') return startAnfrage()
    if (art === 'angebot') return startAngebot()
    if (art === 'auftrag') return startAuftrag()
    if (art === 'rechnung') {
      if (step === 1) return loadAuftraegeAndGoStep2()
      return startRechnung(auftragId)
    }
  }

  const weiterDisabled = pending || loadingAuftraege || (step === 1 && !kundeId)

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
            Zuerst den Kunden wählen. Es wird immer ein <strong>neuer</strong> Vorgang erstellt.
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
                router.push('/neu?art=kunde')
              }}
            >
              Kunden anlegen
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-bw-text-muted">
            Optional einen bestehenden Auftrag verknüpfen — oder ohne Auftrag als Direktrechnung
            weiter.
          </p>
          {auftraege.length === 0 ? (
            <p className="rounded-lg border border-dashed border-bw-border px-3 py-6 text-center text-sm text-bw-text-muted">
              Keine Aufträge zu diesem Kunden — Rechnung wird ohne Auftrag erstellt.
            </p>
          ) : (
            <ul className="m-0 max-h-64 list-none divide-y divide-bw-border overflow-auto rounded-lg border border-bw-border p-0">
              <li>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left',
                    !auftragId && 'bg-bw-green-bg/35'
                  )}
                  onClick={() => setAuftragId(null)}
                >
                  <span className="text-sm font-medium text-bw-text">Ohne Auftrag</span>
                  <span className="text-[12px] text-bw-text-muted">Direktrechnung</span>
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
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <MockBtn
          kind="ghost"
          disabled={pending}
          onClick={() => {
            if (step === 2) setStep(1)
            else onClose()
          }}
        >
          {step === 2 ? 'Zurück' : 'Abbrechen'}
        </MockBtn>
        <MockBtn kind="primary" icon="arrow-right" disabled={weiterDisabled} onClick={onWeiter}>
          {pending || loadingAuftraege
            ? 'Bitte warten…'
            : art === 'rechnung' && step === 1
              ? 'Weiter'
              : 'Erstellen'}
        </MockBtn>
      </div>
    </Modal>
  )
}
