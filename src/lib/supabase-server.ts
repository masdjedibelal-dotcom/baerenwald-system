import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // In Server Components sind Cookie-Schreibzugriffe verboten (nur Server Actions / Route Handlers).
            // Supabase kann beim Token-Refresh trotzdem setAll aufrufen → ohne try/catch bricht das RSC-Rendering ab.
            // Session-Refresh passiert parallel in der Middleware (middleware.ts).
          }
        },
      },
    }
  )
}
