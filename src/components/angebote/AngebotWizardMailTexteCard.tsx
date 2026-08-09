'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { MobileEditableBlock } from '@/components/ui/MobileEditSheet'
import {
  ANGEBOT_MAIL_BOX_MARKER,
  angebotMailBodyForEditor,
  parseAngebotMailBodyFromEditor,
} from '@/lib/templates/angebot-mail'

const MAIL_ANREDE = 'du' as const

export function AngebotWizardMailTexteCard({
  leistungsumfangMail,
  einleitung,
  schluss,
  onEinleitungSchlussChange,
  mailHtmlPreview,
  disabled,
}: {
  leistungsumfangMail: string
  einleitung: string
  schluss: string
  onEinleitungSchlussChange: (einleitung: string, schluss: string) => void
  mailHtmlPreview: string
  disabled?: boolean
}) {
  const editorBody = useMemo(
    () => angebotMailBodyForEditor(einleitung, schluss, MAIL_ANREDE, leistungsumfangMail),
    [einleitung, schluss, leistungsumfangMail]
  )

  function handleBodyChange(text: string) {
    const parsed = parseAngebotMailBodyFromEditor(text, MAIL_ANREDE, leistungsumfangMail)
    onEinleitungSchlussChange(parsed.einleitung, parsed.schluss)
  }

  const editForm = (
    <label className="wizard-projekt-field block">
      <span className="input-label">E-Mail-Text bearbeiten</span>
      <Textarea
        plain
        className="wizard-mail-body-editor font-mono"
        rows={14}
        value={editorBody}
        onChange={(e) => handleBodyChange(e.target.value)}
        disabled={disabled}
        spellCheck
      />
      <p className="wizard-projekt-field-hint">
        Die Zeile „{ANGEBOT_MAIL_BOX_MARKER}“ nicht löschen — dort erscheinen Angebotsnummer, Preis und
        Gültigkeit. PDF-Einleitung nutzt denselben Fließtext wie der Abschnitt davor.
      </p>
    </label>
  )

  const overview = (
    <div>
      <span className="input-label">E-Mail-Vorschau</span>
      <iframe
        srcDoc={mailHtmlPreview}
        title="E-Mail-Vorschau"
        className="wizard-mail-preview mt-1"
        sandbox=""
      />
    </div>
  )

  return (
    <Card title="Texte (E-Mail & PDF)">
      <div className="space-y-3">
        <div className="hidden md:block">{overview}</div>
        <MobileEditableBlock
          sheetTitle="E-Mail-Text"
          overview={overview}
          disabled={disabled}
          editLabel="Text bearbeiten"
        >
          {editForm}
        </MobileEditableBlock>
      </div>
    </Card>
  )
}
