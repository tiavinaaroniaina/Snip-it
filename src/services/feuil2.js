// services/feuil2.js
// Appels vers le backend Node/SQLite (server/index.js sur port 3001).
// Toutes les opérations CRUD sur la table feuil2.

const BASE = '/api/feuil2'

/**
 * Charge toutes les lignes de feuil2 depuis SQLite.
 * @returns {Array} rows
 */
export async function apiFetchFeuil2() {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.rows || []
}

/**
 * Importe un tableau de lignes JSON dans SQLite (remplace tout le contenu).
 * @param {Array} rows
 */
export async function apiImportFeuil2(rows) {
  const res = await fetch(`${BASE}/import`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ rows }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Vide la table feuil2 dans SQLite.
 */
export async function apiClearFeuil2() {
  const res = await fetch(BASE, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
