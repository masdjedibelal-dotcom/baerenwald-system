'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { openFabCreate, type FabOverlayArt } from '@/components/neu/FabCreateHost'

type NeuItem = { ic: string; label: string; desc: string; overlay: FabOverlayArt }

/** FAB: Overlay auf aktueller Seite (kein /anfragen/neu-Host). */
const VORGANG_ITEMS: NeuItem[] = [
  { ic: 'inbox', label: 'Anfrage', desc: 'Neuer Kundenbedarf', overlay: 'anfrage' },
  { ic: 'file-invoice', label: 'Angebot', desc: 'Positionen & Preis', overlay: 'angebot' },
  { ic: 'receipt', label: 'Rechnung', desc: 'Abschlag oder Schluss', overlay: 'rechnung' },
]

const STAMM_ITEMS: NeuItem[] = [
  { ic: 'users', label: 'Kunde', desc: 'Stammdaten', overlay: 'kunde' },
  { ic: 'tool', label: 'Handwerker', desc: 'Ausführungspartner', overlay: 'handwerker' },
]

const PLAN_ITEMS: NeuItem[] = [
  { ic: 'calendar-event', label: 'Termin', desc: 'Kalender-Eintrag', overlay: 'termin' },
  { ic: 'clipboard-list', label: 'To-do', desc: 'Aufgabe mit Fälligkeit', overlay: 'todo' },
]

export function MockNeuPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  function go(item: NeuItem) {
    onClose()
    openFabCreate(item.overlay)
  }

  return (
    <div className="neu-pop-overlay" onClick={onClose} role="presentation">
      <div
        className="neu-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Neu erstellen"
      >
        <div className="neu-pop-handle" aria-hidden>
          <span />
        </div>
        <div className="neu-pop-head">Neu erstellen</div>
        {VORGANG_ITEMS.map((it) => (
          <button
            key={it.label}
            type="button"
            className="neu-pop-item"
            onClick={() => go(it)}
          >
            <span className="neu-pop-ico">
              <MockIcon ctx="default" n={it.ic} size={18} />
            </span>
            <span className="neu-pop-txt">
              <span className="l">{it.label}</span>
              <span className="d">{it.desc}</span>
            </span>
          </button>
        ))}
        <div className="neu-pop-sep" />
        {STAMM_ITEMS.map((it) => (
          <button
            key={it.label}
            type="button"
            className="neu-pop-item"
            onClick={() => go(it)}
          >
            <span className="neu-pop-ico">
              <MockIcon ctx="default" n={it.ic} size={18} />
            </span>
            <span className="neu-pop-txt">
              <span className="l">{it.label}</span>
              <span className="d">{it.desc}</span>
            </span>
          </button>
        ))}
        <div className="neu-pop-sep" />
        {PLAN_ITEMS.map((it) => (
          <button
            key={it.label}
            type="button"
            className="neu-pop-item"
            onClick={() => go(it)}
          >
            <span className="neu-pop-ico">
              <MockIcon ctx="default" n={it.ic} size={18} />
            </span>
            <span className="neu-pop-txt">
              <span className="l">{it.label}</span>
              <span className="d">{it.desc}</span>
            </span>
          </button>
        ))}
        <button type="button" className="neu-pop-cancel md:hidden" onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}
