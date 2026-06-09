// utils/csv.js
// Fonctions utilitaires de traitement CSV (parsing, normalisation, fix virgule)

/**
 * Normalise les clés d'en-tête CSV :
 * - supprime BOM UTF-8 (\uFEFF) ajouté par Excel
 * - lowercase + trim
 * - accents → sans accents (Catégorie → categorie)
 * - espaces/tirets → underscore (Asset Tag → asset_tag)
 */
export function normalizeCSVHeaders(rows) {
  if (!rows || !rows.length) return rows
  return rows.map(row => {
    const normalized = {}
    for (const key of Object.keys(row)) {
      const clean = key
        .replace(/^\uFEFF/, '')                        // BOM UTF-8 Excel
        .trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents
        .replace(/[\s\-]+/g, '_')                      // espaces/tirets → _
        .replace(/[^a-z0-9_]/g, '')                    // autres caractères spéciaux
      normalized[clean] = row[key]
    }
    return normalized
  })
}

/**
 * Détecte et gère les CSV avec séparateur ";" (Excel FR).
 * PapaParse détecte automatiquement mais au cas où les rows arrivent mal parsées.
 */
export function fixCSVSeparator(rows) {
  if (!rows || !rows.length) return rows
  const keys = Object.keys(rows[0])
  if (keys.length === 1 && keys[0].includes(';')) {
    const headers = keys[0].split(';')
    return rows.map(row => {
      const vals = Object.values(row)[0].split(';')
      const obj  = {}
      headers.forEach((h, i) => obj[h] = vals[i] || '')
      return obj
    })
  }
  return rows
}

/**
 * Corrige les virgules décimales dans le texte brut CSV AVANT parsing.
 * Problème : "1200,05" dans un CSV séparé par virgules est lu comme DEUX colonnes.
 * Cette fonction prétraite le texte brut pour fusionner les nombres cassés.
 *
 * Exemples traités :
 *   ,1200,05,   → ,1200.05,
 *   ,1 200,05,  → ,1200.05,  (avec espace milliers)
 */
export function fixDecimalCommas(csvText) {
  if (!csvText) return csvText

  const lines = csvText.split(/\r?\n/)
  if (lines.length < 2) return csvText

  const headerLine   = lines[0]
  const expectedCols = headerLine.split(',').length

  const fixedLines = lines.map((line, lineIndex) => {
    if (lineIndex === 0) return line
    if (!line.trim())   return line

    const cols = line.split(',')
    if (cols.length === expectedCols) return line

    let tokens = cols
    let pass   = 0
    while (tokens.length > expectedCols && pass < 20) {
      pass++
      const merged = []
      let i = 0
      while (i < tokens.length) {
        const curr = tokens[i]
        const next = tokens[i + 1]
        if (
          next !== undefined &&
          /^[\s\u00a0]*-?[\d\s\u00a0]+$/.test(curr) &&
          /^[\d]{1,4}[\s\u00a0]*$/.test(next)
        ) {
          const intPart = curr.replace(/[\s\u00a0]/g, '')
          const decPart = next.replace(/[\s\u00a0]/g, '')
          merged.push(`${intPart}.${decPart}`)
          i += 2
        } else {
          merged.push(curr)
          i++
        }
      }
      if (merged.length === tokens.length) break
      tokens = merged
    }
    return tokens.join(',')
  })

  return fixedLines.join('\n')
}
