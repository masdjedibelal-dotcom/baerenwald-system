'use client'

import { resolveMockIcon } from '@/lib/mock-icons'
import { Card } from '@/components/ui/Card'
import { AuftragBautagesberichtCard } from '@/components/auftraege/AuftragBautagesberichtCard'
import { BaustelleTeamCard } from '@/components/auftraege/BaustelleTeamCard'
import { BaustelleRegiearbeitenCard } from '@/components/auftraege/BaustelleRegiearbeitenCard'
import { BaustelleWochenberichteCard } from '@/components/auftraege/BaustelleWochenberichteCard'
import { BaustelleBerichteDokumenteCard } from '@/components/auftraege/BaustelleBerichteDokumenteCard'
import type { AuftragBautagesbericht } from '@/lib/auftraege/bautagesbericht-types'
import type {
  AuftragBaustelleTeam,
  AuftragBaustellenDokument,
  AuftragRegiearbeit,
  AuftragWochenbericht } from '@/lib/auftraege/baustelle-types'
import type { AuftragHandwerkerRow } from '@/lib/types'


const ToolIcon = resolveMockIcon('tool')

export function AuftragBaustelleTab({
  auftragId,
  team,
  bautagesberichte,
  regiearbeiten,
  wochenberichte,
  baustellenDokumente,
  kundeName,
  kundeAdresse,
  handwerker,
  onChanged }: {
  auftragId: string
  team: AuftragBaustelleTeam
  bautagesberichte: AuftragBautagesbericht[]
  regiearbeiten: AuftragRegiearbeit[]
  wochenberichte: AuftragWochenbericht[]
  baustellenDokumente: AuftragBaustellenDokument[]
  kundeName: string
  kundeAdresse: string
  handwerker: AuftragHandwerkerRow[]
  onChanged: () => void
}) {
  return (
    <div className="space-y-3">
      <Card
        title="Baustellen-Team"
        bodyClassName="p-4"
        action={
          team.bauleiter_name?.trim() ? (
            <span className="inline-flex items-center gap-1 text-xs text-bw-text-muted">
              <ToolIcon className="h-3.5 w-3.5" aria-hidden />
              Eigenregie
            </span>
          ) : null
        }
      >
        <BaustelleTeamCard auftragId={auftragId} team={team} onChanged={onChanged} />
      </Card>

      <Card title="Tagesberichte" bodyClassName="p-4">
        <AuftragBautagesberichtCard
          auftragId={auftragId}
          berichte={bautagesberichte}
          kundeName={kundeName}
          kundeAdresse={kundeAdresse}
          handwerker={handwerker}
          onChanged={onChanged}
        />
      </Card>

      <Card title="Regiearbeiten" bodyClassName="p-4">
        <BaustelleRegiearbeitenCard
          auftragId={auftragId}
          regiearbeiten={regiearbeiten}
          onChanged={onChanged}
        />
      </Card>

      <Card title="Wochenberichte" bodyClassName="p-4">
        <BaustelleWochenberichteCard
          auftragId={auftragId}
          wochenberichte={wochenberichte}
          onChanged={onChanged}
        />
      </Card>

      <Card title="Baustellen-Dokumente" bodyClassName="p-4">
        <BaustelleBerichteDokumenteCard
          auftragId={auftragId}
          dokumente={baustellenDokumente}
          onChanged={onChanged}
        />
      </Card>
    </div>
  )
}
