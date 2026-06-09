// utils/formatters.js
// Fonctions pures de formatage et normalisation

/**
 * Nettoie une valeur CSV : trim + BOM + vide → null
 */
export function clean(v) {
  if (v === null || v === undefined) return null
  const s = String(v)
    .replace(/^\uFEFF/, '')   // BOM Excel
    .trim()
  return s === '' ? null : s
}

/**
 * Convertit un prix dans toutes ses variantes → nombre float ou null.
 * Gère : "1 299,99" "1.299,99" "1,299.99" "1299" "€1299" "1 299 €" etc.
 */
export function normalizePrice(raw) {
  const v = clean(raw)
  if (!v) return null
  let s = v.replace(/[€$£¥\u00a0]/g, '').trim()
  const lastComma = s.lastIndexOf(',')
  const lastDot   = s.lastIndexOf('.')
  if (lastComma > lastDot) {
    // Format FR : 1.299,99 ou 1 299,99
    s = s.replace(/[\s.]/g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    // Format EN : 1,299.99
    s = s.replace(/[\s,]/g, '')
  } else {
    s = s.replace(/[\s,]/g, '')
  }
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

/**
 * Convertit une date dans toutes ses variantes → YYYY-MM-DD ou null.
 * Gère : DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY,
 *        2025/01/15, 15/1/25, "Jan 15 2025", "15 janvier 2025"
 */
export function normalizeDate(raw) {
  const v = clean(raw)
  if (!v) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v

  const ymd = v.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/)
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2,'0')}-${ymd[3].padStart(2,'0')}`

  const dmy = v.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`

  const dmy2 = v.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/)
  if (dmy2) return `20${dmy2[3]}-${dmy2[2].padStart(2,'0')}-${dmy2[1].padStart(2,'0')}`

  const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }
  const eng = v.match(/^(\d{1,2})\s+([a-z]{3})\s+(\d{4})$/i) ||
              v.match(/^([a-z]{3})\s+(\d{1,2})\s+(\d{4})$/i)
  if (eng) {
    const mo = months[(eng[2] || eng[1]).toLowerCase().slice(0,3)]
    const d  = parseInt(eng[1].match(/\d/) ? eng[1] : eng[2])
    const y  = parseInt(eng[3])
    if (mo && d && y) return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }

  const frMonths = { janvier:1,février:2,fevrier:2,mars:3,avril:4,mai:5,juin:6,
                     juillet:7,août:8,aout:8,septembre:9,octobre:10,novembre:11,décembre:12,decembre:12 }
  const fr = v.match(/^(\d{1,2})\s+([a-zéûî]+)\s+(\d{4})$/i)
  if (fr) {
    const mo = frMonths[fr[2].toLowerCase()]
    if (mo) return `${fr[3]}-${String(mo).padStart(2,'0')}-${fr[1].padStart(2,'0')}`
  }

  return null
}

/**
 * Formate une date ISO en format lisible français.
 */
export function fmtDate(iso, includeTime = false) {
  if (!iso) return '—'
  const opts = { day: '2-digit', month: '2-digit', year: 'numeric' }
  if (includeTime) { opts.hour = '2-digit'; opts.minute = '2-digit' }
  return new Date(iso).toLocaleString('fr-FR', opts)
}

/**
 * Retourne la classe badge CSS selon le statut d'un ticket.
 */
export function ticketStatusBadge(status) {
  const map = {
    open:        'badge badge-red',
    in_progress: 'badge badge-yellow',
    resolved:    'badge badge-green',
    closed:      'badge badge-gray',
  }
  return map[status] || 'badge badge-gray'
}

/**
 * Retourne la classe badge CSS selon le statut d'un asset.
 */
export function assetStatusBadge(status) {
  if (!status) return 'badge-gray'
  const sl = status.toLowerCase()
  if (sl.includes('ready') || sl.includes('dispo')) return 'badge-green'
  if (sl.includes('deploy') || sl.includes('utilis'))  return 'badge-blue'
  if (sl.includes('repair') || sl.includes('répar'))   return 'badge-yellow'
  return 'badge-gray'
}

/**
 * Calcule un pourcentage, retourne 0 si total est 0.
 */
export function pct(val, total) {
  if (!total) return 0
  return Math.round((val / total) * 100)
}
