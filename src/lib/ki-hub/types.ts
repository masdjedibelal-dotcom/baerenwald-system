
export type KiHubQuelleStatus = 'ok' | 'unavailable' | 'partial'

export type KiHubQuelleResult<T> = {
  status: KiHubQuelleStatus
  data?: T
  error?: string
}
