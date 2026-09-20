import { MockIcon } from '@/components/mock-ui/MockIcon'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { C } from '@/lib/tokens/colors'

export function KundeMapPreview({
  adresse,
  plz,
  ort,
}: {
  adresse?: string | null
  plz?: string | null
  ort?: string | null
}) {
  const q = [adresse, plz, ort].filter(Boolean).join(', ').trim()
  if (!q) return null

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

  return (
    <Card flush className="overflow-hidden">
      <div
        className="relative flex h-36 flex-col items-center justify-center bg-gradient-to-br from-bw-green-bg to-bw-bg-soft"
        aria-hidden
      >
        <MockIcon n="map-pin" ctx="default" className="h-10 w-10 text-bw-primary/50" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              `linear-gradient(var(--bw-border,${C.greenWash}) 1px, transparent 1px), linear-gradient(90deg, var(--bw-border,${C.greenWash}) 1px, transparent 1px)`,
            backgroundSize: '1.5rem 1.5rem',
          }}
        />
      </div>
      <div className="border-t border-bw-border px-3 py-2.5">
        <p className="truncate text-xs text-bw-text-muted">{q}</p>
        <Link
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs font-medium text-bw-link hover:underline"
        >
          In Google Maps öffnen
        </Link>
      </div>
    </Card>
  )
}
