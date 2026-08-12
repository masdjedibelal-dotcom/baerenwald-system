'use client'

import { useState, type ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { PartnerEditSheet } from '@/components/handwerker/PartnerEditSheet'
import type { Handwerker } from '@/lib/types'

function PropRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '' || value === '—') {
    return (
      <div className="prop">
        <div className="prop-l">{label}</div>
        <div className="prop-v">—</div>
      </div>
    )
  }
  return (
    <div className="prop">
      <div className="prop-l">{label}</div>
      <div className="prop-v">{value}</div>
    </div>
  )
}

type GewerkOpt = { id: string; name: string; slug: string }

/** Bank & Steuer — View + Bearbeiten über EditorSheet. */
export function EntityHandwerkerBankCard({
  handwerker,
  gewerkeOptionen = [],
  disabled = false,
  onSaved,
}: {
  handwerker: Handwerker
  gewerkeOptionen?: GewerkOpt[]
  disabled?: boolean
  onSaved?: () => void
}) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <div className="card">
        <div className="card-h">
          <div className="card-title title">Bank & Steuer</div>
          {!disabled ? (
            <MockBtn
              sm
              kind="ghost"
              icon="pencil"
              title="Bearbeiten"
              onClick={() => setSheetOpen(true)}
            />
          ) : null}
        </div>
        <div className="card-b">
          <div className="props">
            <PropRow label="IBAN" value={handwerker.iban?.trim() || '—'} />
            <PropRow label="USt-ID" value={handwerker.ustid?.trim() || '—'} />
            <PropRow label="Steuernummer" value={handwerker.steuernummer?.trim() || '—'} />
          </div>
        </div>
      </div>

      <PartnerEditSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        handwerker={handwerker}
        gewerkeOptionen={gewerkeOptionen}
        focus="bank"
        onSaved={onSaved}
      />
    </>
  )
}
