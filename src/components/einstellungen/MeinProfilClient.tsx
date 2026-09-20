'use client'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { useLocalTransition } from '@/components/ui/action-busy'
import { useState } from 'react'
import { PropertyRow } from '@/components/ui/PropertyRow'
import { toast } from '@/components/ui/app-toast'
import { BrandAvatar } from '@/components/brand/BrandAvatar'
import {
  EinstellungenMeta,
  EinstellungenSectionHeading,
} from '@/components/einstellungen/EinstellungenUi'
import type { MeinProfilDaten } from '@/app/(dashboard)/einstellungen/profil/actions'
import { saveMeinProfil } from '@/app/(dashboard)/einstellungen/profil/actions'
import { TOAST } from '@/lib/copy'

export function MeinProfilClient({ initial }: { initial: MeinProfilDaten }) {
  const [name, setName] = useState(initial.name)
  const [telefon, setTelefon] = useState(initial.telefon)
  const [pending, startTransition] = useLocalTransition()

  function save() {
    startTransition(async () => {
      const r = await saveMeinProfil({ name, telefon })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.profil_gespeichert)
      // revalidatePath in saveMeinProfil — kein zusätzliches router.refresh
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section>
        <EinstellungenSectionHeading className="mb-3">Mein Profil</EinstellungenSectionHeading>
        <div className="mb-4 flex items-center gap-3">
          <BrandAvatar size={48} />
          <div>
            <div className="text-fs-title font-semibold text-bw-text">{name || 'Profil'}</div>
            <div className="text-fs-text text-bw-text-muted">{initial.email || '—'}</div>
          </div>
        </div>
        <EinstellungenMeta className="mb-4">
          Name und Handynummer erscheinen im Kundenportal als Ansprechpartner, wenn du Betreuer eines
          Auftrags bist.
        </EinstellungenMeta>
        <div className="space-y-1">
          <PropertyRow label="E-Mail" value={initial.email || '—'} editable={false} />
        </div>
        <div className="mt-4 space-y-3">
          <MockField label="Anzeigename" required><MockInput required value={name} onChange={(e) => setName(e.target.value)} /></MockField>
          <MockField label="Handy / Direktwahl"><MockInput type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="+49 …" /></MockField>
        </div>
        <div className="mt-6 flex justify-end">
          <MockBtn type="button" kind="primary" loading={pending} onClick={() => save()}>
            Speichern
          </MockBtn>
        </div>
      </section>

      <section>
        <EinstellungenSectionHeading className="mb-2">Rolle</EinstellungenSectionHeading>
        <p className="text-fs-title font-medium capitalize text-bw-text">{initial.rolle}</p>
        <EinstellungenMeta className="mt-1">
          Rollen ändern nur Admins unter Tab „Team“.
        </EinstellungenMeta>
      </section>
    </div>
  )
}
