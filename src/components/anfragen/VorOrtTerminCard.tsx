'use client'

import { useEffect, useMemo, useState } from 'react'
import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { loadCrmTeamFuerTermin } from '@/app/(dashboard)/anfragen/actions'
import type { KalenderTermin, LeadDetail } from '@/lib/types'

/** Notiz-Teil aus der Kalender-Beschreibung (buildKalenderKundenBeschreibung: Block „Notiz“ am Ende). */
function notizAusBeschreibung(beschreibung: string | null | undefined): string {
  const t = (beschreibung ?? '').replace(/\r\n/g, '\n')
  const m = t.match(/(?:^|\n)Notiz\n([\s\S]*)$/)
  return m ? m[1].trim() : ''
}

function terminZeile(t: KalenderTermin): string {
  const d = new Date(`${t.datum}T12:00:00`)
  const datum = Number.isNaN(d.getTime())
    ? t.datum
    : d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
  const von = t.uhrzeit_von?.slice(0, 5)
  const bis = t.uhrzeit_bis?.slice(0, 5)
  if (von && bis) return `${datum}, ${von}–${bis} Uhr`
  if (von) return `${datum}, ${von} Uhr`
  return datum
}

export type VorOrtTerminVorbelegung = {
  datum: string
  uhrzeit: string
  mitarbeiterId: string
  notiz: string
}

/** Servus TEO: Vor-Ort-Termin der Anfrage — vereinbaren, ansehen, ändern (inkl. Bestätigungsmail im Dialog). */
export function VorOrtTerminCard({
  lead,
  onPlanen,
}: {
  lead: LeadDetail
  onPlanen: (vorbelegung: VorOrtTerminVorbelegung | null) => void
}) {
  const termin = useMemo(() => {
    const list = ((lead.kalender_termine ?? []) as KalenderTermin[]).filter(
      (t) => t.typ === 'besichtigung' && !t.erledigt
    )
    list.sort((a, b) => String(b.datum).localeCompare(String(a.datum)))
    return list[0] ?? null
  }, [lead.kalender_termine])

  const [team, setTeam] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    if (!termin?.zugewiesen_an) return
    let aktiv = true
    void loadCrmTeamFuerTermin().then((l) => {
      if (aktiv) setTeam(l)
    })
    return () => {
      aktiv = false
    }
  }, [termin?.zugewiesen_an])

  if (!termin) {
    return (
      <MockCard title="Vor-Ort-Termin">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[length:var(--fs-text)] text-muted">Noch kein Termin vereinbart.</p>
          <MockBtn kind="primary" sm type="button" onClick={() => onPlanen(null)}>
            Termin vereinbaren
          </MockBtn>
        </div>
      </MockCard>
    )
  }

  const notiz = notizAusBeschreibung(termin.beschreibung)
  const mitarbeiter = termin.zugewiesen_an
    ? team.find((m) => m.id === termin.zugewiesen_an)?.name ?? '…'
    : null
  const vorbei = String(termin.datum) < new Date().toISOString().slice(0, 10)

  return (
    <MockCard
      title="Vor-Ort-Termin"
      actions={
        <MockBtn
          kind="ghost"
          sm
          type="button"
          onClick={() =>
            onPlanen({
              datum: String(termin.datum).slice(0, 10),
              uhrzeit: termin.uhrzeit_von?.slice(0, 5) ?? '10:00',
              mitarbeiterId: termin.zugewiesen_an ?? '',
              notiz,
            })
          }
        >
          Ändern
        </MockBtn>
      }
    >
      <div className="props">
        <div className="prop">
          <div className="prop-l">{vorbei ? 'War am' : 'Termin am'}</div>
          <div className="prop-v" style={{ fontWeight: 700 }}>
            {terminZeile(termin)}
          </div>
        </div>
        {mitarbeiter ? (
          <div className="prop">
            <div className="prop-l">Vor Ort</div>
            <div className="prop-v">{mitarbeiter}</div>
          </div>
        ) : null}
        {termin.adresse?.trim() ? (
          <div className="prop">
            <div className="prop-l">Adresse</div>
            <div className="prop-v">{termin.adresse.trim()}</div>
          </div>
        ) : null}
        <div className="prop">
          <div className="prop-l">Notizen</div>
          <div className="prop-v whitespace-pre-wrap">{notiz || '—'}</div>
        </div>
      </div>
    </MockCard>
  )
}
