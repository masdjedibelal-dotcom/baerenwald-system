/**
 * Phase-A Nachweis: Muster-HTML (+ optional PDF) nach docs/vorschau/pdf/
 * Usage: npx tsx scripts/render-dokument-pdf-vorschau.ts
 */
import { mkdirSync, writeFileSync, existsSync, copyFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'docs/vorschau/pdf')
mkdirSync(outDir, { recursive: true })

async function main() {
  const { buildDokumentPdfMusterListe } = await import(
    '../src/lib/templates/dokument-pdf-muster'
  )
  const { renderHtmlToPdfBuffer } = await import(
    '../src/lib/angebote/render-angebot-html-pdf'
  )

  const liste = buildDokumentPdfMusterListe()
  const stamp = new Date().toISOString().slice(0, 10)

  for (const eintrag of liste) {
    const vorherHtml = join(outDir, `${eintrag.id}-vorher.html`)
    const nachherHtml = join(outDir, `${eintrag.id}-nachher.html`)
    // Vorher: einmalig snapshotten wenn noch nicht vorhanden
    if (!existsSync(vorherHtml)) {
      writeFileSync(vorherHtml, eintrag.html, 'utf8')
      console.log('vorher (baseline)', eintrag.id)
    }
    writeFileSync(nachherHtml, eintrag.html, 'utf8')

    try {
      const buf = await renderHtmlToPdfBuffer(eintrag.html, {
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      })
      const pdfPath = join(outDir, `${eintrag.id}-nachher-${stamp}.pdf`)
      writeFileSync(pdfPath, buf)
      const vorherPdf = join(outDir, `${eintrag.id}-vorher.pdf`)
      if (!existsSync(vorherPdf)) {
        copyFileSync(pdfPath, vorherPdf)
        console.log('vorher.pdf baseline', eintrag.id)
      }
      console.log('OK PDF', eintrag.id, pdfPath)
    } catch (err) {
      console.warn(
        'PDF skip',
        eintrag.id,
        err instanceof Error ? err.message : err
      )
    }
  }
  console.log('Ausgabe:', outDir, `(${liste.length} Typen)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
