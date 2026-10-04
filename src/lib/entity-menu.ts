

export type EntityMenuItem =
  | 'sep'
  | {
      icon?: string
      label: string
      hint?: string
      danger?: boolean
      disabled?: boolean
      onClick: () => void
    }
