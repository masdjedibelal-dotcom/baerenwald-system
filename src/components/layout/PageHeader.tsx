import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PageHeaderCrumb = { label: string; href?: string }

export function PageHeader({
  title,
  breadcrumbs,
  action,
  tabs,
  description,
  className,
}: {
  title: ReactNode
  breadcrumbs?: PageHeaderCrumb[]
  action?: ReactNode
  tabs?: ReactNode
  description?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'z-header sticky left-0 right-0 top-0 w-full border-b border-bw-border bg-bw-card pt-[env(safe-area-inset-top)] -mx-4 md:-mx-6',
        className
      )}
    >
      <div className="px-4 pb-0 pt-4 md:px-6">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <div className="mb-2 flex flex-wrap items-center gap-1">
            {breadcrumbs.map((crumb, i) => (
              <div key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight className="h-3 w-3 text-bw-light" /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-xs text-bw-link hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-xs text-bw-light">{crumb.label}</span>
                )}
              </div>
            ))}
          </div>
        ) : null}

        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {typeof title === 'string' ? (
              <h1 className="text-xl font-semibold leading-tight text-bw-text">{title}</h1>
            ) : (
              <div className="min-w-0 text-xl font-semibold leading-tight text-bw-text">{title}</div>
            )}
            {description ? <p className="mt-0.5 text-sm text-bw-light">{description}</p> : null}
          </div>
          {action ? <div className="ml-4 flex-shrink-0">{action}</div> : null}
        </div>

        {tabs ? <div className="-mb-px">{tabs}</div> : null}
      </div>
    </div>
  )
}
