/** Nur lokal/Preview — niemals in Produktion aktivieren (gleiche Logik wie Portal TEST_AUTH_BYPASS). */
export function isDevAuthSkipEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.CRM_DEV_SKIP_AUTH === 'true'
  )
}

export function getDevCrmCredentials(): { email: string; password: string } | null {
  const email = process.env.DEV_CRM_EMAIL?.trim()
  const password = process.env.DEV_CRM_PASSWORD
  if (!email || !password) return null
  return { email, password }
}
