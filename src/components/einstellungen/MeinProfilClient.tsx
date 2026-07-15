'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PropertyRow } from '@/components/ui/PropertyRow'
import { toast } from '@/components/ui/app-toast'
import { EinstellungenMeta } from '@/components/einstellungen/EinstellungenUi'
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
    <div className="mx-auto max-w-2xl space-y-4">
      <Card title="Mein Profil">
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
      </Card>

      <Card title="Rolle">
        <p className="text-[13.5px] font-medium capitalize text-bw-text">{initial.rolle}</p>
        <EinstellungenMeta className="mt-1">
          Rollen ändern nur Admins unter Tab „Team“.
        </EinstellungenMeta>
      </Card>
    </div>
  )
}
