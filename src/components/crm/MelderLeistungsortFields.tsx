'use client'

import { AnlageTeilPicker } from '@/components/crm/AnlageTeilPicker'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { kundenObjektKurzlabel } from '@/lib/kunden-objekte'
import type { Gewerk, KundenObjekt } from '@/lib/types'

export type MelderLeistungsortDraft = {
  melder_name: string
  melder_telefon: string
  melder_email: string
  melder_einheit: string
  kunde_objekt_id: string | null
  objekt_anlage_id: string | null
}

export function MelderLeistungsortFields({
  draft,
  onChange,
  objekte,
  onNeuObjekt,
  disabled = false,
  hideMelder = false,
  kundeId = null,
  gewerke = [],
}: {
  draft: MelderLeistungsortDraft
  onChange: (patch: Partial<MelderLeistungsortDraft>) => void
  objekte: KundenObjekt[]
  onNeuObjekt?: () => void
  disabled?: boolean
  /** Rechnung: nur Objekt/Leistungsort, ohne Melder-Block. */
  hideMelder?: boolean
  /** HV-Auftraggeber — für Anlagen-Picker und Inline-Anlage. */
  kundeId?: string | null
  gewerke?: Gewerk[]
}) {
  function patchLeistungsort(p: Partial<MelderLeistungsortDraft>) {
    if (
      p.kunde_objekt_id !== undefined &&
      p.kunde_objekt_id !== draft.kunde_objekt_id &&
      p.objekt_anlage_id === undefined
    ) {
      onChange({ ...p, objekt_anlage_id: null })
      return
    }
    onChange(p)
  }

  return (
    <>
      <MockFormSection title="Leistungsort" icon="map-pin">
        <MockField label="Objekt" full>
          <select
            className="sel sel--choice"
            value={draft.kunde_objekt_id ?? ''}
            disabled={disabled}
            onChange={(e) =>
              patchLeistungsort({ kunde_objekt_id: e.target.value.trim() || null })
            }
          >
            <option value="">Kein Objekt gewählt</option>
            {objekte.map((o) => (
              <option key={o.id} value={o.id}>
                {kundenObjektKurzlabel(o)}
              </option>
            ))}
          </select>
        </MockField>
        {onNeuObjekt ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <button
              type="button"
              className="btn ghost sm"
              disabled={disabled}
              onClick={onNeuObjekt}
            >
              Objekt anlegen
            </button>
          </div>
        ) : null}
        <AnlageTeilPicker
          kundeId={kundeId}
          kundeObjektId={draft.kunde_objekt_id}
          value={draft.objekt_anlage_id}
          onChange={(objekt_anlage_id) => patchLeistungsort({ objekt_anlage_id })}
          gewerke={gewerke}
          disabled={disabled}
        />
      </MockFormSection>

      {hideMelder ? null : (
      <MockFormSection title="Melder" icon="user">
        <MockField label="Name" full>
          <input
            className="txt"
            value={draft.melder_name}
            disabled={disabled}
            placeholder="Vor- und Nachname"
            onChange={(e) => onChange({ melder_name: e.target.value })}
          />
        </MockField>
        <MockField label="Telefon">
          <input
            className="txt"
            value={draft.melder_telefon}
            disabled={disabled}
            inputMode="tel"
            onChange={(e) => onChange({ melder_telefon: e.target.value })}
          />
        </MockField>
        <MockField label="E-Mail">
          <input
            className="txt"
            type="email"
            value={draft.melder_email}
            disabled={disabled}
            onChange={(e) => onChange({ melder_email: e.target.value })}
          />
        </MockField>
        <MockField label="Einheit" hint="Wohnung / Stockwerk / Tür">
          <input
            className="txt"
            value={draft.melder_einheit}
            disabled={disabled}
            placeholder="z. B. EG links"
            onChange={(e) => onChange({ melder_einheit: e.target.value })}
          />
        </MockField>
      </MockFormSection>
      )}
    </>
  )
}

export function draftFromLeadMelder(lead: {
  melder_name?: string | null
  melder_telefon?: string | null
  melder_email?: string | null
  melder_einheit?: string | null
  kunde_objekt_id?: string | null
  objekt_anlage_id?: string | null
  kontakt_telefon?: string | null
  kontakt_email?: string | null
}): MelderLeistungsortDraft {
  return {
    melder_name: lead.melder_name?.trim() || '',
    melder_telefon: lead.melder_telefon?.trim() || lead.kontakt_telefon?.trim() || '',
    melder_email: lead.melder_email?.trim() || lead.kontakt_email?.trim() || '',
    melder_einheit: lead.melder_einheit?.trim() || '',
    kunde_objekt_id: lead.kunde_objekt_id?.trim() || null,
    objekt_anlage_id: lead.objekt_anlage_id?.trim() || null,
  }
}
