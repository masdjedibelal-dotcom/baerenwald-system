'use client'

import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockIcon } from '@/components/mock-ui/MockIcon'

export type Ustg13bHilfeVariant = 'ausgang' | 'eingang'

const AUSGANG = {
  title: '§13b UStG — Steuerschuld beim Kunden (Reverse Charge)',
  merksatz:
    'Entscheidend ist der Kunde — nicht unsere Leistung. §13b gilt nur, wenn unser Kunde selbst ein Bauunternehmen ist.',
  wirkung:
    'Bei aktivem §13b wird die Rechnung netto ohne Umsatzsteuer gestellt und erhält den Pflichthinweis „Steuerschuldnerschaft des Leistungsempfängers“. Der Kunde führt die Steuer selbst ab.',
  aktivTitle: 'Aktivieren — nur wenn alle drei Punkte zutreffen',
  aktiv: [
    'Der Kunde erbringt selbst nachhaltig Bauleistungen (Bauunternehmen, Bauträger, Handwerksbetrieb)',
    'Seine gültige Bescheinigung USt 1 TG liegt uns vor → in der Akte ablegen',
    'Unsere Leistung ist eine Bauleistung (Einbau, Reparatur, Sanierung)',
  ],
  ausTitle: 'Aus lassen bei',
  aus: [
    'Privatkunden und Eigentümern',
    'Hausverwaltungen (verwalten Gebäude, bauen nicht)',
    'Gewerbekunden ohne Baugewerbe (Büro, Praxis, Laden …)',
  ],
  fuss: 'Im Zweifel: aus lassen und mit 19 % abrechnen. Das ist bei Bärenwald der Normalfall — §13b ist hier die seltene Ausnahme.',
} as const

const EINGANG = {
  title: '§13b UStG — Partner-Rechnung ohne Umsatzsteuer',
  merksatz:
    'Entscheidend ist die Leistung des Handwerkers — nicht, ob wir selbst ausführen. Bärenwald ist als Generalunternehmer Bauleister. Erbringt der Partner eine Bauleistung, geht die Steuerschuld auf uns über.',
  wirkung:
    'Bei aktivem Haken muss der Partner seine Rechnung an Bärenwald netto ohne USt stellen, mit Hinweis auf §13b. Wir melden die Steuer selbst an. Weist der Partner trotzdem USt aus, ist die Rechnung falsch → zurückweisen und korrigieren lassen, sonst kein Vorsteuerabzug.',
  aktivTitle:
    'Aktivieren, wenn der Partner am Gebäude etwas einbaut, austauscht, repariert oder entfernt',
  aktiv: [
    'Sanitär, Elektro, Heizung',
    'Maler, Fliesen, Boden',
    'Fenster, Türen, Sanierung, Reparatur mit Teiletausch',
  ],
  ausTitle: 'Aus lassen bei',
  aus: [
    'Reiner Wartung/Inspektion ohne Teiletausch',
    'Planung, Gutachten, Aufmaß',
    'Grünpflege, Winterdienst, Hausmeister-Kontrollgängen',
    'Kleinreparatur/Wartung bis 500 € netto (Bagatellgrenze)',
  ],
  fuss: 'Gemischter Auftrag? Es zählt der Schwerpunkt: Prägt die Bauleistung den Auftrag (z. B. Sanierung inkl. Planung), gilt §13b für alles.',
} as const

function HelpBody({
  merksatz,
  wirkung,
  aktivTitle,
  aktiv,
  ausTitle,
  aus,
  fuss,
}: {
  merksatz: string
  wirkung: string
  aktivTitle: string
  aktiv: readonly string[]
  ausTitle: string
  aus: readonly string[]
  fuss: string
}) {
  return (
    <div className="space-y-4 text-[length:var(--fs-text)] leading-relaxed text-bw-text">
      <p className="m-0 rounded-lg border border-bw-border bg-bw-hover/40 px-3 py-2.5">
        <strong className="font-semibold">Merksatz:</strong> {merksatz}
      </p>
      <p className="m-0 text-bw-text-muted">{wirkung}</p>
      <div>
        <p className="mb-1.5 font-semibold text-bw-text">✓ {aktivTitle}</p>
        <ul className="m-0 list-disc space-y-1 pl-5 text-bw-text-muted">
          {aktiv.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1.5 font-semibold text-bw-text">✗ {ausTitle}</p>
        <ul className="m-0 list-disc space-y-1 pl-5 text-bw-text-muted">
          {aus.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <p className="m-0 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-[length:var(--fs-meta)] text-amber-950">
        {fuss}
      </p>
    </div>
  )
}

/** Hilfe-Sheet zu §13b — am Toggle/Checkbox neben dem Label öffnen. */
export function Ustg13bHilfeSheet({
  open,
  onClose,
  variant,
}: {
  open: boolean
  onClose: () => void
  variant: Ustg13bHilfeVariant
}) {
  const copy = variant === 'ausgang' ? AUSGANG : EINGANG
  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={copy.title}
      context="canvas"
      size="md"
    >
      <HelpBody {...copy} />
    </EditorSheet>
  )
}

/** ⓘ neben Label — öffnet §13b-Hilfe, ohne den Toggle/Checkbox zu toggeln. */
export function Ustg13bHilfeTrigger({
  onOpen,
  label = 'Hilfe zu §13b UStG',
  className,
}: {
  onOpen: () => void
  label?: string
  className?: string
}) {
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onOpen()
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginLeft: 4,
        padding: 2,
        border: 0,
        background: 'transparent',
        color: 'var(--text-3)',
        cursor: 'pointer',
        borderRadius: 6,
        verticalAlign: 'middle',
      }}
    >
      <MockIcon ctx="btn" n="info-circle" size={15} />
    </button>
  )
}
