/** Kontext-Modi für KI-Hilfe in Editoren (Positionen, Mails, Dokumente, Portal, …). */

export type KiAssistScopeId =
  | 'position'
  | 'positionen'
  | 'bautagebuch'
  | 'mangel'
  | 'abnahme_leistung'
  | 'notiz'
  | 'freitext'
  | 'feld'
  | 'mail'
  | 'dokument'
  | 'portal'

export type KiAssistDraft =
  | {
      type: 'position'
      name: string
      beschreibung?: string
      menge?: number
      einheit?: string
      preis?: number
      gewerk?: string
    }
  | {
      type: 'positionen'
      items: Array<{
        name: string
        beschreibung?: string
        menge?: number
        einheit?: string
        preis?: number
        gewerk?: string
      }>
    }
  | {
      type: 'text'
      titel?: string
      text: string
    }
  | {
      type: 'maengel'
      text: string
    }
  | {
      type: 'mail'
      betreff?: string
      text: string
    }

export type KiAssistScope = {
  id: KiAssistScopeId
  /** Kurztitel im Assistenten-Header */
  label: string
  /** Begrüßung / Modus-Erklärung */
  intro: string
  /** Placeholder im Eingabefeld */
  placeholder: string
  /** Extra Kontext für Claude (an contextHint angehängt) */
  systemHint: string
  /** Schnellchips nur in diesem Modus */
  quickPrompts: { label: string; prompt: string }[]
}

const BW_APPLY_HINT = `
Wenn der Nutzer Inhalt für das Formular will, antworte kurz menschlich UND am Ende genau einen Block:

\`\`\`bw-apply
{ …JSON… }
\`\`\`

Erlaubte JSON-Formen:
- Eine Position: {"type":"position","name":"…","beschreibung":"…","menge":1,"einheit":"Stk.","preis":0}
- Mehrere Positionen: {"type":"positionen","items":[{"name":"…","beschreibung":"…","menge":1,"einheit":"m²","preis":0,"gewerk":"optional"},…]}
- Freitext / Tagebuch / Dokument / Portal: {"type":"text","titel":"optional","text":"…"}
- Mängel-Liste: {"type":"maengel","text":"Zeile1\\nZeile2"}
- Kunden-Mail: {"type":"mail","betreff":"…","text":"Nachrichtentext ohne HTML"}

Nur ein bw-apply-Block. Ton: Bärenwald Handwerk, klar, freundlich, ohne Marketing-Floskeln.
`.trim()

