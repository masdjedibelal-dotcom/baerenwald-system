'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    if (!window.confirm('Wirklich abmelden?')) return
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
    setLoading(false)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="md"
      loading={loading}
      onClick={handleLogout}
      className={className}
    >
      <LogOut className="h-5 w-5" aria-hidden />
      Abmelden
    </Button>
  )
}
