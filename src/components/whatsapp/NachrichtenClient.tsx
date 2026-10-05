'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  ladeWhatsAppPostfach,
  sucheWhatsAppKontakte,
  type WaGespraech,
  type WaKontaktTreffer,
} from '@/app/(dashboard)/whatsapp/actions'
import { MockBadge, MockBtn, MockSegment } from '@/components/mock-ui'
import { MockInput } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { WhatsAppChat } from '@/components/whatsapp/WhatsAppChat'
import { useIsMobile } from '@/hooks/useIsMobile'
import { safeAction } from '@/lib/actions/safe-action'
import { formatDatum } from '@/lib/format/geld-datum'
import { cn } from '@/lib/utils'
import { gespraechSchluessel, zielAusSchluessel } from '@/lib/whatsapp/schluessel'

type Filter = 'alle' | 'ungelesen' | 'offen'

const TYP_LABEL: Record<WaGespraech['typ'], string> = {
  handwerker: 'Partner',
  kunde: 'Kunde',
  unbekannt: 'Unbekannt',
}

function wann(iso: string): string {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : formatDatum(iso)
}

function initialen(name: string): string {
  const teile = name.replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/)
  return ((teile[0]?.[0] ?? '') + (teile[1]?.[0] ?? '')).toUpperCase() || '#'
}

/**
 * Postfach „Nachrichten“: alle WhatsApp-Chats an einem Ort (wie WhatsApp).
 * Desktop: links Chats, rechts Verlauf. Handy: erst Liste, dann Chat mit „Zurück“.
 */
