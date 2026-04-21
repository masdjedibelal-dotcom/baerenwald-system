import type { ReactNode } from 'react'

export function RecordLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col gap-0 md:flex-row md:gap-0">
      <div className="w-full flex-shrink-0 border-b border-bw-border md:sticky md:top-14 md:h-[calc(100vh-56px)] md:w-80 md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="space-y-3 p-4 md:p-5">{sidebar}</div>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