export const KI_ASSIST_SCOPES: Record<KiAssistScopeId, KiAssistScope> = {
  position: {
    id: 'position',
    label: 'Position',
    intro:
      'Beschreib mir die **Position** — was gemacht wird, **Menge/Einheit** und idealerweise den **Netto-Preis**. Ich formuliere daraus eine klare Positions-Card zum Übernehmen.',
    placeholder: 'z. B. „Wandfliesen Bad 12 m², inkl. Verlegen, 85 €/m²“…',
    systemHint: `Modus: EINE Position für Angebot/Rechnung (Handwerk Bärenwald).
Frage bei Bedarf kurz nach fehlenden Angaben (Menge, Einheit, Preis).
Erzeuge Bezeichnung, Beschreibung, Menge, Einheit und Preis (netto, Zahl ohne €-Zeichen).
Zeige die Position klar strukturiert; am Ende immer bw-apply type position.
${BW_APPLY_HINT}`,
    quickPrompts: [
      {
        label: 'Aus Stichworten',
        prompt:
          'Formuliere aus meinen Stichworten eine Angebotsposition mit Bezeichnung, Beschreibung, Menge, Einheit und Preis.',
      },
      {
        label: 'Pauschal',
        prompt:
          'Mache daraus eine Pauschal-Position (Menge 1, Einheit Pauschal) mit kurzer Leistungsbeschreibung und Preis.',
      },
      {
        label: 'Nach Aufwand',
        prompt:
          'Formuliere eine Regie-/Aufwandsposition mit Beschreibung; Menge und Preis kannst du sinnvolle Defaults setzen.',
      },
    ],
  },
  positionen: {
    id: 'positionen',
    label: 'Positionen',
    intro:
      'Beschreib die **Arbeiten** (Umfang, Räume, Mengen). Ich zerlege das in **mehrere Positionen** — danach kannst du alle auf einmal übernehmen.',
    placeholder: 'z. B. „Komplettbad renovieren, ca. 8 m², inkl. Sanitär und Fliesen“…',
    systemHint: `Modus: Mehrere Kalkulationspositionen für Angebot/Rechnung (Handwerk Bärenwald).
Warte auf die Beschreibung des Nutzers — keine Positionen erfinden, bevor er den Auftragsumfang nennt.
Zerlege in konkrete, kalkulierbare Positionen (Bezeichnung, Menge, Einheit, kurze Beschreibung, Netto-Preis wenn schätzbar).
Am Ende IMMER genau einen bw-apply-Block type "positionen" mit items-Array (mind. 2 wenn sinnvoll, sonst so viele wie nötig).
Kein Katalog-Matching. Keine UUIDs/Nummern im Chattext.
${BW_APPLY_HINT}`,
    quickPrompts: [
      {
        label: 'Gewerk aufteilen',
        prompt: 'Teile meine Beschreibung in sinnvolle Einzelpositionen mit Mengen und Einheiten auf.',
      },
      {
        label: 'Nur Leistungen',
        prompt: 'Nur Leistungspositionen — konkret und kalkulierbar, ohne Dokumenttitel.',
      },
    ],
  },
  bautagebuch: {
    id: 'bautagebuch',
    label: 'Bautagebuch',
    intro:
      'Ich formuliere einen **Bautagebuch-Eintrag** (Titel + Text), den der Kunde im Portal sieht. Beschreib kurz, was auf der Baustelle passiert ist.',
    placeholder: 'z. B. „Vormittag Estrich im Bad, Nachmittag Trocknung, 2 Mann“…',
    systemHint: `Modus: Bautagebuch-Eintrag (kundensichtbar im Portal).
Kurzer Titel + sachlicher Fließtext (was, wo, wer). Keine internen Preise/Kritik.
${BW_APPLY_HINT}
Nutze type "text" mit titel und text.`,
    quickPrompts: [
      {
        label: 'Aus Stichworten',
        prompt: 'Schreib aus meinen Stichworten einen klaren Bautagebuch-Eintrag mit Titel und Text für den Kunden.',
      },
    ],
  },
  mangel: {
    id: 'mangel',
    label: 'Mängel',
    intro:
      'Ich formuliere **Mängel** für die Abnahme — klar, prüfbar, ohne Dramatik. Der Text kann im Protokoll landen.',
    placeholder: 'z. B. „Fugen im Duschbereich undicht, Sockelleiste Wohnzimmer lose“…',
    systemHint: `Modus: Abnahme-Mängel (kundensichtbar / Protokoll).
Formuliere knappe, prüfbare Mängelpunkte (Ort + Mangel).
- Ein einzelner Mangel: type "text" mit titel (Kurzfassung) und text (Details/Notiz), ODER type "maengel" mit einer Zeile.
- Mehrere Mängel auf einmal: type "maengel", text = eine Zeile pro Mangel.
${BW_APPLY_HINT}`,
    quickPrompts: [
      {
        label: 'Als Liste',
        prompt: 'Formuliere meine Punkte als Abnahme-Mängelliste, eine Zeile pro Mangel.',
      },
      {
        label: 'Ein Mangel',
        prompt:
          'Formuliere einen klaren Mangel-Titel und eine kurze Notiz fürs Abnahmeprotokoll.',
      },
    ],
  },
  abnahme_leistung: {
    id: 'abnahme_leistung',
    label: 'Abnahme-Leistung',
    intro:
      'Ich formuliere eine **erbrachte Leistung** fürs Abnahmeprotokoll — Titel und optionale Notiz, die der Kunde im PDF sieht.',
    placeholder: 'z. B. „Heizkörper Bad getauscht, Entlüftet, Dichtungen erneuert“…',
    systemHint: `Modus: Abnahme-Checkliste Leistung (kundensichtbar im Protokoll).
Erzeuge einen kurzen Titel (was erledigt wurde) und optional eine sachliche Notiz/Beschreibung darunter.
Keine Preise, keine internen Codes. Ton: klar, handwerklich, prüfbar.
Antworte kurz menschlich, dann IMMER bw-apply type "text" mit titel und text (text = Notiz; darf leer sein wenn nur Titel reicht).
${BW_APPLY_HINT}`,
    quickPrompts: [
      {
        label: 'Aus Stichworten',
        prompt:
          'Schreib aus meinen Stichworten Titel und Notiz einer erbrachten Leistung fürs Abnahmeprotokoll.',
      },
      {
        label: 'Kürzer',
        prompt: 'Formuliere Titel und Notiz knapper und klarer fürs Protokoll.',
      },
    ],
  },
  notiz: {
    id: 'notiz',
    label: 'Notiz',
    intro: 'Ich helfe bei einer **Notiz** — kurz und klar.',
    placeholder: 'Stichworte zur Notiz…',
    systemHint: `Modus: Notiz.
${BW_APPLY_HINT}
Nutze type "text".`,
    quickPrompts: [
      { label: 'Sauber formulieren', prompt: 'Formuliere meine Stichworte als saubere Notiz.' },
    ],
  },
  freitext: {
    id: 'freitext',
    label: 'Text',
    intro: 'Ich helfe bei diesem **Textfeld** — sag, was rein soll und in welchem Ton.',
    placeholder: 'Was soll der Text aussagen?',
    systemHint: `Modus: Allgemeiner Formular-Text (kann kundensichtbar sein).
${BW_APPLY_HINT}
Nutze type "text".`,
    quickPrompts: [
      { label: 'Ausformulieren', prompt: 'Formuliere meinen Entwurf fertig und klar.' },
    ],
  },
  feld: {
    id: 'feld',
    label: 'Feld',
    intro:
      'Schreib den **Text für genau dieses Feld**. Sag mir im Chat, was geändert oder neu formuliert werden soll — danach übernimmst du den fertigen Text.',
    placeholder: 'z. B. „Kürzer, Bärenwald macht alles selbst, ohne Subunternehmer“…',
    systemHint: `Modus: Genau EIN Formularfeld umschreiben oder neu schreiben.
Im Zusatzkontext stehen Feldname und aktueller Text.
Deine Aufgabe: den kompletten neuen Feldinhalt erzeugen (nicht nur Diff/Hinweise).
Antworte kurz menschlich, dann IMMER genau einen bw-apply-Block type "text" — "text" enthält NUR den fertigen Feldwert.
Keine Anführungszeichen um den gesamten Text, keine Meta-Sätze im text-Feld.
${BW_APPLY_HINT}`,
    quickPrompts: [
      {
        label: 'Kürzer',
        prompt: 'Formuliere den aktuellen Feldtext kürzer und klarer — als fertigen Feldtext zum Übernehmen.',
      },
      {
        label: 'Neu schreiben',
        prompt:
          'Schreib den Feldtext komplett neu anhand meiner Anweisung und dem aktuellen Text.',
      },
      {
        label: 'Seriöser',
        prompt: 'Formuliere den aktuellen Feldtext seriöser und kundentauglich.',
      },
    ],
  },
  mail: {
    id: 'mail',
    label: 'Kunden-Mail',
    intro:
      'Ich formuliere eine **E-Mail an den Kunden** (Betreff + Nachricht). Beschreib den Anlass — ich schreibe freundlich, klar und handwerklich seriös. Kein HTML, nur Fließtext.',
    placeholder: 'z. B. „Termin morgen 10 Uhr bestätigen, Parkplatzhinweis“…',
    systemHint: `Modus: Kunden-E-Mail (Bärenwald München).
Schreib Betreff und Nachrichtentext (Du/Sie je nach Kontext-Hinweis; Standard: Sie, wenn unklar).
Kein HTML, keine Platzhalter-Syntax außer wenn im Entwurf schon vorhanden.
${BW_APPLY_HINT}
Nutze type "mail" mit betreff und text.`,
    quickPrompts: [
      {
        label: 'Freundlich kurz',
        prompt: 'Formuliere eine kurze, freundliche Kundenmail mit Betreff und Text.',
      },
      {
        label: 'Aus Stichworten',
        prompt: 'Schreib aus meinen Stichworten Betreff und Mailtext an den Kunden.',
      },
    ],
  },
  dokument: {
    id: 'dokument',
    label: 'Dokumenttext',
    intro:
      'Ich formuliere Text für **Angebot, Rechnung oder Vertrag** (Einleitung, Hinweise, Schlusstext, Leistungsumfang) — so wie der Kunde ihn auf dem PDF sieht.',
    placeholder: 'z. B. „Kurze Einleitung Bad-Renovierung, freundlich, Sie-Form“…',
    systemHint: `Modus: Kundensichtbarer Dokumenttext (Angebot/Rechnung/Vertrag/Abnahme).
Seriös, konkret, keine Marketing-Floskeln. Passend als PDF-Absatz.
${BW_APPLY_HINT}
Nutze type "text" (titel optional als Abschnittsüberschrift).`,
    quickPrompts: [
      {
        label: 'Einleitung',
        prompt: 'Schreib eine kurze, seröse Dokument-Einleitung für den Kunden.',
      },
      {
        label: 'Schlusstext',
        prompt: 'Schreib einen kurzen Schlusstext / Hinweis für das Kundendokument.',
      },
    ],
  },
  portal: {
    id: 'portal',
    label: 'Portal-Text',
    intro:
      'Ich formuliere einen Text, den der **Kunde im Portal oder auf der Statusseite** sieht. Klar, beruhigend, ohne internes Fachchinesisch.',
    placeholder: 'z. B. „Nächste Woche Fliesen, bitte Zugang Bad freihalten“…',
    systemHint: `Modus: Kundenportal / Statusseite.
Kurzer, verständlicher Text für Endkunden. Keine internen Preise, keine Partner-Kritik.
${BW_APPLY_HINT}
Nutze type "text" mit optionalem titel.`,
    quickPrompts: [
      {
        label: 'Status-Update',
        prompt: 'Formuliere ein kurzes Status-Update für den Kunden im Portal.',
      },
    ],
  },
}

