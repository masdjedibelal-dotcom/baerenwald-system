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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-bw-text">
          {gruss}, {name}
        </h1>
        <p className="mt-0.5 text-sm text-bw-text-muted">{datum}</p>
      </div>
      <Link
        href="/anfragen/neu"
        className="btn btn-primary btn-sm inline-flex items-center justify-center gap-1.5 self-start sm:self-auto"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Neue Anfrage
      </Link>
    </div>
  )
}
