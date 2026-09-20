'use client'

import type { ReactNode } from 'react'

/** Desktop: Mock-`.menu` / `.menu-item`. Mobile: ActionSheet — Typ für Overflow-Items. */

export type ActionsMenuItem =
  | 'sep'
  | {
      label: string
      icon?: ReactNode
      hint?: string
      danger?: boolean
      /** Deaktiviert-mit-Grund: sichtbar, nicht klickbar; Grund in `hint` */
      disabled?: boolean
      onClick: () => void
    }
