// services/importValidator.js
// Validation CSV selon 4 règles strictes :
// Règle 1 — Colonnes obligatoires manquantes → bloquer TOUT l'import
// Règle 2 — Valeur vide → accepté, valeur null/défaut
// Règle 3 — Mauvais type de données sur une ligne → ignorer CETTE ligne
// Règle 4 — Résumé visuel après import

import { normalizeDate, normalizePrice } from '@/utils/formatters'

// ── Colonnes obligatoires pour chaque type d'import ──────
export const ASSET_REQUIRED_COLUMNS = [
  'asset_tag', 'serial', 'name', 'category', 'manufacturer',
  'model', 'status', 'company', 'user', 'email',
  'department', 'purchase_date', 'purchase_cost',
]

// Colonnes réelles du fichier de référence Feuille 2 :
// Num_Ticket, Date, Heure, Titre, Description, Status, Priority, Items
export const FEUIL2_REQUIRED_COLUMNS = [
  'num_ticket', 'date', 'heure', 'titre', 'description', 'status', 'priority', 'items',
]

// Statuts valides pour les tickets feuil2
const VALID_TICKET_STATUSES = ['new', 'open', 'in_progress', 'in progress', 'resolved', 'closed']

// Priorités valides
const VALID_TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical']

// ── Règle 1 : vérifier colonnes obligatoires ─────────────
export function checkRequiredColumns(headers, requiredColumns) {
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase())
  const missing = requiredColumns.filter(
    col => !normalizedHeaders.includes(col.toLowerCase())
  )
  return missing
}

// ── Règle 3 : valider le type des données d'une ligne ────
// Retourne un tableau de messages d'erreur (vide = ligne OK)
export function validateAssetRow(row, lineNumber) {
  const errors = []

  // purchase_cost : doit être un nombre si non vide
  const costRaw = row.purchase_cost
  if (costRaw !== null && costRaw !== undefined && String(costRaw).trim() !== '') {
    const normalized = normalizePrice(costRaw)
    if (normalized === null) {
      errors.push(`purchase_cost "${costRaw}" n'est pas un nombre`)
    }
  }

  // purchase_date : doit être une date valide si non vide
  const dateRaw = row.purchase_date
  if (dateRaw !== null && dateRaw !== undefined && String(dateRaw).trim() !== '') {
    const normalized = normalizeDate(dateRaw)
    if (normalized === null) {
      errors.push(`purchase_date "${dateRaw}" n'est pas une date valide`)
    }
  }

  return errors
}

export function validateFeuil2Row(row, lineNumber) {
  const errors = []

  // Num_Ticket : doit être un entier si non vide
  // La clé peut être "Num_Ticket" ou "num_ticket" selon le parseur
  const numRaw = row.Num_Ticket ?? row.num_ticket
  if (numRaw !== null && numRaw !== undefined && String(numRaw).trim() !== '') {
    const n = parseInt(String(numRaw).trim(), 10)
    if (isNaN(n)) {
      errors.push(`Num_Ticket "${numRaw}" n'est pas un entier`)
    }
  }

  // Date : doit être une date valide si non vide
  const dateRaw = row.Date ?? row.date
  if (dateRaw !== null && dateRaw !== undefined && String(dateRaw).trim() !== '') {
    const normalized = normalizeDate(dateRaw)
    if (normalized === null) {
      errors.push(`Date "${dateRaw}" n'est pas une date valide`)
    }
  }

  // Status : doit être une valeur connue si non vide
  const statusRaw = row.Status ?? row.status
  if (statusRaw !== null && statusRaw !== undefined && String(statusRaw).trim() !== '') {
    const s = String(statusRaw).trim().toLowerCase()
    if (!VALID_TICKET_STATUSES.includes(s)) {
      errors.push(`Status "${statusRaw}" est une valeur inconnue (attendu : New, Open, In Progress, Resolved, Closed)`)
    }
  }

  // Priority : doit être une valeur connue si non vide
  const priorityRaw = row.Priority ?? row.priority
  if (priorityRaw !== null && priorityRaw !== undefined && String(priorityRaw).trim() !== '') {
    const p = String(priorityRaw).trim().toLowerCase()
    if (!VALID_TICKET_PRIORITIES.includes(p)) {
      errors.push(`Priority "${priorityRaw}" est une valeur inconnue (attendu : Low, Medium, High, Critical)`)
    }
  }

  return errors
}

// ── Lire les en-têtes bruts du fichier ───────────────────
export function readRawHeaders(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const firstLine = text.split('\n')[0]
      // Détecter le séparateur (virgule ou point-virgule)
      const sep = firstLine.includes(';') ? ';' : ','
      const headers = firstLine
        .split(sep)
        .map(h => h.trim().replace(/^\uFEFF/, '').replace(/^"|"$/g, ''))
      resolve(headers)
    }
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'))
    reader.readAsText(file, 'UTF-8')
  })
}

// ── Validation complète d'un fichier assets ──────────────
// Retourne { canImport, missingColumns, validRows, skippedRows, summary }
export async function validateAssetsFile(file, rows) {
  // Règle 1 : vérifier les colonnes
  const headers = await readRawHeaders(file)
  const missingColumns = checkRequiredColumns(headers, ASSET_REQUIRED_COLUMNS)

  if (missingColumns.length > 0) {
    return {
      canImport: false,
      missingColumns,
      validRows: [],
      skippedRows: [],
      summary: null,
      errorMessage: 'Ce fichier ne correspond pas au format attendu.',
    }
  }

  // Règle 3 : valider chaque ligne
  const validRows = []
  const skippedRows = []

  rows.forEach((row, index) => {
    const lineNum = index + 1
    const errors = validateAssetRow(row, lineNum)
    if (errors.length === 0) {
      validRows.push(row)
    } else {
      skippedRows.push({ line: lineNum, errors })
    }
  })

  return {
    canImport: true,
    missingColumns: [],
    validRows,
    skippedRows,
    summary: buildSummary(validRows.length, skippedRows),
    errorMessage: null,
  }
}

// ── Validation complète d'un fichier feuil2 ─────────────
export async function validateFeuil2File(file, rows) {
  const headers = await readRawHeaders(file)
  const missingColumns = checkRequiredColumns(headers, FEUIL2_REQUIRED_COLUMNS)

  if (missingColumns.length > 0) {
    return {
      canImport: false,
      missingColumns,
      validRows: [],
      skippedRows: [],
      summary: null,
      errorMessage: 'Ce fichier ne correspond pas au format attendu.',
    }
  }

  const validRows = []
  const skippedRows = []

  rows.forEach((row, index) => {
    const lineNum = index + 1
    const errors = validateFeuil2Row(row, lineNum)
    if (errors.length === 0) {
      validRows.push(row)
    } else {
      skippedRows.push({ line: lineNum, errors })
    }
  })

  return {
    canImport: true,
    missingColumns: [],
    validRows,
    skippedRows,
    summary: buildSummary(validRows.length, skippedRows),
    errorMessage: null,
  }
}

// ── Règle 4 : construire le résumé visuel ────────────────
function buildSummary(importedCount, skippedRows) {
  const lines = []
  if (importedCount > 0) {
    lines.push({ type: 'success', text: `✓ ${importedCount} ligne${importedCount > 1 ? 's' : ''} importée${importedCount > 1 ? 's' : ''}` })
  }
  skippedRows.forEach(({ line, errors }) => {
    errors.forEach(err => {
      lines.push({ type: 'warning', text: `⚠ Ligne ${line} ignorée — ${err}` })
    })
  })
  return lines
}