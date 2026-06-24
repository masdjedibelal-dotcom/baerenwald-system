import Link from 'next/link'
import { stammdatenDetailHref, stammdatenTypLabel, type StammdatenKontaktTreffer } from '@/lib/stammdaten-kontakt'

export function StammdatenVerknuepfungen({
  verwandte,
}: {
  verwandte: StammdatenKontaktTreffer[]
}) {
  if (!verwandte.length) return null

  return (
    <div className="rounded-lg border border-bw-border bg-bw-hover/40 px-3 py-2.5 text-sm text-bw-text">
      <p className="font-medium text-bw-text">Gleiche Kontaktdaten — separater Stammdatensatz</p>
      <p className="mt-1 text-xs text-bw-text-muted">
        Kunde, Handwerker und Partner bleiben bewusst getrennt. Ein Account kann in beiden Rollen vorkommen.
      </p>
      <ul className="mt-2 space-y-1">
        {verwandte.map((v) => (
          <li key={`${v.typ}-${v.id}`}>
            <Link href={stammdatenDetailHref(v.typ, v.id)} className="text-bw-link hover:underline">
              {stammdatenTypLabel(v.typ)}: {v.name}
            </Link>
            <span className="text-bw-text-muted">
              {' '}
              · {[v.email, v.telefon].filter(Boolean).join(' · ') || '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
