'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { abmelden } from '@/lib/auth/abmelden-client'
import { MockBtn } from '@/components/mock-ui'

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      await abmelden(router)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MockBtn
      type="button"
      kind="ghost"
      loading={loading}
      onClick={handleLogout}
      className={className}
    >
      <LogOut className="h-5 w-5" aria-hidden />
      Abmelden
    </MockBtn>
  )
}
