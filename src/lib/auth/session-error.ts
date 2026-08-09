/** Erkennung abgelaufener / ungültiger Auth für CRM-Queries. */
export function isAuthSessionError(message: string | undefined | null): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes('jwt expired') ||
    m.includes('invalid jwt') ||
    m.includes('invalid claim') ||
    m.includes('not authenticated') ||
    m.includes('auth session missing') ||
    m.includes('pgrst301') ||
    m.includes('401') ||
    (m.includes('jwt') && m.includes('expired'))
  )
}
