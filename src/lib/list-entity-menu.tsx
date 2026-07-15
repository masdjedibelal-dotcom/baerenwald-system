'use client'

import type { ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { ActionsMenuItem } from '@/components/ui/actions-menu'
import {
  buildEntityMenu,
  type EntityMenuHandlers,
  type EntityMenuType,
} from '@/lib/entity-menu'

type EntityLike = {
  name?: string | null
  titel?: string | null
  email?: string | null
  mail?: string | null
  telefon?: string | null
  tel?: string | null
  status?: string | null
}

export function listEntityMenuItems(
  type: EntityMenuType,
  entity: EntityLike,
  handlers: EntityMenuHandlers
): ActionsMenuItem[] {
  const items = buildEntityMenu(
    type,
    {
      name: entity.name,
      titel: entity.titel,
      status: entity.status,
      mail: entity.mail ?? entity.email,
      tel: entity.tel ?? entity.telefon,
    },
    {
      tel: handlers.tel ?? entity.tel ?? entity.telefon,
      mail: handlers.mail ?? entity.mail ?? entity.email,
      ...handlers,
    }
  )
  return items.map((it) => {
    if (it === 'sep') return 'sep'
    return {
      label: it.label,
      icon: it.icon ? (<MockIcon n={it.icon} size={15} />) as ReactNode : undefined,
      hint: it.hint,
      danger: it.danger,
      onClick: it.onClick,
    }
  })
}