export function NachrichtenClient() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const mobil = useIsMobile()
  const [gespraeche, setGespraeche] = useState<WaGespraech[] | null>(null)
  const [filter, setFilter] = useState<Filter>('alle')
  const [suche, setSuche] = useState('')
  const [neu, setNeu] = useState(false)
  const [treffer, setTreffer] = useState<WaKontaktTreffer[]>([])
  /** Name für einen neuen Chat (Kontakt ohne bisherige Nachrichten) */
  const [neuName, setNeuName] = useState<string>('')
  const aktivKey = params.get('chat')
  const aktivZiel = useMemo(() => zielAusSchluessel(aktivKey), [aktivKey])

  const laden = useCallback(async () => {
    const res = await safeAction(ladeWhatsAppPostfach())
    setGespraeche(res.ok ? res.gespraeche : [])
  }, [])

  useEffect(() => {
    void laden()
    const t = window.setInterval(() => void laden(), 20000)
    return () => window.clearInterval(t)
  }, [laden])

  // „Neuer Chat“: Kunden und Partner mit Handynummer suchen
  useEffect(() => {
    if (!neu) return
    const q = suche.trim()
    if (q.length < 2) {
      setTreffer([])
      return
    }
    const t = window.setTimeout(() => {
      safeAction(sucheWhatsAppKontakte(q))
        .then((r) => setTreffer(r.ok ? r.treffer : []))
        .catch(() => setTreffer([]))
    }, 250)
    return () => window.clearTimeout(t)
  }, [neu, suche])

  function oeffnen(key: string | null, name = '') {
    setNeuName(name)
    const q = new URLSearchParams(params.toString())
    if (key) q.set('chat', key)
    else q.delete('chat')
    router.replace(`${pathname}${q.size ? `?${q}` : ''}`, { scroll: false })
  }

  const liste = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (gespraeche ?? []).filter((g) => {
      if (filter === 'ungelesen' && !g.ungelesen) return false
      if (filter === 'offen' && !g.offen) return false
      return !s || neu || g.name.toLowerCase().includes(s)
    })
  }, [gespraeche, filter, suche, neu])

  const zahl = (f: Filter) =>
    (gespraeche ?? []).filter((g) => (f === 'ungelesen' ? g.ungelesen : f === 'offen' ? g.offen : 1)).length
  const aktiv = gespraeche?.find((g) => g.schluessel === aktivKey) ?? null

  const listenSpalte = (
    <aside className="wa-postfach__liste">
      <div className="wa-postfach__kopf">
        <div className="wa-postfach__zeile">
          <MockInput
            className="wa-eingabe__feld"
            value={suche}
            placeholder={neu ? 'Kunde oder Partner suchen …' : 'Chats durchsuchen …'}
            onChange={(e) => setSuche(e.target.value)}
            autoFocus={neu}
          />
          <MockBtn
            kind={neu ? 'primary' : 'secondary'}
            icon={neu ? 'x' : 'plus'}
            title={neu ? 'Abbrechen' : 'Neuer Chat'}
            onClick={() => {
              setNeu(!neu)
              setSuche('')
            }}
          />
        </div>
        {!neu ? (
          <MockSegment
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'alle', label: 'Alle' },
              { value: 'ungelesen', label: `Ungelesen${zahl('ungelesen') ? ` (${zahl('ungelesen')})` : ''}` },
              { value: 'offen', label: `Nicht zugeordnet${zahl('offen') ? ` (${zahl('offen')})` : ''}` },
            ]}
            aria-label="Chats filtern"
          />
        ) : null}
      </div>

      <div className="wa-postfach__eintraege">
        {neu ? (
          suche.trim().length < 2 ? (
            <p className="wa-leer">Namen eingeben — Kunden und Partner mit Handynummer.</p>
          ) : !treffer.length ? (
            <p className="wa-leer">Kein Kontakt mit Handynummer gefunden.</p>
          ) : (
            treffer.map((t) => (
              <MockBtn
                key={gespraechSchluessel(t.ziel)}
                type="button"
                className="wa-kontakt"
                onClick={() => {
                  setNeu(false)
                  setSuche('')
                  oeffnen(gespraechSchluessel(t.ziel), t.name)
                }}
              >
                <span className="wa-kontakt__avatar">{initialen(t.name)}</span>
                <span className="wa-kontakt__text">
                  <span className="wa-kontakt__name">{t.name}</span>
                  <span className="wa-kontakt__vorschau">{t.sub}</span>
                </span>
              </MockBtn>
            ))
          )
        ) : gespraeche == null ? (
          <p className="wa-leer">Wird geladen …</p>
        ) : !liste.length ? (
          <p className="wa-leer">
            {filter === 'offen'
              ? 'Alles zugeordnet.'
              : filter === 'ungelesen'
                ? 'Keine ungelesenen Nachrichten.'
                : 'Noch keine Chats. Mit + einen neuen beginnen.'}
          </p>
        ) : (
          liste.map((g) => (
            <MockBtn
              key={g.schluessel}
              type="button"
              className={cn('wa-kontakt', g.schluessel === aktivKey && 'is-aktiv')}
              onClick={() => oeffnen(g.schluessel, g.name)}
            >
              <span className={cn('wa-kontakt__avatar', `wa-kontakt__avatar--${g.typ}`)}>{initialen(g.name)}</span>
              <span className="wa-kontakt__text">
                <span className="wa-kontakt__name">{g.name}</span>
                <span className="wa-kontakt__vorschau">
                  {g.letzte.richtung === 'aus' ? 'Sie: ' : ''}
                  {g.letzte.text}
                </span>
                <span className="wa-kontakt__typ">
                  {TYP_LABEL[g.typ]}
                  {g.offen ? ` · ${g.offen} nicht zugeordnet` : ''}
                </span>
              </span>
              <span className="wa-kontakt__rechts">
                <span className="wa-kontakt__zeit">{wann(g.letzte.at)}</span>
                {g.ungelesen ? <MockBadge kind="neu">{g.ungelesen}</MockBadge> : null}
              </span>
            </MockBtn>
          ))
        )}
      </div>
    </aside>
  )

  const chatSpalte = aktivZiel ? (
    <WhatsAppChat
      key={aktivKey}
      ziel={aktivZiel}
      name={aktiv?.name ?? neuName}
      zurueck={
        mobil ? (
          <MockBtn icon="arrow-left" title="Zurück zu den Chats" onClick={() => oeffnen(null)} />
        ) : null
      }
      onChanged={() => void laden()}
    />
  ) : (
    <div className="wa-postfach__leer">
      <MockIcon ctx="default" n="brand-whatsapp" size={28} />
      <p>Chat links auswählen oder mit + einen neuen beginnen.</p>
    </div>
  )

  return (
    <div className={cn('wa-postfach', aktivZiel && 'has-chat')}>
      {mobil ? (aktivZiel ? chatSpalte : listenSpalte) : (
        <>
          {listenSpalte}
          {chatSpalte}
        </>
      )}
    </div>
  )
}
