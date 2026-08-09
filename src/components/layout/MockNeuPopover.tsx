'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  FabVorgangStartModal,
  type FabVorgangArt,
} from '@/components/neu/FabVorgangStartModal'

/** Mock Neu-Popover — Vorgänge mit Kundensuche, Stammdaten direkt. */
const VORGANG_ITEMS: Array<{ ic: string; label: string; art: FabVorgangArt }> = [
  { ic: 'inbox', label: 'Anfrage', art: 'anfrage' },
  { ic: 'file-invoice', label: 'Angebot', art: 'angebot' },
  { ic: 'briefcase', label: 'Auftrag', art: 'auftrag' },
  { ic: 'receipt', label: 'Rechnung', art: 'rechnung' },
]

const STAMM_ITEMS: Array<{ ic: string; label: string; href: string }> = [
  { ic: 'users', label: 'Kunde', href: '/neu?art=kunde' },
  { ic: 'tool', label: 'Partner', href: '/neu?art=handwerker' },
]

export function MockNeuPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [vorgangArt, setVorgangArt] = useState<FabVorgangArt | null>(null)

  if (!open && !vorgangArt) return null

  return (
    <>
      {open ? (
        <div className="neu-pop-overlay" onClick={onClose} role="presentation">
          <div
            className="neu-pop"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Neuen Vorgang erstellen"
          >
            <div className="neu-pop-head">Neuen Vorgang erstellen</div>
            {VORGANG_ITEMS.map((it) => (
              <button
                key={it.art}
                type="button"
                className="neu-pop-item"
                onClick={() => {
                  onClose()
                  setVorgangArt(it.art)
                }}
              >
                <span className="neu-pop-ico">
                  <MockIcon ctx="default" n={it.ic} size={18} />
                </span>
                <span className="neu-pop-txt">
                  <span className="l">{it.label}</span>
                </span>
              </button>
            ))}
            <div className="neu-pop-sep" />
            {STAMM_ITEMS.map((it) => (
              <button
                key={it.label}
                type="button"
                className="neu-pop-item"
                onClick={() => {
                  onClose()
                  router.push(it.href)
                }}
              >
                <span className="neu-pop-ico">
                  <MockIcon ctx="default" n={it.ic} size={18} />
                </span>
                <span className="neu-pop-txt">
                  <span className="l">{it.label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <FabVorgangStartModal
        open={vorgangArt != null}
        art={vorgangArt}
        onClose={() => setVorgangArt(null)}
      />
    </>
  )
}
