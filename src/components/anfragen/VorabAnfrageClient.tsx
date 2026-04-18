'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { FormularTemplate } from '@/lib/types'
import { toast } from 'sonner'
import { upsertVorabFormularByLead } from '@/app/(dashboard)/anfragen/actions'
import { FormularFelderRenderer, validateFormularPflicht } from '@/components/formulare/FormularFelderRenderer'
import { FORMULAR_PHASE_LABELS } from '@/lib/utils'

function initialFromFelder(felder: FormularTemplate['felder'], saved: Record<string, unknown>) {
  const o: Record<string, unknown> = { ...saved }
  for (const f of felder) {
    if (o[f.id] === undefined) {
      if (f.typ === 'checkbox') o[f.id] = false
      else o[f.id] = ''
    }
  }
  return o
}

export function VorabAnfrageClient({
  leadId,
  kundenName,
  template,
  savedDaten,
}: {
  leadId: string
  kundenName: string
  template: FormularTemplate
  savedDaten: Record<string, unknown>
}) {
  const router = useRouter()
  const [daten, setDaten] = useState(() => initialFromFelder(template.felder, savedDaten))
  const [pending, startTransition] = useTransition()

  const phaseLabel = template.phase ? FORMULAR_PHASE_LABELS[template.phase] ?? template.phase : ''

  const onChange = useCallback((id: string, value: unknown) => {
    setDaten((d) => ({ ...d, [id]: value }))
  }, [])

  function save() {
    const v = validateFormularPflicht(template.felder, daten)
    if (v) {
      toast.error(v)
      return
    }
    startTransition(async () => {
      const res = await upsertVorabFormularByLead({
        lead_id: leadId,
        template_id: template.id,
        daten,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Vorab-Formular gespeichert')
      router.push(`/anfragen/${leadId}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <header className="sticky top-0 z-20 -mx-4 border-b border-border bg-canvas/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/anfragen/${leadId}`}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-surface"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold text-ink">Vorab vor Ort</h1>
        </div>
        <p className="mt-1 text-sm text-muted">{kundenName}</p>
      </header>

      <Card className="p-4">
        <h2 className="text-lg font-semibold text-ink">{template.name}</h2>
        {phaseLabel ? (
          <span className="mt-2 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            {phaseLabel}
          </span>
        ) : null}
        <div className="mt-6">
          <FormularFelderRenderer felder={template.felder} daten={daten} onChange={onChange} />
        </div>
        <Button type="button" className="mt-6 w-full sm:w-auto" variant="primary" onClick={save} loading={pending}>
          Speichern
        </Button>
      </Card>
    </div>
  )
}
