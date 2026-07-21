'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { ExternalLink, FileUp, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/app-toast'
import { HandwerkerEinreichungManuellModal } from '@/components/angebote/HandwerkerEinreichungManuellModal'
import { HandwerkerEinreichungPruefung } from '@/components/angebote/HandwerkerEinreichungPruefung'
import { ProjektVertragWizard } from '@/components/vertraege/ProjektVertragWizard'
import { cn } from '@/lib/utils'
import type { AngebotDetail, AngebotHandwerkerRow } from '@/lib/types'
import { labelHandwerkerAblehnung } from '@/lib/angebote/ablehnung-labels'
import { hasHwEinreichung } from '@/lib/partner/handwerker-einreichung'
import { AngebotVersandSection } from '@/components/angebote/AngebotVersandSection'
import type { AngebotPosition } from '@/lib/types'
import {
  listHandwerkerFuerGewerk,
  openHandwerkerAcceptWizard,
  replaceAngebotHandwerkerUndSenden,
} from '@/app/(dashboard)/angebote/actions'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'
import type { ProjektVertragWizardBootstrap } from '@/lib/vertraege/types'

function zuweisungStatusLabel(s: string | null | undefined): string {
  const v = (s ?? 'ausstehend').toLowerCase()
  if (v === 'angefragt') return 'Angefragt'
  if (v === 'akzeptiert') return 'Akzeptiert'
  if (v === 'abgelehnt') return 'Abgelehnt'
  return 'Ausstehend'
}

function ZuweisungCard({
  z,
  angebotId,
  angebotTitel,
  auftragId,
  onRefresh,
  onAcceptWizard,
}: {
  z: AngebotHandwerkerRow
  angebotId: string
  angebotTitel: string
  auftragId: string | null
  onRefresh: () => void
  onAcceptWizard?: (ctx: {
    auftragId: string
    handwerkerId: string
    gewerkId: string
    zuweisungId: string
  }) => void
}) {
  const [manuellOpen, setManuellOpen] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [replacePending, startReplace] = useTransition()
  const [hwListe, setHwListe] = useState<HandwerkerGewerkListeEintrag[]>([])
  const abgelehnt = z.status === 'abgelehnt'
  const eingereicht = hasHwEinreichung(z)
  const hwSt = (z.hw_status ?? '').toLowerCase()
  const uebernommen = hwSt === 'uebernommen'
  const kannManuell = !abgelehnt && !eingereicht && !uebernommen

  return (
    <>
      <Card
        className={cn('space-y-2 p-4 text-sm', abgelehnt && 'border-danger/50 bg-danger/5')}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium text-bw-text">{z.gewerke?.name ?? 'Gewerk'}</p>
            <p className="text-bw-text">{z.handwerker?.name ?? '—'}</p>
            <p className="text-xs text-bw-text-muted">{z.handwerker?.email ?? '—'}</p>
          </div>
          <span className="inline-block rounded-md bg-bw-bg-soft px-2 py-0.5 text-xs text-bw-text-muted">
            {zuweisungStatusLabel(z.status)}
          </span>
        </div>

        {z.aufgabe_notiz?.trim() ? (
          <p className="text-xs text-bw-text-muted whitespace-pre-wrap">
            <span className="font-medium text-bw-text">Notiz: </span>
            {z.aufgabe_notiz.trim()}
          </p>
        ) : null}

        {abgelehnt ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-danger">
              Ablehnung: {labelHandwerkerAblehnung(z.ablehnung_grund ?? null)}
              {z.antwort_notiz?.trim() ? ` — ${z.antwort_notiz.trim()}` : ''}
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={replacePending}
              onClick={() => {
                setReplaceOpen(true)
                void listHandwerkerFuerGewerk(z.gewerk_id).then((r) => {
                  if (!r.ok) toast.error(r.message)
                  else setHwListe(r.handwerker.filter((h) => h.id !== z.handwerker_id))
                })
              }}
            >
              <UserPlus className="mr-1 h-3.5 w-3.5" aria-hidden />
              Anderen Partner zuweisen
            </Button>
          </div>
        ) : null}

        <HandwerkerEinreichungPruefung
          z={z}
          angebotId={angebotId}
          angebotTitel={angebotTitel}
          auftragId={auftragId}
          onRefresh={onRefresh}
          onAcceptWizard={onAcceptWizard}
        />

        {!eingereicht && kannManuell ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-bw-text-muted">
              {z.status === 'akzeptiert'
                ? 'Wartet auf Angebots-PDF / Preis im Partner-Portal.'
                : 'Noch keine Einreichung — Portal oder manuell erfassen.'}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setManuellOpen(true)}
            >
              <FileUp className="mr-1 h-3.5 w-3.5" aria-hidden />
              Manuell erfassen
            </Button>
          </div>
        ) : uebernommen && !eingereicht ? (
          <p className="text-xs font-medium text-bw-primary">Angebot bestätigt und übernommen.</p>
        ) : null}

        {auftragId && uebernommen ? (
          <Link
            href={`/auftraege/${auftragId}`}
            className="inline-flex items-center gap-1 text-xs text-bw-link hover:underline"
          >
            Auftrag
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        ) : null}

        <HandwerkerEinreichungManuellModal
          open={manuellOpen}
          onClose={() => setManuellOpen(false)}
          angebotId={angebotId}
          zuweisungId={z.id}
          handwerkerName={z.handwerker?.name ?? 'Handwerker'}
          gewerkName={z.gewerke?.name ?? 'Gewerk'}
          onSaved={onRefresh}
        />

        <Modal
          open={replaceOpen}
          onClose={() => setReplaceOpen(false)}
          title={`Anderen Partner — ${z.gewerke?.name ?? 'Gewerk'}`}
          size="md"
        >
          <p className="mb-3 text-sm text-bw-text-muted">
            Ersatzpartner erhält die Anfrage erneut (E-Mail / Partner-Portal).
          </p>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {hwListe.map((h) => (
              <li key={h.id}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  disabled={replacePending}
                  onClick={() => {
                    startReplace(async () => {
                      const r = await replaceAngebotHandwerkerUndSenden({
                        angebotId,
                        alteZuweisungId: z.id,
                        neuerHandwerkerId: h.id,
                      })
                      if (!r.ok) toast.error(r.message)
                      else {
                        toast.success(`Anfrage an ${h.name} gesendet.`)
                        setReplaceOpen(false)
                        onRefresh()
                      }
                    })
                  }}
                >
                  {h.name}
                  {h.firma ? ` · ${h.firma}` : ''}
                </Button>
              </li>
            ))}
          </ul>
        </Modal>
      </Card>
    </>
  )
}

