'use client'

import { useEffect, useState } from 'react'

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
    <div>
      <p className="text-xs text-bw-text-muted">{datum}</p>
      <h1 className="mt-0.5 text-lg font-semibold leading-tight text-bw-text">
        {gruss}, {name}
      </h1>
    </div>
  )
}
