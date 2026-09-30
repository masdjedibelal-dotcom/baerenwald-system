'use client'

import { createClient } from '@/lib/supabase'

type RouterLike = { replace: (href: string) => void; refresh: () => void }

/**
 * Eine Quelle fürs Abmelden (vorher 3× kopiert). Keine Rückfrage — Abmelden ist
 * jederzeit umkehrbar (erneut anmelden).
 */
export async function abmelden(router: RouterLike): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut({ scope: 'local' })
  router.replace('/login')
  router.refresh()
}
