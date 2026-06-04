'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import {
  EinstellungenListBody,
  EinstellungenListItem,
  EinstellungenListMeta,
} from '@/components/einstellungen/EinstellungenUi'
import type { AngebotVorlage } from '@/lib/types'
import { duplicateAngebotVorlage, deleteAngebotVorlage } from '@/app/(dashboard)/angebote/actions'
import { betragAnzeige } from '@/lib/angebot-einfach'

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
    if (!confirm(`Vorlage „${name}" wirklich löschen?`)) return
    const r = await deleteAngebotVorlage(id)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    toast.success('Gelöscht')
    router.refresh()
  }

  return (
    <Card
      title="Angebot-Vorlagen"
      action={
        <Link href="/einstellungen/vorlagen/neu" className="btn btn-primary btn-sm">
          + Neue Vorlage
        </Link>
      }
    >
      <EinstellungenListBody empty={vorlagen.length === 0 ? 'Noch keine Vorlagen angelegt.' : undefined}>
        {vorlagen.map((v) => (
          <EinstellungenListItem key={v.id}>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-bw-text">{v.name}</p>
              <EinstellungenListMeta>
                {posCount(v)} Positionen · {betragAnzeige(v.gesamt_fix ?? null, v.gesamt_min, v.gesamt_max)}
              </EinstellungenListMeta>
            </div>
            <div className="flex flex-wrap gap-1">
              <Link
                href={`/einstellungen/vorlagen/${v.id}`}
                className="btn btn-secondary btn-sm inline-flex items-center gap-1"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Bearbeiten
              </Link>
              <Button variant="secondary" size="sm" type="button" onClick={() => void kopieren(v.id)}>
                <Copy className="mr-1 h-4 w-4" aria-hidden />
                Kopieren
              </Button>
              <button
                type="button"
                className="btn btn-ghost btn-sm text-status-cancel-text"
                aria-label="Löschen"
                onClick={() => void loeschen(v.id, v.name)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </EinstellungenListItem>
        ))}
      </EinstellungenListBody>
    </Card>
  )
}
