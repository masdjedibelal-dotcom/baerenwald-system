import Link from 'next/link'
import { HardHat, Phone, Plus, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ListAvatar } from '@/components/ui/ListAvatar'
import type { EmpfohlenerHandwerker } from '@/lib/empfohlene-handwerker'

import { formatHandwerkerBewertung } from '@/lib/handwerker/bewertung-kategorien'

export function EmpfohleneHandwerkerCard({ handwerker }: { handwerker: EmpfohlenerHandwerker[] }) {
  if (!handwerker.length) {
    return (
      <Card
        title={
          <>
            <HardHat className="h-4 w-4 text-bw-primary" aria-hidden />
            Empfohlene Handwerker
          </>
        }
      >
        <p className="text-[13px] text-bw-text-muted">Keine Vorschläge für diese Anfrage.</p>
      </Card>
    )
  }

  return (
    <Card
      title={
        <>
          <HardHat className="h-4 w-4 text-bw-primary" aria-hidden />
          Empfohlene Handwerker
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {handwerker.map((h) => (
          <div key={`${h.id}-${h.gewerkSlug}`} className="flex items-center gap-2.5">
            <ListAvatar name={h.name} className="!h-[26px] !w-[26px] !text-[10px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-bw-text">{h.name}</p>
              <p className="truncate text-[11.5px] text-bw-text-muted">{h.gewerkName}</p>
            </div>
            {h.verfuegbar ? (
              <span
                className="inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums text-bw-text-muted"
                title="Durchschnittsbewertung"
              >
                <Star className="h-2.5 w-2.5 shrink-0 fill-none text-bw-text-muted" aria-hidden strokeWidth={2} />
                {formatHandwerkerBewertung(h.bewertung_note)}
              </span>
            ) : (
              <span className="text-[11px] text-bw-text-muted">Im Einsatz</span>
            )}
            <Link
              href={`/handwerker/${h.id}`}
              className="btn btn-ghost btn-sm !h-7 !min-h-0 !w-7 !p-0"
              aria-label={`${h.name} öffnen`}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </Link>
            {h.telefon ? (
              <a
                href={`tel:${h.telefon.replace(/\s/g, '')}`}
                className="btn btn-ghost btn-sm !h-7 !min-h-0 !w-7 !p-0"
                aria-label={`${h.name} anrufen`}
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  )
}
