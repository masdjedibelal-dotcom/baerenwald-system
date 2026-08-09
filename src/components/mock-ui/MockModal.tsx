'use client'

import type { ReactNode } from 'react'
import { Modal } from '@/components/ui/Modal'
import { MockIcon } from '@/components/mock-ui/MockIcon'

/**
 * Listen-/Filter-Modal API (icon + title + sub).
 * Implementiert auf dem kanonischen `Modal` (Portal, Escape, Size).
 */
export function MockModal({
  open,
  onClose,
  icon,
  title,
  sub,
  children,
  footer,
  className,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  icon?: string
  title: string
  sub?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={sub}
      leading={icon ? <MockIcon ctx="emphasis" n={icon} size={16} /> : undefined}
      footer={footer}
      className={className}
      size={size}
    >
      {children}
    </Modal>
  )
}
