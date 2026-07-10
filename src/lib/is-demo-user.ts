/** True wenn die Adresse wie ein Demo-/Test-Account aussieht (Banner + API-Schutz). */
export function isDemoTestUserEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const e = email.toLowerCase()
  return e.includes('demo') || e.includes('test')
}
