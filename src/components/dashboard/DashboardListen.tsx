'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { MobileSortSelect } from '@/components/ui/MobileSortSelect'
import { useSort } from '@/hooks/useSort'
import { DashboardAnfrageZeile } from '@/components/dashboard/DashboardAnfrageZeile'
import { DashboardAngebotZeile } from '@/components/dashboard/DashboardAngebotZeile'
import { DashboardAuftragZeile } from '@/components/dashboard/DashboardAuftragZeile'
import { DashboardHWZeile } from '@/components/dashboard/DashboardHWZeile'
import { DashboardTermineTab } from '@/components/dashboard/DashboardTermineTab'
import type { HandwerkerZeile } from '@/components/handwerker/HandwerkerListeClient'
import type { KalenderTermin } from '@/lib/types'
import type { LeadWithAngebote } from '@/lib/types'
import type { AngebotListeEintrag } from '@/lib/types'
import type { AuftragListeEintrag } from '@/lib/types'
import type { LeadStatus } from '@/lib/types'
import { leadNameSort } from '@/components/dashboard/dashboard-list-utils'

type SortLead = { lead: LeadWithAngebote; name: string; created_at: string; status: LeadStatus }

export function DashboardListen({
  anfragen,
  angebote,
  auftraege,
  handwercherZeilen,
  termine,
}: {
  anfragen: LeadWithAngebote[]
  angebote: AngebotListeEintrag[]
  auftraege: AuftragListeEintrag[]
  handwercherZeilen: HandwerkerZeile[]
  termine: KalenderTermin[]
}) {
  const sortRows: SortLead[] = useMemo(
    () =>
      anfragen.map((lead) => ({
        lead,
        name: leadNameSort(lead),
        created_at: lead.created_at,
        status: lead.status,
      })),
    [anfragen]
  )

  const { sorted, field, dir, handleSort, resetSort } = useSort(sortRows)

  return (
    <Card flush className="overflow-hidden">
      <Tabs
        tabs={[
          { id: 'anfragen', label: 'Anfragen', count: anfragen.length },
          { id: 'angebote', label: 'Angebote', count: angebote.length },
          { id: 'auftraege', label: 'Aufträge', count: auftraege.length },
          { id: 'handwercher', label: 'Handwercher', count: handwercherZeilen.length },
          { id: 'termine', label: 'Termine', count: termine.length },
        ]}
        defaultTab="anfragen"
      >
        <div>
          <MobileSortSelect
            options={[
              { field: 'name', label: 'Name' },
              { field: 'created_at', label: 'Datum' },
              { field: 'status', label: 'Status' },
            ]}
            currentField={field}
            currentDir={dir}
            onSort={(f) => (f ? handleSort(f) : resetSort())}
          />
          {anfragen.length === 0 ? (
            <div className="py-8 text-center text-sm text-bw-text-muted">Keine Anfragen</div>
          ) : (
            <>
              <div className="divide-y divide-bw-border">
                {sorted.map(({ lead }) => (
                  <DashboardAnfrageZeile key={lead.id} anfrage={lead} />
                ))}
              </div>
              <div className="border-t border-bw-border px-4 py-3">
                <Link href="/anfragen" className="text-sm text-bw-link hover:underline">
                  Alle Anfragen ansehen
                </Link>
              </div>
            </>
          )}
        </div>

        <div>
          {angebote.length === 0 ? (
            <div className="py-8 text-center text-sm text-bw-text-muted">Keine Angebote</div>
          ) : (
            <div className="divide-y divide-bw-border">
              {angebote.map((a) => (
                <DashboardAngebotZeile key={a.id} angebot={a} />
              ))}
            </div>
          )}
          <div className="border-t border-bw-border px-4 py-3">
            <Link href="/angebote" className="text-sm text-bw-link hover:underline">
              Alle Angebote ansehen
            </Link>
          </div>
        </div>

        <div>
          {auftraege.length === 0 ? (
            <div className="py-8 text-center text-sm text-bw-text-muted">Keine Aufträge</div>
          ) : (
            <div className="divide-y divide-bw-border">
              {auftraege.map((a) => (
                <DashboardAuftragZeile key={a.id} auftrag={a} />
              ))}
            </div>
          )}
          <div className="border-t border-bw-border px-4 py-3">
            <Link href="/auftraege" className="text-sm text-bw-link hover:underline">
              Alle Aufträge ansehen
            </Link>
          </div>
        </div>

        <div>
          {handwercherZeilen.length === 0 ? (
            <div className="py-8 text-center text-sm text-bw-text-muted">Keine Handwercher</div>
          ) : (
            <div className="divide-y divide-bw-border">
              {handwercherZeilen.map((h) => (
                <DashboardHWZeile key={h.id} row={h} />
              ))}
            </div>
          )}
          <div className="border-t border-bw-border px-4 py-3">
            <Link href="/handwerker" className="text-sm text-bw-link hover:underline">
              Alle Handwercher ansehen
            </Link>
          </div>
        </div>

        <div>
          <DashboardTermineTab termine={termine} />
          <div className="border-t border-bw-border px-4 py-3">
            <Link href="/kalender" className="text-sm text-bw-link hover:underline">
              Kalender öffnen
            </Link>
          </div>
        </div>
      </Tabs>
    </Card>
  )
}
