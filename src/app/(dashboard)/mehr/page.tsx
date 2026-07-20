import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { MehrScreenClient } from '@/components/mehr/MehrScreenClient'

export const metadata: Metadata = {
  title: 'Mehr',
}

export default async function MehrPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const meta = (user?.user_metadata ?? {}) as { name?: string }
  const name = meta.name?.trim() || user?.email?.split('@')[0] || 'Beran Bärenwald'
  const initials = name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return <MehrScreenClient userName={name} initials={initials || 'BB'} />
}
