'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { toast } from '@/components/ui/app-toast'
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
    <MockCard
      title="Angebot-Vorlagen"
      icon="file-invoice"
      actions={
        <Link href="/einstellungen/vorlagen/neu" className="btn btn-primary btn-sm">
          + Neue Vorlage
        </Link>
      }
    >
      {vorlagen.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Noch keine Vorlagen angelegt.</p>
      ) : (
        <div style={{ margin: -14 }}>
          <div className="list-row head" style={{ gridTemplateColumns: '1fr auto' }}>
            <div>Vorlage</div>
            <div>Aktionen</div>
          </div>
          {vorlagen.map((v) => (
            <div
              key={v.id}
              className="list-row"
              style={{ gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8 }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{v.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                  {posCount(v)} Positionen · {betragAnzeige(v.gesamt_fix ?? null, v.gesamt_min, v.gesamt_max)}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Link
                  href={`/einstellungen/vorlagen/${v.id}`}
                  className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Bearbeiten
                </Link>
                <MockBtn sm onClick={() => void kopieren(v.id)}>
                  <Copy className="mr-1 h-4 w-4" aria-hidden />
                  Kopieren
                </MockBtn>
                <button
                  type="button"
                  className="qa-btn"
                  aria-label="Löschen"
                  onClick={() => void loeschen(v.id, v.name)}
                >
                  <Trash2 className="h-4 w-4" style={{ color: 'var(--red)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </MockCard>
  )
}
