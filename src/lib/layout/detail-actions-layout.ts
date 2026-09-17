import type { ActionsMenuItem } from '@/components/ui/actions-menu'

export type DetailActionDef = {
  label: string
  icon?: string
  onClick: () => void
  disabled?: boolean
  title?: string
  href?: string
  shortLabel?: string
  danger?: boolean
}

export type DetailActionSlot = 'secondary' | 'danger' | 'primary'

export type ResolvedDetailAction = {
  action: DetailActionDef
  slot: DetailActionSlot
}

export type DetailActionsLayout = 'solo' | 'pair' | 'triple'

export type ResolvedDetailActions = {
  visible: ResolvedDetailAction[]
  overflowMenu: ActionsMenuItem[]
  layout: DetailActionsLayout
  hasMenu: boolean
}

function actionToMenuItem(
  action: DetailActionDef,
  slot: DetailActionSlot
): ActionsMenuItem {
  return {
    label: action.label,
    danger: slot === 'danger' || action.danger,
    disabled: action.disabled,
    hint: action.title,
    onClick: action.onClick,
  }
}

function withoutDuplicateLabels(
  items: ActionsMenuItem[],
  labels: string[]
): ActionsMenuItem[] {
  const blocked = new Set(labels.map((l) => l.trim().toLowerCase()).filter(Boolean))
  if (!blocked.size) return items
  return items.filter((it) => {
    if (it === 'sep') return true
    return !blocked.has(it.label.trim().toLowerCase())
  })
}

function hasMenuContent(items: ActionsMenuItem[]): boolean {
  return items.some((it) => it !== 'sep')
}

/**
 * Header-CTA-Layout:
 * - ≤3 Inline-Buttons → alle sichtbar
 * - ≥4 Inline-Buttons → Primary + davorliegender Slot sichtbar, Rest ins ⋯
 * - menuItems werden ans ⋯ angehängt (dedupliziert gegen sichtbare Labels)
 */
export function resolveDetailActions(params: {
  primary?: DetailActionDef | null
  secondary?: DetailActionDef | null
  danger?: DetailActionDef | null
  menuItems?: ActionsMenuItem[]
}): ResolvedDetailActions {
  const ordered: ResolvedDetailAction[] = []
  if (params.secondary) ordered.push({ action: params.secondary, slot: 'secondary' })
  if (params.danger) ordered.push({ action: params.danger, slot: 'danger' })
  if (params.primary) ordered.push({ action: params.primary, slot: 'primary' })

  let visible = ordered
  let overflowFromInline: ResolvedDetailAction[] = []

  if (ordered.length >= 4) {
    visible = ordered.slice(-2)
    overflowFromInline = ordered.slice(0, -2)
  }

  const overflowMenu: ActionsMenuItem[] = [
    ...overflowFromInline.map(({ action, slot }) => actionToMenuItem(action, slot)),
  ]

  const baseMenu = params.menuItems ?? []
  if (overflowMenu.length && hasMenuContent(baseMenu)) {
    overflowMenu.push('sep')
  }
  overflowMenu.push(
    ...withoutDuplicateLabels(
      baseMenu,
      visible.map(({ action }) => action.label)
    )
  )

  const layout: DetailActionsLayout =
    visible.length >= 3 ? 'triple' : visible.length === 2 ? 'pair' : 'solo'

  return {
    visible,
    overflowMenu,
    layout,
    hasMenu: hasMenuContent(overflowMenu),
  }
}
