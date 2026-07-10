/**
 * UI-Verbesserungs-Roadmap (CRM Bärenwald)
 */

export type UiPhase = {
  id: string
  title: string
  status: 'done' | 'in_progress' | 'planned'
  todos: string[]
}

export const UI_PHASES: UiPhase[] = [
  {
    id: 'A',
    title: 'Fundament & Kernscreens',
    status: 'done',
    todos: [
      'Status-Badges + Typo in globals.css schärfen',
      'DetailHead: Projekt-Kopf mit Meta-Chips',
      'Listen-Zeilen (AppEntityListRow) scanbarer',
      'Mobile FAB: kein Überdecken auf Dashboard',
      'EmptyState vereinheitlichen',
      'Detail-Header: Anfrage, Angebot, Auftrag',
    ],
  },
  {
    id: 'B',
    title: 'Arbeitscockpit & Flows',
    status: 'done',
    todos: [
      'Dashboard: Tagesleiste (offen / überfällig / Termine) + KI Hub',
      'Angebot-Wizard: Abschluss-Screen',
      'Formulare: 40px Inputs + Feld-Fehler (Input/Select)',
      'Dashboard loading.tsx mit Skeletons',
      'Toasts oben rechts',
    ],
  },
  {
    id: 'C',
    title: 'Navigation & Polish',
    status: 'done',
    todos: [
      'Sidebar: Gruppen (Arbeit / Stammdaten / Finanzen / Planung)',
      'Einstellungen: Kacheln-Startseite',
      'TopBar: KI Hub über Glocken-Icon',
      'Branding: weichere Borders, ruhigere Cards',
    ],
  },
  {
    id: 'D',
    title: 'Fundament — Status & Tokens',
    status: 'done',
    todos: [
      'StatusBadge + status-display.ts (semantische Varianten)',
      'Design Tokens in globals.css (Spacing-Referenz)',
      'Detail-Pattern: ein Badge im Header (Anfrage, Angebot, Auftrag)',
      'Breakpoint 900px dokumentieren',
    ],
  },
  {
    id: 'E',
    title: 'Kernflows',
    status: 'in_progress',
    todos: [
      'Angebot-Positionen v3 editierbar (wie Auftrag)',
      'Positionen v3 — Vorgänge-Flow + Badges',
      'Handwerker-Journey CRM + Portal (Checkliste + Handoff-Doku)',
      'Angebot-Wizard + Detail entflechten',
      'Finanzen — ein Einstieg (Tab vs. Route)',
    ],
  },
  {
    id: 'F',
    title: 'Konsolidierung',
    status: 'planned',
    todos: [
      'Legacy Positionen-Tab entfernt (v3 aktiv)',
      'Einstellungen IA (Preise & Listen)',
      'Empty/Error/Loading überall vereinheitlichen',
      'Accessibility-Pass (Fokus, Kontrast, Touch)',
    ],
  },
]
