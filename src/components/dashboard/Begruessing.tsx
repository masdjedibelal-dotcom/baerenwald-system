'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export function Begruessing({ name }: { name: string }) {
  const [gruss, setGruss] = useState('Guten Tag')
  const [datum, setDatum] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 6 && h < 11) setGruss('Guten Morgen')
    else if (h >= 11 && h < 17) setGruss('Guten Tag')
    else if (h >= 17 && h < 22) setGruss('Guten Abend')
    else setGruss('Hallo')

    setDatum(
      new Date().toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    )
  }, [])

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs text-bw-text-muted">{datum}</p>
        <h1 className="mt-0.5 text-lg font-semibold leading-tight text-bw-text">
          {gruss}, {name}
        </h1>
      </div>
      <Link
        href="/anfragen?neu=1"
        className="btn btn-primary btn-sm inline-flex shrink-0 items-center justify-center gap-1.5"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Neue Anfrage
      </Link>
    </div>
  )
}
