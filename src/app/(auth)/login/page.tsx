import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) redirect('/')
  } catch {
    /* fehlende Supabase-Konfiguration: Login-Seite bleibt erreichbar */
  }

  return <LoginForm />
}
