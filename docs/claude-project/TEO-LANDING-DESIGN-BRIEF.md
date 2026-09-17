# TEO — Landing-Page Design Brief (für Claude Designer)

Paste dieses Briefing 1:1 an Claude Designer / Claude Artifacts. Ziel: eine **Marketing-Landingpage** für die Marke **TEO** bauen — digitaler technischer Dienstleister für **Hausverwaltungen**.

---

## 1. Auftrag in einem Satz

Baue eine responsive Landingpage für **TEO**:  
**Mobile = TikTok-artiger Fullscreen-Snap-Scroll (schlicht, card-first).**  
**Desktop = normale, ruhige Marketingseite ohne Snap-Effekt.**  
Orientierung am bestehenden Bärenwald-Section-Flow, aber **neue Marke, neue Farben, B2B-Hausverwaltungen** statt Endkunden-Handwerk.

---

## 2. Marke & Positionierung

| | |
|--|--|
| **Marke** | **TEO** |
| **Akronym (optional im UI)** | Technik · Entlastung · Organisation |
| **Was TEO ist** | Digitalisierter Dienstleister: HV meldet → TEO organisiert, koordiniert, lässt ausführen, dokumentiert, schließt ab |
| **Was TEO nicht ist** | Keine reine Software, keine Handwerker-Vermittlungsplattform, kein klassischer Hausmeister allein |
| **Zielgruppe** | Hausverwaltungen (B2B), professionell, entlastungsorientiert |
| **Kerngefühl** | „Ich gebe es ab und weiß, dass sich jemand darum kümmert.“ |
| **Claims (nutzen)** | „TEO kümmert sich.“ · „Einfach melden. TEO regelt.“ · „Technik? Macht TEO.“ · „Melden. Kümmern. Erledigt.“ |
| **Ton** | Klar, ruhig, verlässlich, **Sie**-Form (B2B). Kurz. Kein Startup-Slang, kein „Crew/Desk/Hub“-Englisch. Menschlich, aber seriös. |
| **Logo** | Wordmark **TEO** (3 Buchstaben) — gut als Monogramm/Badge/Stempel. Optional Subline: „Technik. Entlastung. Organisation.“ |

---

## 3. Farbsystem (verbindlich)

Hauptfarbe: **schönes Blau**. Akzente: **Burgunder/Rot** + **Gelb/Orange** (sparsam).

### Tokens (CSS-Variablen)

```css
:root {
  /* Primary — klares, vertrauenswürdiges Blau (kein Lila, kein Neon) */
  --teo-blue-900: #0B1F3A;   /* dunkle Flächen, Footer, starke Typo */
  --teo-blue-700: #15406E;   /* Hover / tief */
  --teo-blue-500: #1E5FA8;   /* PRIMARY — Buttons, Links, aktive States */
  --teo-blue-100: #E8F1FA;   /* Soft fills, Card-Tint, Chip-Bg */

  /* Burgundy — Wärme, Ernst, Trust (sparsam: Badges, sekundäre CTAs, Highlights) */
  --teo-burgundy-700: #6B1E2A;
  --teo-burgundy-500: #8B2E3C; /* SECONDARY accent */
  --teo-burgundy-100: #F7ECEE;

  /* Amber / warm orange — Energie, „erledigt“, Attention (sehr sparsam) */
  --teo-amber-500: #E8A317;  /* ACCENT — Dot, Check, kleine Highlights */
  --teo-amber-100: #FFF6E0;

  /* Neutrals */
  --teo-bg: #F5F7FA;         /* Page background — kühles Off-White */
  --teo-surface: #FFFFFF;    /* Cards */
  --teo-border: #E2E8F0;
  --teo-text: #0F172A;
  --teo-muted: #64748B;
}
```

### Farbregeln

- **Blau** trägt 80 % der Marke (Nav, Primary-Buttons, Headlines-Akzente, Progress-Dots).
- **Burgunder** für sekundäre Buttons, Zitate, „Warum TEO“-Icons oder einen dunklen Story-Block.
- **Amber** nur als Mikro-Akzent: aktiver Snap-Dot, Checkmark, „Erledigt“-Badge — nie große Flächen.
- Kein Purple-Gradient, kein Dark-Mode-Default, kein Neon-Glow.
- Cards: weiß, feiner Border, leichter Schatten; auf Mobile oft full-bleed innerhalb des Screens mit Padding.

---

## 4. Typografie

