'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, ClipboardList, Download, ExternalLink, Plus, Trash2, Wrench } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import {
  deleteAbnahmeprotokoll,
  loadAbnahmeprotokolleListe,
  loadAbnahmeprotokollSummary,
  type AbnahmeprotokollListeEintrag,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { countOffeneMaengel } from '@/lib/auftraege/abnahme-maengel-helpers'
import { formatDatum } from '@/lib/utils'

export function AuftragAbnahmeprotokollCard({
  auftragId,
  onChanged,
}: {
  auftragId: string
  onChanged?: () => void
}) {
  const router = useRouter()
  const [liste, setListe] = useState<AbnahmeprotokollListeEintrag[]>([])
  const [offeneMaengel, setOffeneMaengel] = useState(0)
  const [pending, startTransition] = useTransition()

  const reload = useCallback(() => {
    void loadAbnahmeprotokolleListe(auftragId).then(setListe)
    void loadAbnahmeprotokollSummary(auftragId).then((s) => {
      setOffeneMaengel(s ? countOffeneMaengel(s.maengel) : 0)
    })
  }, [auftragId])

  useEffect(() => {
    reload()
  }, [reload])

  function loeschen(id: string) {
    if (!window.confirm('Abnahmeprotokoll wirklich löschen?')) return
    startTransition(async () => {
      const r = await deleteAbnahmeprotokoll(id, auftragId)
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Protokoll gelöscht')
        reload()
        onChanged?.()
        router.refresh()
      }
    })
  }

  return (
    <Card
      id="auftrag-abnahmeprotokoll"
      title="Abnahmeprotokoll"
      className="scroll-mt-24"
      bodyClassName="p-4"
      action={
        <div className="flex flex-wrap gap-2">
          {liste.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/auftraege/${auftragId}/abnahme`)}
            >
              <ClipboardList className="mr-1.5 h-4 w-4" aria-hidden />
              Vor Ort
            </Button>
          ) : null}
          {offeneMaengel > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/auftraege/${auftragId}/abnahme/maengel`)}
            >
              <Wrench className="mr-1.5 h-4 w-4" aria-hidden />
              Mängel ({offeneMaengel})
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/auftraege/${auftragId}/abnahme/erstellen`)}
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Neu
          </Button>
        </div>
      }
    >
      {offeneMaengel > 0 ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <strong>{offeneMaengel}</strong> offene Mängel — bitte unter „Mängel bearbeiten“ nacharbeiten und
          dokumentieren.
        </p>
      ) : null}

      {liste.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-bw-text-muted">
            Checkliste aus Gewerken und Leistungen — PDF zum Ausdrucken oder digital vor Ort ausfüllen.
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => router.push(`/auftraege/${auftragId}/abnahme/erstellen`)}
          >
            <ClipboardCheck className="mr-1.5 h-4 w-4" aria-hidden />
            Abnahmeprotokoll erstellen
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-bw-border rounded-lg border border-bw-border">
          {liste.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-bw-text">
                  Abnahme {formatDatum(p.abnahme_datum)}
                </p>
                <p className="text-[12px] text-bw-text-muted">
                  Erstellt {formatDatum(p.created_at.slice(0, 10))}
                  {p.an_kunde_gesendet_at ? ' · An Kunde gesendet' : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.pdf_url ? (
                  <>
                    <a
                      href={p.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />
                      PDF öffnen
                    </a>
                    <a href={p.pdf_url} download className="btn btn-secondary btn-sm">
                      <Download className="mr-1.5 h-4 w-4" aria-hidden />
                      Download
                    </a>
                  </>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  loading={pending}
                  onClick={() => loeschen(p.id)}
                  aria-label="Protokoll löschen"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
