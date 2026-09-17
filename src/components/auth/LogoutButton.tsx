'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { confirmAction } from '@/components/ui/confirm-action'

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  function handleLogout() {
    confirmAction({
      title: 'Wirklich abmelden?',
      body: 'Du wirst aus dem CRM ausgeloggt.',
      confirmLabel: 'Abmelden',
      cancelLabel: 'Abbrechen',
      danger: true,
      busyLabel: null,
      onConfirm: async () => {
        setLoading(true)
        try {
          const supabase = createClient()
          await supabase.auth.signOut({ scope: 'local' })
          router.replace('/login')
          router.refresh()
        } finally {
          setLoading(false)
        }
      },
    })
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
