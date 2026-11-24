/** Kurzer Ladezustand für nachgeladene Bereiche: graue, pulsierende Zeilen statt leerer Fläche. */
export function LadeZeilen({ anzahl = 2, hoehe = 44 }: { anzahl?: number; hoehe?: number }) {
  return (
    <div className="lade-zeilen" aria-busy="true" aria-label="Wird geladen">
      {Array.from({ length: anzahl }, (_, i) => (
        <div key={i} className="lade-zeile" style={{ height: hoehe }} />
      ))}
    </div>
  )
}
