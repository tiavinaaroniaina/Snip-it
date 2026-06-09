// composables/useParseCSV.js
// Composable Vue 3 pour le parsing de fichiers CSV avec corrections automatiques.
// Encapsule : FileReader, PapaParse, fixDecimalCommas, fixCSVSeparator, normalizeCSVHeaders.

import Papa from 'papaparse'
import { fixDecimalCommas, fixCSVSeparator, normalizeCSVHeaders } from '@/utils/csv'

/**
 * Parse un fichier CSV en appliquant toutes les corrections nécessaires :
 * 1. Lit le texte brut avec FileReader (UTF-8)
 * 2. Corrige les virgules décimales (ex: 1200,05 → 1200.05)
 * 3. Parse avec PapaParse
 * 4. Corrige le séparateur ";" Excel FR si nécessaire
 * 5. Normalise les en-têtes (BOM, accents, underscore)
 *
 * @param {File} file - Fichier CSV à parser
 * @returns {Promise<Array>} Tableau de lignes normalisées
 */
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const rawText   = e.target.result
      const fixedText = fixDecimalCommas(rawText)
      Papa.parse(fixedText, {
        header:           true,
        skipEmptyLines:   true,
        delimitersToGuess: [',', ';', '\t', '|'],
        complete: (r) => {
          let rows = r.data
          rows = fixCSVSeparator(rows)
          rows = normalizeCSVHeaders(rows)
          resolve(rows)
        },
        error: (e) => reject(e),
      })
    }
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'))
    reader.readAsText(file, 'UTF-8')
  })
}
