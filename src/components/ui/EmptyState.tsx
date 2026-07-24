'use client'

import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

/** @deprecated Nutze `MockEmpty` direkt. Adapter für Lucide-Icons. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <MockEmpty
      icon={<Icon className="h-8 w-8 text-bw-light" aria-hidden />}
      title={title}
      hint={description}
      action={
        action ? (
          <Button variant="primary" type="button" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : undefined
      }
    />
  )
}
