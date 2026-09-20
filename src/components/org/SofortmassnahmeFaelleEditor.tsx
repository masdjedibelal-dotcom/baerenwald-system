'use client'
import { MockBtn } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'

import { useMemo, useState } from 'react'
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
                <MockBtn className="sofortmassnahme-faelle__remove" type="button" aria-label="Fall löschen" onClick={() => remove(id)}>
                  <MockIcon ctx="btn" n="x" size={14} />
                </MockBtn>
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

      <EditorSheet
        open={katalogOpen}
        onClose={() => setKatalogOpen(false)}
        title={SOFORTMASSNAHME_FAELLE_POPUP_TITLE}
        size="lg"
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
                      <MockBtn className="sofortmassnahme-faelle__katalog-btn" type="button" onClick={() => add(f.id)}>
                        <MockIcon ctx="btn" n="plus" size={14} />
                        <span>{f.label}</span>
                      </MockBtn>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </EditorSheet>
    </div>
  )
}
