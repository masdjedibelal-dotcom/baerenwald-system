'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PropertyRow } from '@/components/ui/PropertyRow'
import { toast } from '@/components/ui/app-toast'
import { BrandAvatar } from '@/components/brand/BrandAvatar'
import {
  EinstellungenMeta,
  EinstellungenSectionHeading,
} from '@/components/einstellungen/EinstellungenUi'
import type { MeinProfilDaten } from '@/app/(dashboard)/einstellungen/profil/actions'
import { saveMeinProfil } from '@/app/(dashboard)/einstellungen/profil/actions'
import { useRouter } from 'next/navigation'

export function MeinProfilClient({ initial }: { initial: MeinProfilDaten }) {
  const router = useRouter()
  const [name, setName] = useState(initial.name)
  const [telefon, setTelefon] = useState(initial.telefon)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const r = await saveMeinProfil({ name, telefon })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Profil gespeichert')
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section>
        <EinstellungenSectionHeading className="mb-3">Mein Profil</EinstellungenSectionHeading>
        <div className="mb-4 flex items-center gap-3">
          <BrandAvatar size={48} />
          <div>
            <div className="text-[14px] font-semibold text-bw-text">{name || 'Profil'}</div>
            <div className="text-[12.5px] text-bw-text-muted">{initial.email || '—'}</div>
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
          <Input label="Anzeigename" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Handy / Direktwahl"
            type="tel"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            placeholder="+49 …"
            hint="Wird Kunden im Portal und in Termin-Mails angezeigt."
          />
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="button" variant="primary" loading={pending} onClick={() => save()}>
            Speichern
          </Button>
        </div>
      </section>

      <section>
        <EinstellungenSectionHeading className="mb-2">Rolle</EinstellungenSectionHeading>
        <p className="text-[13.5px] font-medium capitalize text-bw-text">{initial.rolle}</p>
        <EinstellungenMeta className="mt-1">
          Rollen ändern nur Admins unter Tab „Team“.
        </EinstellungenMeta>
      </section>
    </div>
  )
}
