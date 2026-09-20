'use client'

import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type MockTableProps = TableHTMLAttributes<HTMLTableElement> & {
  /** Wrapper-Klasse (Scroll / dok-table-wrap / list-table-shell) */
  wrapClassName?: string
  children: ReactNode
}

/**
 * Kanonische Datentabelle — einzige UI-Tabelle außerhalb PDF-/Mail-Allowlist.
 */
export function MockTable({
  className,
  wrapClassName,
  children,
  ...props
}: MockTableProps) {
  return (
    <div className={cn('mock-table-wrap', wrapClassName)}>
      <table className={cn('mock-table', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function MockTableHead({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={className} {...props}>
      {children}
    </thead>
  )
}

export function MockTableBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  )
}

export function MockTableRow({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={className} {...props}>
      {children}
    </tr>
  )
}

export function MockTh({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={className} {...props}>
      {children}
    </th>
  )
}

export function MockTd({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={className} {...props}>
      {children}
    </td>
  )
}
