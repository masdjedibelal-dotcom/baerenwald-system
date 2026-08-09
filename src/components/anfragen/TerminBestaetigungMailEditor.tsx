'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { Textarea } from '@/components/ui/Textarea'
import { previewBesichtigungTerminMail } from '@/app/actions/mails'
import { VOR_ORT_TERMIN_TITEL } from '@/lib/kalender-styles'
import { TERMIN_MAIL_AUTO_MARKER } from '@/lib/mail/termin-mail-editor'

export type TerminMailDraft = {
  betreff: string
  html: string
  bodyText: string
  to: string[]
  cc: string[]
}

type Props = {
  active: boolean
  leadId: string
  kontaktEmail: string
  kontaktName: string
  terminTitel?: string
  datum: string
  uhrzeitVon: string
  uhrzeitBis?: string | null
  adresse: string | null
  notiz: string | null
  zugewiesenAn: string
  value: TerminMailDraft | null
  onChange: (draft: TerminMailDraft | null) => void
}

function emptyDraft(email: string): TerminMailDraft {
  const to = email.trim()
  return { betreff: '', html: '', bodyText: '', to: to ? [to] : [], cc: [] }
}

export function TerminBestaetigungMailEditor({
  active,
  leadId,
  kontaktEmail,
  kontaktName,
  terminTitel = VOR_ORT_TERMIN_TITEL,
  datum,
  uhrzeitVon,
  uhrzeitBis = null,
  adresse,
  notiz,
  zugewiesenAn,
  value,
  onChange,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const keepRecipientsRef = useRef(false)
  const valueRef = useRef(value)
  valueRef.current = value

  const canPrepare = active && kontaktEmail.trim() && datum.trim() && uhrzeitVon.trim()
  const hatMitarbeiter = Boolean(zugewiesenAn.trim())

  useEffect(() => {
    if (!canPrepare) {
      onChange(null)
      setError(null)
      setLoading(false)
      keepRecipientsRef.current = false
      return
    }

    if (!valueRef.current?.to.length) {
      onChange(emptyDraft(kontaktEmail))
      keepRecipientsRef.current = true
    }

    let cancelled = false
    const t = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      void previewBesichtigungTerminMail({
        leadId,
        name: kontaktName,
        terminTitel,
        datum,
        uhrzeitVon: uhrzeitVon.trim(),
        uhrzeitBis: uhrzeitBis?.trim() || null,
        adresse,
        notiz,
        zugewiesenAn: zugewiesenAn.trim() || undefined,
        defaultTo: kontaktEmail.trim(),
        bodyText: valueRef.current?.bodyText || undefined,
      }).then((res) => {
        if (cancelled) return
        setLoading(false)
        if (!res.ok) {
          setError(res.message)
          return
        }
        const keep = keepRecipientsRef.current
        const prev = valueRef.current ?? emptyDraft(kontaktEmail)
        onChange({
          betreff: keep && prev.betreff.trim() ? prev.betreff : res.betreff,
          html: res.html,
          bodyText: keep && prev.bodyText.trim() ? prev.bodyText : res.bodyText,
          to: keep && prev.to.length ? prev.to : res.defaultTo.length ? res.defaultTo : prev.to,
          cc: keep ? prev.cc : [],
        })
        keepRecipientsRef.current = true
      })
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [
    canPrepare,
    leadId,
    kontaktEmail,
    kontaktName,
    terminTitel,
    datum,
    uhrzeitVon,
    uhrzeitBis,
    adresse,
    notiz,
    zugewiesenAn,
    value?.bodyText,
  ])

  useEffect(() => {
    if (!active) keepRecipientsRef.current = false
  }, [active])

  if (!active) return null

  if (!kontaktEmail.trim()) {
    return (
      <p className="text-xs text-bw-text-muted">Keine E-Mail beim Kontakt — Bestätigung nur im Kalender.</p>
    )
  }

  if (!datum.trim() || !uhrzeitVon.trim()) {
    return (
      <p className="text-xs text-bw-text-muted">Datum und Uhrzeit eintragen, um die Mail-Vorschau zu laden.</p>
    )
  }

  const draft = value ?? emptyDraft(kontaktEmail)

  return (
    <div className="space-y-3 rounded-lg border border-bw-border bg-bw-bg p-3">
      <p className="text-xs text-bw-text-muted">
        Terminbestätigung an den Kunden. Betreff, Empfänger und Text vor dem Versand prüfen.
      </p>
      {!hatMitarbeiter ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
          Noch kein Vor-Ort-Mitarbeiter gewählt — die Vorschau zeigt Termin ohne Kollegen-Block. Zum
          Speichern und Versand ist die Auswahl oben Pflicht.
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <Input
        label="Betreff"
        value={draft.betreff}
        onChange={(e) => onChange({ ...draft, betreff: e.target.value })}
        placeholder={loading ? 'Wird geladen…' : undefined}
      />
      <EmailPillsField
        label="An"
        required
        emails={draft.to}
        onChange={(to) => onChange({ ...draft, to })}
        placeholder={kontaktEmail}
      />
      <EmailPillsField
        label="CC"
        emails={draft.cc}
        onChange={(cc) => onChange({ ...draft, cc })}
        placeholder="weitere@beispiel.de"
        hint="Optional."
      />
      <Textarea
        label="Nachricht"
        rows={8}
        value={draft.bodyText}
        onChange={(e) => onChange({ ...draft, bodyText: e.target.value })}
        disabled={loading && !draft.bodyText}
        placeholder={loading ? 'Text wird geladen…' : undefined}
      />
      <p className="text-xs text-bw-text-muted">
        Die Zeile „{TERMIN_MAIL_AUTO_MARKER}“ nicht löschen — danach kommen Datum, Ort und der
        restliche Inhalt automatisch in der Vorschau.
      </p>
      <CollapsibleMailPreview
        previewHtml={draft.html}
        loadingMessage="Vorschau lädt…"
      />
      {loading && draft.html ? (
        <p className="text-xs text-bw-text-muted">Vorschau wird aktualisiert…</p>
      ) : null}
    </div>
  )
}