export function getKiAssistScope(id: KiAssistScopeId): KiAssistScope {
  return KI_ASSIST_SCOPES[id]
}

/** Extrahiert den letzten ```bw-apply JSON-Block aus einer Assistenten-Antwort. */
export function parseBwApplyDraft(content: string): KiAssistDraft | null {
  const re = /```bw-apply\s*([\s\S]*?)```/gi
  let last: string | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) != null) {
    last = m[1]?.trim() ?? null
  }
  if (!last) return null
  try {
    const raw = JSON.parse(last) as Record<string, unknown>
    const type = String(raw.type ?? '')
    if (type === 'position') {
      const name = String(raw.name ?? raw.leistung ?? '').trim()
      if (!name) return null
      return {
        type: 'position',
        name,
        beschreibung: raw.beschreibung != null ? String(raw.beschreibung) : undefined,
        menge: typeof raw.menge === 'number' ? raw.menge : Number(raw.menge) || undefined,
        einheit: raw.einheit != null ? String(raw.einheit) : undefined,
        preis: typeof raw.preis === 'number' ? raw.preis : Number(raw.preis) || undefined,
        gewerk: raw.gewerk != null ? String(raw.gewerk).trim() || undefined : undefined,
      }
    }
    if (type === 'positionen') {
      const rawItems = Array.isArray(raw.items)
        ? raw.items
        : Array.isArray(raw.positionen)
          ? raw.positionen
          : []
      const items: Extract<KiAssistDraft, { type: 'positionen' }>['items'] = []
      for (const it of rawItems) {
        if (!it || typeof it !== 'object') continue
        const o = it as Record<string, unknown>
        const name = String(o.name ?? o.leistung ?? '').trim()
        if (!name) continue
        items.push({
          name,
          beschreibung: o.beschreibung != null ? String(o.beschreibung) : undefined,
          menge: typeof o.menge === 'number' ? o.menge : Number(o.menge) || undefined,
          einheit: o.einheit != null ? String(o.einheit) : undefined,
          preis: typeof o.preis === 'number' ? o.preis : Number(o.preis) || undefined,
          gewerk: o.gewerk != null ? String(o.gewerk).trim() || undefined : undefined,
        })
      }
      if (!items.length) return null
      return { type: 'positionen', items }
    }
    if (type === 'maengel') {
      const text = String(raw.text ?? '').trim()
      if (!text) return null
      return { type: 'maengel', text }
    }
    if (type === 'mail') {
      const text = String(raw.text ?? raw.body ?? raw.nachricht ?? '').trim()
      if (!text && !raw.betreff) return null
      return {
        type: 'mail',
        betreff: raw.betreff != null ? String(raw.betreff) : undefined,
        text: text || String(raw.betreff ?? ''),
      }
    }
    if (type === 'text') {
      const text = String(raw.text ?? raw.beschreibung ?? '').trim()
      if (!text && !raw.titel) return null
      return {
        type: 'text',
        titel: raw.titel != null ? String(raw.titel) : undefined,
        text: text || String(raw.titel ?? ''),
      }
    }
  } catch {
    return null
  }
  return null
}

/** Text ohne bw-apply-Block für die Chat-Anzeige (optional bereinigen). */
export function stripBwApplyBlock(content: string): string {
  return content.replace(/```bw-apply\s*[\s\S]*?```/gi, '').trim()
}
