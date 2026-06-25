'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { FilterChips } from '@/components/ui/FilterChips'
import { ComplianceEinstellungenClient } from '@/components/einstellungen/ComplianceEinstellungenClient'
import { CustomFieldsEinstellungenClient } from '@/components/einstellungen/CustomFieldsEinstellungenClient'
import { DatenschutzPageClient } from '@/components/datenschutz/DatenschutzPageClient'
import type { ComplianceTypRow } from '@/app/(dashboard)/einstellungen/compliance/actions'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import type {
  DatenschutzAnfrageRow,
  DatenschutzFaelligRow,
  DatenschutzFristRow,
  DatenschutzLoeschlogRow,
  DatenschutzVvtRow,
} from '@/lib/datenschutz/types'

type Section = 'compliance' | 'datenschutz' | 'felder'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'compliance', label: 'Compliance' },
  { id: 'datenschutz', label: 'Datenschutz' },
  { id: 'felder', label: 'Custom Fields' },
]

type Props = {
  compliance: ComplianceTypRow[]
  felder: CustomFieldDefinition[]
  datenschutz: {
    fristen: DatenschutzFristRow[]
    faellig: DatenschutzFaelligRow[]
    log: DatenschutzLoeschlogRow[]
    anfragen: DatenschutzAnfrageRow[]
    vvt: DatenschutzVvtRow[]
  }
}

function IntegrationInner({ compliance, felder, datenschutz }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get('section')
  const section: Section =
    raw === 'datenschutz' || raw === 'felder' || raw === 'compliance' ? raw : 'compliance'

  function setSection(id: Section) {
    const q = new URLSearchParams(searchParams.toString())
    q.set('section', id)
    router.replace(`/einstellungen/integration?${q.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-4">
      <FilterChips
        options={SECTIONS.map((s) => ({ label: s.label, value: s.id }))}
        selected={[section]}
        onChange={(v) => setSection((v[0] as Section) ?? 'compliance')}
      />

      {section === 'compliance' ? <ComplianceEinstellungenClient initial={compliance} /> : null}
      {section === 'felder' ? <CustomFieldsEinstellungenClient initial={felder} /> : null}
      {section === 'datenschutz' ? (
        <DatenschutzPageClient
          fristen={datenschutz.fristen}
          faellig={datenschutz.faellig}
          log={datenschutz.log}
          anfragen={datenschutz.anfragen}
          vvt={datenschutz.vvt}
        />
      ) : null}

      <p className="text-xs text-bw-text-muted">
        Direktlinks:{' '}
        <Link href="/einstellungen/integration?section=compliance" className="text-bw-link hover:underline">
          Compliance
        </Link>
        {' · '}
        <Link href="/einstellungen/integration?section=datenschutz" className="text-bw-link hover:underline">
          Datenschutz
        </Link>
        {' · '}
        <Link href="/einstellungen/integration?section=felder" className="text-bw-link hover:underline">
          Felder
        </Link>
      </p>
    </div>
  )
}

export function EinstellungenIntegrationClient(props: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-bw-text-muted">Laden …</p>}>
      <IntegrationInner {...props} />
    </Suspense>
  )
}