- **Display / Headlines:** charaktervolle Serif *oder* starker geometrischer Sans mit Persönlichkeit — **nicht** Inter/Roboto/Arial/System. Vorschlag: **Fraunces** oder **Literata** (Display) + **DM Sans** oder **Manrope** (UI/Body).
- Mobile Snap-Screens: große Headline (clamp), max. 1–2 Zeilen Lead, wenig Fließtext.
- Desktop: klassische Marketing-Hierarchie (Eyebrow uppercase tracked → H1/H2 → Lead → CTA).

---

## 5. Responsive Verhalten (kritisch)

### Mobile (≤ 767px) — TikTok-Style

- `height: 100dvh` pro Section.
- `scroll-snap-type: y mandatory` auf dem Container; jede Section `scroll-snap-align: start`.
- Eine Idee = ein Screen. Kein langes Scrollen innerhalb einer Section.
- **Schlicht, card-first:** Inhalt als 1–3 Cards gestapelt oder eine große Hero-Card.
- Fixe Bottom-Chrome optional: dezente Progress-Dots (Amber aktiv, Blau inaktiv) + Sticky Primary-CTA „Anliegen melden“ / „Demo anfragen“.
- Swipe/Scroll vertikal wechselt den Screen mit weichem Snap (kein Parallax-Overkill).
- Nav: minimal (Logo TEO + Menü), halbtransparent über dem ersten Screen.

### Desktop (≥ 768px / besser ab 1024px)

- **Kein** Snap-Scroll, **kein** Fullscreen-Zwang.
- Normale Document-Flow-Landing: Section unter Section, wie Bärenwald.
- Mehr Luft, 2-Spalten wo sinnvoll (Hero Copy | Visual, Why Cards in Grid).
- Gleiche Inhalte / Reihenfolge, anderes Layout.

Breakpoint-Logik im Code klar trennen: z. B. `.teo-snap` nur unter Mobile Media Query aktiv.

---

## 6. Section-Flow (Inhalt)

Spiegelung der Bärenwald-Logik, umgeschrieben auf TEO / HV:

| # | Mobile Snap-Screen | Desktop-Section | Inhalt |
|---|--------------------|-----------------|--------|
| 0 | — | Sticky Nav | Logo **TEO**, Links: So funktioniert’s · Leistungen · Warum · FAQ · Kontakt; CTA Primary |
| 1 | **Hero** | Hero | Brand groß: **TEO**. Headline-Idee: „Einfach melden. TEO regelt.“ Lead: Entlastung für Hausverwaltungen — ein Ansprechpartner für technische Themen. CTAs: Primary „Anliegen melden“ / „Gespräch vereinbaren“, Secondary „So funktioniert’s“. Optional Badge: „Technik. Entlastung. Organisation.“ |
| 2 | **Problem** | Problem-Strip | 3 kurze Pain-Cards: Handwerkern hinterherlaufen · Kein Überblick · Kein fester Ansprechpartner |
| 3 | **How** | How (3 Steps) | „So läuft’s mit TEO.“ 01 Melden · 02 TEO kümmert sich · 03 Erledigt & dokumentiert. Claim: „Kein Abstimmen. Kein Nachfragen. Kein Stress.“ |
| 4 | **Leistungen** | Offer-Grid | Cards (nicht endloses Carousel auf Mobile): Instandhaltung · Störungen/Notfall-Koordination · Dokumentation & Abnahme · Wiederkehrende Betreuung. Eyebrow: „Was TEO übernimmt“ |
| 5 | **Warum** | Why (3 Pillars) | Ein Ansprechpartner · Verlässliche Erledigung · Alles im Blick (Status/Doku). Dunkler Block möglich: `--teo-blue-900` oder Burgundy-tinted |
| 6 | **Für wen** | Audience | Fokus HV: „Für Hausverwaltungen, die Technik abgeben wollen — und trotzdem den Überblick behalten.“ Eine klare Card + Bullet-Benefits |
| 7 | **Social Proof** | Testimonials | 2–3 kurze Zitate als Cards (Platzhalter ok). Kein Marquee auf Mobile — eine Quote pro Screen oder gestapelte Cards auf Desktop |
| 8 | **Final CTA** | Final CTA | Vollflächen Blau: „Bereit, Technik abzugeben?“ Primary hell/weiß auf Blau + Telefon Ghost |
| 9 | **FAQ** | FAQ | 5–6 Fragen: Was ist TEO? Software oder Dienstleister? Für welche Objekte? Wie melde ich? Was kostet’s? Wie dokumentiert ihr? |
| 10 | Footer | Footer | TEO, Tagline, Legal, Kontakt |

**Nicht** auf der ersten Viewport-Ladung: Stats-Strips, Feature-Listen, Adressblöcke, dichter Marketing-Müll.

