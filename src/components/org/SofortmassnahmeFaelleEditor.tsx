'use client'

import { useMemo, useState } from 'react'
import { MockModal } from '@/components/mock-ui/MockModal'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  akutFallLabel,
  SOFORTMASSNAHME_FAELLE_FOOTNOTE,
  SOFORTMASSNAHME_FAELLE_INTRO,
  SOFORTMASSNAHME_FAELLE_POPUP_TITLE,
  sofortmassnahmeFaelleGruppen,
  type AkutFallId,
} from '@/lib/org/sofortmassnahme-faelle'
import { cn } from '@/lib/utils'

type Props = {
  selected: readonly string[]
  onChange: (next: AkutFallId[]) => void
  disabled?: boolean
  className?: string
}

/** Leere Liste + Fälle aus Katalog hinzufügen (CRM-Freigabe, Parität Portal). */
export function SofortmassnahmeFaelleEditor({
  selected,
  onChange,
  disabled = false,
  className,
}: Props) {
  const [katalogOpen, setKatalogOpen] = useState(false)
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const gruppen = useMemo(() => sofortmassnahmeFaelleGruppen(), [])

  function remove(id: string) {
    onChange(selected.filter((x) => x !== id) as AkutFallId[])
  }

  function add(id: AkutFallId) {
    if (selectedSet.has(id)) return
    onChange([...selected, id] as AkutFallId[])
  }

  const availableCount = gruppen.reduce(
    (n, g) => n + g.faelle.filter((f) => !selectedSet.has(f.id)).length,
    0
  )

  return (
    <div className={cn('sofortmassnahme-faelle', className)}>
      <p className="sofortmassnahme-faelle__intro">{SOFORTMASSNAHME_FAELLE_INTRO}</p>

      {selected.length === 0 ? (
        <p className="sofortmassnahme-faelle__empty">Noch keine Fälle — nichts geht direkt.</p>
      ) : (
        <ul className="sofortmassnahme-faelle__list">
          {selected.map((id) => (
            <li key={id} className="sofortmassnahme-faelle__item">
              <span className="sofortmassnahme-faelle__item-label">{akutFallLabel(id)}</span>
              {!disabled ? (
                <button
                  type="button"
                  className="sofortmassnahme-faelle__remove"
                  aria-label="Fall entfernen"
                  onClick={() => remove(id)}
                >
                  <MockIcon ctx="btn" n="x" size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!disabled && availableCount > 0 ? (
        <MockBtn
          sm
          kind="secondary"
          icon="plus"
          type="button"
          onClick={() => setKatalogOpen(true)}
        >
          {SOFORTMASSNAHME_FAELLE_POPUP_TITLE}
        </MockBtn>
      ) : null}

      <p className="sofortmassnahme-faelle__footnote">{SOFORTMASSNAHME_FAELLE_FOOTNOTE}</p>

      <MockModal
        open={katalogOpen}
        onClose={() => setKatalogOpen(false)}
        icon="plus"
        title={SOFORTMASSNAHME_FAELLE_POPUP_TITLE}
        size="md"
      >
        <div className="sofortmassnahme-faelle__katalog">
          {gruppen.map((g) => {
            const openFaelle = g.faelle.filter((f) => !selectedSet.has(f.id))
            if (!openFaelle.length) return null
            return (
              <div key={g.bereich} className="sofortmassnahme-faelle__gruppe">
                <p className="sofortmassnahme-faelle__gruppe-title">{g.bereich}</p>
                <ul className="sofortmassnahme-faelle__katalog-list">
                  {openFaelle.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        className="sofortmassnahme-faelle__katalog-btn"
                        onClick={() => add(f.id)}
                      >
                        <MockIcon ctx="btn" n="plus" size={14} />
                        <span>{f.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </MockModal>
    </div>
  )
}
