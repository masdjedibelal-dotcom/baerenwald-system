import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bw-hover">
        <Icon className="h-8 w-8 text-bw-light" aria-hidden />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-text">{description}</p>
      {action ? (
        <Button variant="primary" type="button" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}