---

## 7. UI-Muster (Cards & CTAs)

### Cards (Mobile besonders)

- Weiß, Radius **16–20px**, Border `1px solid var(--teo-border)`, Shadow sehr leicht.
- Innen: kleines Icon-Circle (Blau-100 + Blau-500 Icon) · Titel · 1 Satz.
- Auf Snap-Screens: Cards als Hauptinhalt, zentriert vertikal, großzügiges Padding (16–20px).
- Keine verschachtelten Card-in-Card-Monster.

### Buttons

- Primary: `--teo-blue-500`, weiß Text, Pill oder soft-rounded (12–999px).
- Secondary/Ghost: Outline Blau oder Burgundy-Ghost.
- Amber nie als Hauptbutton-Farbe.

### Micro-Motion

- Mobile: Snap + sanftes Fade/Slide beim Erscheinen des Screens (kurz, 200–350ms).
- Desktop: dezentes fade-up on scroll (wie Bärenwald), kein Überladen.
- Mindestens 2–3 bewusste Motion-Momente (Hero Brand, How Steps, CTA).

---

## 8. Copy-Starter (DE, Sie)

**Hero**  
Eyebrow: Technik. Entlastung. Organisation.  
H1: Einfach melden. TEO regelt.  
Lead: TEO übernimmt die technische Koordination für Ihre Hausverwaltung — von der Meldung bis zur dokumentierten Erledigung.

**How**  
01 Sie melden einmal.  
02 TEO organisiert und kümmert sich.  
03 Sie behalten den Überblick — und nehmen ab.

**Warum**  
Ein Ansprechpartner. / Es wird geregelt. / Alles im Blick.

**Final**  
Bereit, dass sich jemand kümmert?  
CTA: Anliegen melden · TEO anrufen

---

## 9. Tech / Deliverable für Claude Designer

Bitte liefern:

1. **Eine einzige HTML-Datei** (oder React/Next-Komponente), self-contained mit CSS (und wenig JS für Snap/Nav).
2. Mobile-first CSS; Desktop überschreibt Snap.
3. Semantische Sections mit IDs für Anker (`#how`, `#leistungen`, `#warum`, `#faq`, `#kontakt`).
4. Platzhalter-Bilder nur wenn nötig; sonst Icon + Farbe + Typo.
5. Accessibility: Focus-States, `prefers-reduced-motion` deaktiviert Snap-Zwang und Animationen.
6. Keine Stock-Purple-AI-Ästhetik; Palette strikt nach Tokens oben.

### Referenz-Logik aus Bärenwald (nur Struktur, nicht Farben/Marke)

Bärenwald-Homepage-Flow: Hero → How → Leistungen → Warum → Vision → Stimmen → Projekte → Final-CTA → FAQ → Footer.  
TEO übernimmt denselben **narrativen Bogen**, ersetzt Vision/Projekte durch **Für wen (HV)** und hält Mobile bewusst kürzer (Snap-Screens statt langer Galerie).

---

## 10. Explizite Do / Don’t

**Do**

- TEO als Markenheld (groß, klar, logo-fähig).
- Blau dominant, Burgunder & Amber gezielt.
- Mobile: ein Gedanke pro Screen, Cards, Snap.
- Desktop: normale Landing ohne Snap.
- B2B-Hausverwaltungston.

**Don’t**

- Grün von Bärenwald übernehmen.
- Snap-Scroll auf Desktop.
- Feature-Dashboard-Look, Stats-Leisten im Hero.
- Englische Startup-Wörter (Crew, Desk, Hub, GetDone) in der UI.
- Generische Kunstnamen, Facility-Management-Jargon („Bestandsoptimierung“ etc.).
- Zu viele Farben gleichzeitig auf einem Screen.

---

## 11. Acceptance Checklist

- [ ] Mobile: vertikales Snap, ~8–10 Fullscreen-Screens, schlicht, Cards
- [ ] Desktop: normaler Scroll, kein Snap, gleiches Narrativ
- [ ] TEO Wordmark dominant im Hero
- [ ] Farben: Blau + Burgunder + Amber nach Tokens
- [ ] CTAs klar: melden / Gespräch / anrufen
- [ ] FAQ + Footer vorhanden
- [ ] `prefers-reduced-motion` beachtet
- [ ] Wirkt wie Dienstleistungsmarke, nicht wie SaaS-Dashboard

---

*Ende Briefing — bitte zuerst Mobile-Snap-Version bauen, dann Desktop-Layout darüberlegen.*
