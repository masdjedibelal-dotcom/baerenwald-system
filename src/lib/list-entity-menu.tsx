'use client'

import {
  buildEntityMenu,
  type EntityMenuHandlers,
  type EntityMenuItem,
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
): EntityMenuItem[] {
  return buildEntityMenu(
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
}
