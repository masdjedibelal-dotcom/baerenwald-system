'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Pencil, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import type { AngebotVorlage } from '@/lib/types'
import { duplicateAngebotVorlage, deleteAngebotVorlage } from '@/app/(dashboard)/angebote/actions'
import { formatPreis } from '@/lib/utils'

function posCount(v: AngebotVorlage): number {
  return Array.isArray(v.positionen) ? v.positionen.length : 0
}

export function AngebotVorlagenListeClient({ vorlagen }: { vorlagen: AngebotVorlage[] }) {
  const router = useRouter()

  async function kopieren(id: string) {
    const r = await duplicateAngebotVorlage(id)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    toast.success('Vorlage kopiert')
    router.refresh()
  }

  async function loeschen(id: string, name: string) {
    if (!confirm(`Vorlage „${name}“ wirklich löschen?`)) return
    const r = await deleteAngebotVorlage(id)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    toast.success('Gelöscht')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/einstellungen/vorlagen/neu" className="btn-primary btn-lg">
          + Neue Vorlage
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {vorlagen.map((v) => (
          <Card key={v.id} className="relative">
            <div className="pr-10">
              <h3 className="text-md font-semibold text-bw-text">{v.name}</h3>
              <p className="mt-1 text-sm text-bw-light">
                {posCount(v)} Positionen · {formatPreis(v.gesamt_fix ?? null, v.gesamt_min, v.gesamt_max)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/einstellungen/vorlagen/${v.id}`}
                  className="btn-secondary btn-sm inline-flex items-center gap-1"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Bearbeiten
                </Link>
                <Button variant="secondary" size="sm" type="button" onClick={() => void kopieren(v.id)}>
                  <Copy className="mr-1 h-4 w-4" aria-hidden />
                  Kopieren
                </Button>
              </div>
            </div>
            <button
              type="button"
              className="absolute right-3 top-3 rounded p-1 text-bw-light hover:bg-bw-hover hover:text-bw-text"
              aria-label="Löschen"
              onClick={() => void loeschen(v.id, v.name)}
            >
              <X className="h-5 w-5" />
            </button>
          </Card>
        ))}
      </div>
      {vorlagen.length === 0 ? (
        <p className="text-sm text-bw-light">Noch keine Vorlagen angelegt.</p>
      ) : null}
    </div>
  )
}
