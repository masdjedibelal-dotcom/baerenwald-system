/**
 * P3-4 Client: nach Server Action mit revalidatePath kein router.refresh.
 * Optional Soft-Bump über Callback (Generation) — kein RSC-Hard-Refresh.
 */
export function afterServerActionRefresh(bump?: () => void): void {
  bump?.()
}
