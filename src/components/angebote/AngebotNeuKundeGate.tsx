'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { KundeAuswahlFeld } from '@/components/kunden/KundeAuswahlFeld'
import { createKundeHref } from '@/lib/crm/create-entry'
import type { Kunde } from '@/lib/types'

/**
 * Schritt 1 für neues Angebot (wie Anfrage-Funnel): Kunde wählen, dann Wizard.
 * Kein FAB-Modal-Zwischenschritt.
 */
export function AngebotNeuKundeGate() {
  const router = useRouter()
  const [kundeId, setKundeId] = useState<string | null>(null)
  const [kunde, setKunde] = useState<Kunde | null>(null)
  const [error, setError] = useState<string | null>(null)

  function weiter() {
    if (!kundeId) {
      setError('Bitte einen Kunden wählen.')
      return
    }
    setError(null)
    router.replace(`/angebote/neu?kunde_id=${encodeURIComponent(kundeId)}`)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <MockEmpty
        icon="file-invoice"
        title="Neues Angebot"
        hint="Zuerst den Kunden wählen — danach öffnet sich der Angebots-Assistent."
      />
      <MockFormSection className="mt-2">
        <MockField label="Kunde" required full>
          <KundeAuswahlFeld
            hint="Suche nach Name, E-Mail oder Telefon."
            kundeId={kundeId}
            bekannterKunde={kunde}
            onKundeIdChange={(id) => {
              setKundeId(id)
              setError(null)
            }}
            onKundeGewaehlt={setKunde}
          />
        </MockField>
        {error ? <p className="text-sm text-bw-danger">{error}</p> : null}
        <p className="text-[12px] text-bw-text-muted">
          Noch kein Kunde?{' '}
          <button
            type="button"
            className="text-bw-link underline"
            onClick={() => router.push(createKundeHref())}
          >
            Kunden anlegen
          </button>
        </p>
      </MockFormSection>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <MockBtn kind="ghost" onClick={() => router.replace('/vorgaenge?tab=angebot')}>
          Abbrechen
        </MockBtn>
        <MockBtn kind="primary" icon="arrow-right" disabled={!kundeId} onClick={weiter}>
          Weiter zum Angebot
        </MockBtn>
      </div>
    </div>
  )
}