export function AngebotHandwerkerPartnerSection({
  detail,
  auftragId,
  bruttoMin,
  bruttoMax,
  positionen,
  gueltigBis,
}: {
  detail: AngebotDetail
  auftragId: string | null
  bruttoMin: number
  bruttoMax: number
  positionen: AngebotPosition[]
  gueltigBis: string
}) {
  const router = useRouter()
  const [wizardBootstrap, setWizardBootstrap] = useState<ProjektVertragWizardBootstrap | null>(null)
  const [wizardPending, startWizardTransition] = useTransition()
  const rows = detail.angebot_handwerker ?? []
  const angebotTitel =
    detail.notizen?.trim()?.slice(0, 80) ||
    (detail.angebotsnr ? `Angebot ${detail.angebotsnr}` : 'Projekt')

  const openAcceptWizard = useCallback(
    (ctx: {
      auftragId: string
      handwerkerId: string
      gewerkId: string
      zuweisungId: string
    }) => {
      startWizardTransition(async () => {
        const res = await openHandwerkerAcceptWizard(ctx)
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        setWizardBootstrap(res.bootstrap)
      })
    },
    []
  )

  return (
    <section id="handwerker-partner" className="space-y-6 scroll-mt-24">
      <Card className="p-4 md:p-5">
        <h2 className="mb-3 text-sm font-semibold text-bw-text">Handwerker & Partner-Portal</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-bw-text-muted">Keine Handwerker zugewiesen.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((z) => (
              <ZuweisungCard
                key={z.id}
                z={z}
                angebotId={detail.id}
                angebotTitel={angebotTitel}
                auftragId={auftragId}
                onRefresh={() => router.refresh()}
                onAcceptWizard={auftragId ? openAcceptWizard : undefined}
              />
            ))}
          </div>
        )}
      </Card>

      <AngebotVersandSection
        mode="handwerker"
        detail={detail}
        bruttoMin={bruttoMin}
        bruttoMax={bruttoMax}
        positionen={positionen}
        gueltigBis={gueltigBis}
        auftragId={auftragId}
        angebotTitel={angebotTitel}
        onAcceptWizard={auftragId ? openAcceptWizard : undefined}
      />

      {wizardPending ? (
        <p className="sr-only" aria-live="polite">
          Nachunternehmervertrag wird geladen…
        </p>
      ) : null}

      {wizardBootstrap ? (
        <ProjektVertragWizard
          bootstrap={wizardBootstrap}
          onClose={() => setWizardBootstrap(null)}
          onDone={() => {
            setWizardBootstrap(null)
            router.refresh()
          }}
        />
      ) : null}
    </section>
  )
}
