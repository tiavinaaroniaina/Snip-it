// services/snipeit.js
// Le token Bearer EST injecté par le proxy Vite (vite.config.js)
import axios from 'axios'

const api = axios.create({
  baseURL: '/api/snipeit',
  headers: {
    'Accept':       'application/json',
    'Content-Type': 'application/json',
  }
})

// ── Intercepteur réponse ──────────────────────────────
api.interceptors.response.use(
  (response) => {
    const ct = response.headers['content-type'] || ''
    if (ct.includes('text/html')) {
      throw new Error(
        'SnipeIT a retourné du HTML. ' +
        'Vérifiez VITE_SNIPEIT_TOKEN dans .env.local puis RELANCEZ npm run dev.'
      )
    }
    return response
  },
  (error) => {
    if (!error.response) {
      return Promise.reject(new Error(
        'Impossible de joindre SnipeIT. Lancez : php artisan serve --port=8000'
      ))
    }
    const status = error.response?.status
    const body   = error.response?.data
    const msgs = {
      401: 'Token invalide ou manquant (401). Vérifiez VITE_SNIPEIT_TOKEN dans .env.local et relancez npm run dev.',
      403: 'Permissions insuffisantes (403). Le token doit avoir les droits Read sur Assets et Categories.',
      404: 'Endpoint introuvable (404). Vérifiez VITE_SNIPEIT_URL dans .env.local.',
      422: `Données invalides (422) : ${JSON.stringify(body?.messages || body)}`,
      429: 'Trop de requêtes, API throttlée (429). Réessayez dans quelques secondes.',
      500: 'Erreur interne SnipeIT (500). Consultez les logs Laravel.',
      502: body?.message || 'SnipeIT inaccessible (502). Vérifiez que php artisan serve tourne.',
    }
    return Promise.reject(new Error(msgs[status] || `Erreur API ${status}`))
  }
)

// ── Helpers CSV ───────────────────────────────────────

// Normalise les clés d'en-tête CSV :
// - supprime BOM UTF-8 (\uFEFF) ajouté par Excel
// - lowercase + trim
// - accents → sans accents (Catégorie → categorie)
// - espaces/tirets → underscore (Asset Tag → asset_tag)
export function normalizeCSVHeaders(rows) {
  if (!rows || !rows.length) return rows
  return rows.map(row => {
    const normalized = {}
    for (const key of Object.keys(row)) {
      const clean = key
        .replace(/^\uFEFF/, '')           // BOM UTF-8 Excel
        .trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents
        .replace(/[\s\-]+/g, '_')         // espaces/tirets → _
        .replace(/[^a-z0-9_]/g, '')        // autres caractères spéciaux
      normalized[clean] = row[key]
    }
    return normalized
  })
}

// Nettoie une valeur CSV : trim + BOM + vide → null
function clean(v) {
  if (v === null || v === undefined) return null
  const s = String(v)
    .replace(/^\uFEFF/, '')   // BOM Excel
    .trim()
  return s === '' ? null : s
}

// Convertit un prix dans toutes ses variantes → nombre float ou null
// Gère : "1 299,99" "1.299,99" "1,299.99" "1299" "€1299" "1 299 €" etc.
function normalizePrice(raw) {
  const v = clean(raw)
  if (!v) return null
  // Supprimer symboles monnaie et espaces insécables
  let s = v.replace(/[€$£¥\u00a0]/g, '').trim()
  // Détecter le format : si virgule après point → format FR (1.299,99)
  // Si point après virgule → format EN (1,299.99)
  const lastComma = s.lastIndexOf(',')
  const lastDot   = s.lastIndexOf('.')
  if (lastComma > lastDot) {
    // Format FR : 1.299,99 ou 1 299,99
    s = s.replace(/[\s.]/g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    // Format EN : 1,299.99
    s = s.replace(/[\s,]/g, '')
  } else {
    // Pas de séparateur décimal — juste espaces/tirets
    s = s.replace(/[\s,]/g, '')
  }
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// Convertit une date dans toutes ses variantes → YYYY-MM-DD ou null
// Gère : DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY,
//        2025/01/15, 15/1/25, "Jan 15 2025", "15 janvier 2025"
function normalizeDate(raw) {
  const v = clean(raw)
  if (!v) return null

  // Déjà YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v

  // YYYY/MM/DD
  const ymd = v.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/)
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2,'0')}-${ymd[3].padStart(2,'0')}`

  // DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
  const dmy = v.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`

  // DD/MM/YY (année 2 chiffres)
  const dmy2 = v.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/)
  if (dmy2) return `20${dmy2[3]}-${dmy2[2].padStart(2,'0')}-${dmy2[1].padStart(2,'0')}`

  // Mois texte anglais : "Jan 15 2025" ou "15 Jan 2025"
  const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }
  const eng = v.match(/^(\d{1,2})\s+([a-z]{3})\s+(\d{4})$/i) ||
              v.match(/^([a-z]{3})\s+(\d{1,2})\s+(\d{4})$/i)
  if (eng) {
    const mo = months[(eng[2] || eng[1]).toLowerCase().slice(0,3)]
    const d  = parseInt(eng[1].match(/\d/) ? eng[1] : eng[2])
    const y  = parseInt(eng[3])
    if (mo && d && y) return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }

  // Mois texte français : "15 janvier 2025"
  const frMonths = { janvier:1,février:2,fevrier:2,mars:3,avril:4,mai:5,juin:6,
                     juillet:7,août:8,aout:8,septembre:9,octobre:10,novembre:11,décembre:12,decembre:12 }
  const fr = v.match(/^(\d{1,2})\s+([a-zéûî]+)\s+(\d{4})$/i)
  if (fr) {
    const mo = frMonths[fr[2].toLowerCase()]
    if (mo) return `${fr[3]}-${String(mo).padStart(2,'0')}-${fr[1].padStart(2,'0')}`
  }

  return null
}

// Normalise le nom d'un status pour matching insensible à la casse/espaces
function normalizeStatusKey(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Détermine le type de status SnipeIT selon le nom
function guessStatusType(name) {
  const n = normalizeStatusKey(name)
  if (n.includes('deploy')) return 'deployable'
  if (n.includes('pending') || n.includes('attente')) return 'pending'
  if (n.includes('repair') || n.includes('répar') || n.includes('broken')) return 'undeployable'
  if (n.includes('archive') || n.includes('retired')) return 'archived'
  return 'deployable'
}

// ── Fix virgule décimale dans CSV brut ───────────────────────────────────────
// Problème : "1200,05" dans un CSV séparé par virgules est lu comme DEUX colonnes
// par PapaParse. Cette fonction prétraite le texte brut AVANT parsing pour
// protéger les nombres décimaux en les entourant de guillemets.
//
// Exemples traités :
//   ,1200,05,   → ,"1200.05",   (nombre décimal sans guillemets)
//   ,1 200,05,  → ,"1200.05",   (avec espace milliers)
//   ,"1200,05", → ,"1200.05",   (déjà entre guillemets → remplace virgule par point)
//
// Stratégie : on détecte un pattern  ,NNN,NN,  où NNN et NN sont des chiffres
// (avec éventuellement espaces milliers) et on les fusionne en ,NNN.NN,
export function fixDecimalCommas(csvText) {
  if (!csvText) return csvText

  const lines = csvText.split(/\r?\n/)
  if (lines.length < 2) return csvText

  // Lire les en-têtes pour connaître le nombre de colonnes attendu
  const headerLine   = lines[0]
  const expectedCols = headerLine.split(',').length

  const fixedLines = lines.map((line, lineIndex) => {
    if (lineIndex === 0) return line        // ne pas toucher l'en-tête
    if (!line.trim())   return line        // ligne vide

    // Compter les colonnes de cette ligne
    const cols = line.split(',')
    if (cols.length === expectedCols) return line  // ligne OK, rien à faire

    // La ligne a trop de colonnes → des virgules décimales ont été mal splitées.
    // On reconstruit la ligne en fusionnant les paires ,DIGITS,DIGITS, dont
    // la somme de tokens réduit la colonne au bon compte.
    let tokens = cols
    let pass   = 0
    while (tokens.length > expectedCols && pass < 20) {
      pass++
      const merged = []
      let i = 0
      while (i < tokens.length) {
        const curr = tokens[i]
        const next = tokens[i + 1]
        // Fusionner si curr est un nombre (entier ou décimal partiel)
        // ET next est 1-4 chiffres (cents) ET les deux fusionnés donnent un nb valide
        if (
          next !== undefined &&
          /^[\s\u00a0]*-?[\d\s\u00a0]+$/.test(curr) &&   // curr : chiffres + espaces
          /^[\d]{1,4}[\s\u00a0]*$/.test(next)             // next : 1-4 chiffres (cents)
        ) {
          // Construire la valeur fusionnée : supprimer espaces milliers, joindre par point
          const intPart = curr.replace(/[\s\u00a0]/g, '')
          const decPart = next.replace(/[\s\u00a0]/g, '')
          merged.push(`${intPart}.${decPart}`)
          i += 2   // consommer les deux tokens
        } else {
          merged.push(curr)
          i++
        }
      }
      // Si on n'a pas réduit, on arrête pour éviter une boucle infinie
      if (merged.length === tokens.length) break
      tokens = merged
    }
    return tokens.join(',')
  })

  return fixedLines.join('\n')
}

// Détecte et gère les CSV avec séparateur ";" (Excel FR)
// PapaParse détecte automatiquement mais au cas où les rows arrivent mal parsées
export function fixCSVSeparator(rows) {
  if (!rows || !rows.length) return rows
  // Si toutes les lignes n'ont qu'une seule clé contenant des ";"
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

// ── Assets ────────────────────────────────────────────
export async function fetchAssets(params = {}) {
  const res = await api.get('/hardware', {
    params: { limit: 500, sort: 'created_at', order: 'desc', ...params }
  })
  return res.data
}

export async function createAsset(data) {
  const res = await api.post('/hardware', data)
  return res.data
}

export async function updateAsset(id, data) {
  const res = await api.patch(`/hardware/${id}`, data)
  return res.data
}

export async function deleteAsset(id) {
  const res = await api.delete(`/hardware/${id}`)
  return res.data
}

export async function deleteAllAssets() {
  const data = await fetchAssets({ limit: 500 })
  const ids  = (data.rows || []).map(a => a.id)
  const results = { deleted: 0, errors: [] }
  for (const id of ids) {
    try   { await deleteAsset(id); results.deleted++ }
    catch (e) { results.errors.push(`ID ${id} : ${e.message}`) }
  }
  return results
}

// ── Categories ────────────────────────────────────────
export async function fetchCategories(params = {}) {
  const res = await api.get('/categories', {
    params: { limit: 500, sort: 'name', order: 'asc', ...params }
  })
  return res.data
}

export async function createCategory(name, category_type = 'asset') {
  const res = await api.post('/categories', { name, category_type })
  return res.data
}

export async function deleteCategory(id) {
  const res = await api.delete(`/categories/${id}`)
  return res.data
}

// ── Locations ─────────────────────────────────────────
export async function fetchLocations(params = {}) {
  const res = await api.get('/locations', {
    params: { limit: 500, sort: 'name', order: 'asc', ...params }
  })
  return res.data
}

export async function createLocation(name) {
  const res = await api.post('/locations', { name })
  return res.data
}

export async function deleteLocation(id) {
  const res = await api.delete(`/locations/${id}`)
  return res.data
}

// ── Manufacturers ─────────────────────────────────────
export async function fetchManufacturers(params = {}) {
  const res = await api.get('/manufacturers', {
    params: { limit: 500, sort: 'name', order: 'asc', ...params }
  })
  return res.data
}

export async function createManufacturer(name) {
  const res = await api.post('/manufacturers', { name })
  return res.data
}

export async function deleteManufacturer(id) {
  const res = await api.delete(`/manufacturers/${id}`)
  return res.data
}

// ── Models ────────────────────────────────────────────
export async function fetchModels(params = {}) {
  const res = await api.get('/models', {
    params: { limit: 500, sort: 'name', order: 'asc', ...params }
  })
  return res.data
}

export async function createModel(name, category_id, manufacturer_id) {
  const res = await api.post('/models', { name, category_id, manufacturer_id })
  return res.data
}

export async function deleteModel(id) {
  const res = await api.delete(`/models/${id}`)
  return res.data
}

// ── Status Labels ─────────────────────────────────────
export async function fetchStatusLabels(params = {}) {
  const res = await api.get('/statuslabels', { params: { limit: 200, ...params } })
  return res.data
}

export async function createStatusLabel(name, type = 'deployable') {
  const res = await api.post('/statuslabels', { name, type })
  return res.data
}

export async function deleteStatusLabel(id) {
  const res = await api.delete(`/statuslabels/${id}`)
  return res.data
}

// ── Companies ─────────────────────────────────────────
export async function fetchCompanies() {
  const res = await api.get('/companies', { params: { limit: 500 } })
  return res.data
}

export async function deleteCompany(id) {
  const res = await api.delete(`/companies/${id}`)
  return res.data
}

// ── Departments ───────────────────────────────────────
export async function fetchDepartments() {
  const res = await api.get('/departments', { params: { limit: 500 } })
  return res.data
}

export async function deleteDepartment(id) {
  const res = await api.delete(`/departments/${id}`)
  return res.data
}

// ── Users ─────────────────────────────────────────────
export async function fetchUsers() {
  const res = await api.get('/users', { params: { limit: 500 } })
  return res.data
}

export async function deleteUser(id) {
  const res = await api.delete(`/users/${id}`)
  return res.data
}

// ── Test de connexion ─────────────────────────────────
export async function testConnection() {
  try {
    const res = await api.get('/hardware', { params: { limit: 1 } })
    return { ok: true, total: res.data.total }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ── Import complet avec création en cascade ───────────
// Gère : colonnes vides, dates DD/MM/YYYY, status insensible à la casse,
//        entités déjà existantes dans SnipeIT (pas de doublon)
export async function fullImport(rows, onProgress) {
  const log    = []
  const errors = []

  // Caches nom.toLowerCase() → id (évite les doublons et appels inutiles)
  const cacheManufacturers = {}
  const cacheCategories    = {}
  const cacheLocations     = {}
  const cacheModels        = {}
  const cacheStatuses      = {}   // clé = normalizeStatusKey(name)
  const cacheCompanies     = {}
  const cacheDepts         = {}

  // ── 1. Charger TOUT ce qui existe déjà dans SnipeIT ──
  // Important : certains éléments ont peut-être déjà été importés
  onProgress?.('Chargement des données existantes dans SnipeIT…', 0)
  try {
    const [mfrs, cats, locs, mdls, statuses, companies, depts] = await Promise.all([
      api.get('/manufacturers', { params: { limit: 500 } }),
      api.get('/categories',    { params: { limit: 500 } }),
      api.get('/locations',     { params: { limit: 500 } }),
      api.get('/models',        { params: { limit: 500 } }),
      api.get('/statuslabels',  { params: { limit: 200 } }),
      api.get('/companies',     { params: { limit: 500 } }),
      api.get('/departments',   { params: { limit: 500 } }),
    ])
    ;(mfrs.data.rows     || []).forEach(r => { if (r?.name) cacheManufacturers[r.name.trim().toLowerCase()]     = r.id })
    ;(cats.data.rows     || []).forEach(r => { if (r?.name) cacheCategories[r.name.trim().toLowerCase()]        = r.id })
    ;(locs.data.rows     || []).forEach(r => { if (r?.name) cacheLocations[r.name.trim().toLowerCase()]         = r.id })
    ;(mdls.data.rows     || []).forEach(r => { if (r?.name) cacheModels[r.name.trim().toLowerCase()]            = r.id })
    ;(statuses.data.rows || []).forEach(r => { if (r?.name) cacheStatuses[normalizeStatusKey(r.name)]           = r.id })
    ;(companies.data.rows|| []).forEach(r => { if (r?.name) cacheCompanies[r.name.trim().toLowerCase()]         = r.id })
    ;(depts.data.rows    || []).forEach(r => { if (r?.name) cacheDepts[r.name.trim().toLowerCase()]             = r.id })

    log.push(
      `Chargé depuis SnipeIT : ` +
      `${Object.keys(cacheManufacturers).length} fabricants, ` +
      `${Object.keys(cacheCategories).length} catégories, ` +
      `${Object.keys(cacheLocations).length} localisations, ` +
      `${Object.keys(cacheModels).length} modèles, ` +
      `${Object.keys(cacheStatuses).length} statuts, ` +
      `${Object.keys(cacheCompanies).length} entreprises, ` +
      `${Object.keys(cacheDepts).length} départements`
    )
  } catch (e) {
    throw new Error('Impossible de charger les données SnipeIT existantes : ' + e.message)
  }

  // ── Helpers ensure* : trouve dans le cache ou crée ───
  async function ensureManufacturer(rawName) {
    const name = clean(rawName)
    if (!name) return null
    const key = name.toLowerCase()
    if (!cacheManufacturers[key]) {
      try {
        const r = await createManufacturer(name)
        const id = r?.payload?.id ?? r?.id ?? null
        if (!id) throw new Error('ID non retourné par SnipeIT')
        cacheManufacturers[key] = id
        log.push(`✓ Fabricant créé : "${name}" (id=${id})`)
      } catch (e) {
        errors.push(`Fabricant "${name}" : ${e.message}`)
        return null
      }
    }
    return cacheManufacturers[key]
  }

  async function ensureCategory(rawName) {
    const name = clean(rawName) || 'Non classé'
    const key  = name.toLowerCase()
    if (!cacheCategories[key]) {
      try {
        const r = await createCategory(name, 'asset')
        const id = r?.payload?.id ?? r?.id ?? null
        if (!id) throw new Error('ID non retourné par SnipeIT')
        cacheCategories[key] = id
        log.push(`✓ Catégorie créée : "${name}" (id=${id})`)
      } catch (e) {
        errors.push(`Catégorie "${name}" : ${e.message}`)
        return null
      }
    }
    return cacheCategories[key]
  }

  async function ensureLocation(rawName) {
    const name = clean(rawName)
    if (!name) return null
    const key = name.toLowerCase()
    if (!cacheLocations[key]) {
      try {
        const r = await createLocation(name)
        const id = r?.payload?.id ?? r?.id ?? null
        if (!id) throw new Error('ID non retourné par SnipeIT')
        cacheLocations[key] = id
        log.push(`✓ Localisation créée : "${name}" (id=${id})`)
      } catch (e) {
        errors.push(`Localisation "${name}" : ${e.message}`)
        return null
      }
    }
    return cacheLocations[key]
  }

  async function ensureStatus(rawName) {
    // Insensible à la casse ET aux espaces multiples
    // "Ready To Deploy" et "ready to deploy" sont traités comme identiques
    const name = clean(rawName) || 'Ready to Deploy'
    const key  = normalizeStatusKey(name)

    if (!cacheStatuses[key]) {
      try {
        const type = guessStatusType(name)
        const r    = await createStatusLabel(name, type)
        const id   = r?.payload?.id ?? r?.id ?? null
        if (!id) throw new Error('ID non retourné par SnipeIT')
        cacheStatuses[key] = id
        log.push(`✓ Statut créé : "${name}" type=${type} (id=${id})`)
      } catch (e) {
        errors.push(`Statut "${name}" : ${e.message}`)
        return null
      }
    }
    return cacheStatuses[key]
  }

  async function ensureModel(rawName, categoryId, manufacturerId) {
    const name = clean(rawName)
    if (!name) return null
    const key = name.toLowerCase()
    if (!cacheModels[key]) {
      try {
        // category_id et manufacturer_id sont obligatoires pour SnipeIT
        if (!categoryId || !manufacturerId) {
          throw new Error(`model_id requis mais category_id=${categoryId} ou manufacturer_id=${manufacturerId} manquant`)
        }
        const r  = await createModel(name, categoryId, manufacturerId)
        const id = r?.payload?.id ?? r?.id ?? null
        if (!id) throw new Error('ID non retourné par SnipeIT')
        cacheModels[key] = id
        log.push(`✓ Modèle créé : "${name}" (id=${id})`)
      } catch (e) {
        errors.push(`Modèle "${name}" : ${e.message}`)
        return null
      }
    }
    return cacheModels[key]
  }

  async function ensureCompany(rawName) {
    const name = clean(rawName)
    if (!name) return null
    const key = name.toLowerCase()
    if (!cacheCompanies[key]) {
      try {
        const r  = await api.post('/companies', { name })
        const id = r?.data?.payload?.id ?? r?.data?.id ?? null
        if (!id) throw new Error('ID non retourné par SnipeIT')
        cacheCompanies[key] = id
        log.push(`✓ Entreprise créée : "${name}" (id=${id})`)
      } catch (e) {
        errors.push(`Entreprise "${name}" : ${e.message}`)
        return null
      }
    }
    return cacheCompanies[key]
  }

  async function ensureDepartment(rawName, companyId) {
    const name = clean(rawName)
    if (!name) return null
    const key = name.toLowerCase()
    if (!cacheDepts[key]) {
      try {
        const payload = { name, ...(companyId && { company_id: companyId }) }
        const r  = await api.post('/departments', payload)
        const id = r?.data?.payload?.id ?? r?.data?.id ?? null
        if (!id) throw new Error('ID non retourné par SnipeIT')
        cacheDepts[key] = id
        log.push(`✓ Département créé : "${name}" (id=${id})`)
      } catch (e) {
        errors.push(`Département "${name}" : ${e.message}`)
        return null
      }
    }
    return cacheDepts[key]
  }

  // ── 2. Traiter chaque ligne du CSV ───────────────────
  let created = 0
  let failed  = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowLabel = `Ligne ${i + 1} (${clean(row.asset_tag) || clean(row.name) || '?'})`
    onProgress?.(`${rowLabel}…`, Math.round(((i + 1) / rows.length) * 100))

    try {
      // ── Lire toutes les colonnes avec nettoyage ──────
      const assetTag    = clean(row.asset_tag)    || `AUTO-${Date.now()}-${i}`
      const serial      = clean(row.serial)        || ''
      const name        = clean(row.name)          || assetTag
      const categoryRaw = clean(row.category)      || 'Non classé'
      const mfrRaw      = clean(row.manufacturer)  || clean(row.model)?.split(' ')?.[0] || 'Inconnu'
      const modelRaw    = clean(row.model)         || name
      const statusRaw   = clean(row.status)        || 'Ready to Deploy'
      const companyRaw  = clean(row.company)
      const deptRaw     = clean(row.department)
      const userRaw     = clean(row.user)
      const emailRaw    = clean(row.email)
      // Conversion date DD/MM/YYYY → YYYY-MM-DD
      const purchaseDate = normalizeDate(row.purchase_date)
      const purchaseCost = normalizePrice(row.purchase_cost)

      // ── Créer les entités dans l'ordre ───────────────
      // 1. Fabricant + Catégorie + Statut (peuvent être parallèles)
      const [mfrId, catId, statusId] = await Promise.all([
        ensureManufacturer(mfrRaw),
        ensureCategory(categoryRaw),
        ensureStatus(statusRaw),
      ])

      // 2. Modèle (dépend de mfrId + catId)
      const modelId = await ensureModel(modelRaw, catId, mfrId)

      // 3. Entreprise (optionnelle)
      const companyId = await ensureCompany(companyRaw)

      // 4. Département (optionnel, lié à l'entreprise si possible)
      const deptId = await ensureDepartment(deptRaw, companyId)

      // ── Vérifications minimum obligatoire ────────────
      if (!modelId)  throw new Error(`model_id introuvable pour modèle "${modelRaw}"`)
      if (!catId)    throw new Error(`category_id introuvable pour catégorie "${categoryRaw}"`)
      if (!statusId) throw new Error(`status_id introuvable pour statut "${statusRaw}"`)

      // ── Construire le payload final ──────────────────
      const assetPayload = {
        name,
        asset_tag:   assetTag,
        status_id:   statusId,
        model_id:    modelId,
        // Champs optionnels : n'envoyer que si non vide
        ...(serial        && { serial }),
        ...(companyId     && { company_id:    companyId }),
        ...(deptId        && { department_id: deptId }),
        ...(purchaseDate  && { purchase_date: purchaseDate }),
        ...(purchaseCost  && { purchase_cost: purchaseCost }),
        // user + email → notes car la création d'utilisateur SnipeIT
        // nécessite un mot de passe (non disponible dans le CSV)
        ...((userRaw || emailRaw) && {
          notes: [
            userRaw  ? `Utilisateur : ${userRaw}`  : '',
            emailRaw ? `Email : ${emailRaw}` : '',
          ].filter(Boolean).join(' | ')
        }),
      }

      await createAsset(assetPayload)
      created++
      log.push(`✓ Asset créé : "${name}" [${assetTag}]`)

    } catch (e) {
      failed++
      errors.push(`${rowLabel} : ${e.message}`)
    }
  }

  return { created, failed, errors, log }
}

// ── Reset complet SnipeIT (toutes entités) ────────────
export async function fullResetSnipeIT(onProgress) {
  const results = {}

  async function purge(label, fetchFn, deleteFn) {
    onProgress?.(`Suppression : ${label}…`)
    let deleted = 0, errors = 0
    try {
      const data = await fetchFn()
      const ids  = (data.rows || []).map(r => r.id)
      results[label] = { total: ids.length, deleted: 0, errors: 0 }
      for (const id of ids) {
        try   { await deleteFn(id); deleted++ }
        catch { errors++ }
      }
      results[label].deleted = deleted
      results[label].errors  = errors
    } catch (e) {
      results[label] = { total: 0, deleted: 0, errors: 1, fetchError: e.message }
    }
  }

  // ── Ordre obligatoire ─────────────────────────────────
  // 1. Assets en premier (dépendent de modèles/statuts)
  await purge('Assets',        () => fetchAssets({ limit: 500 }), deleteAsset)
  // 2. Modèles (dépendent de catégories/fabricants)
  await purge('Modèles',       fetchModels,                        deleteModel)
  // 3. Le reste (pas de dépendances entre eux une fois assets+modèles partis)
  await purge('Catégories',    fetchCategories,                    deleteCategory)
  await purge('Fabricants',    fetchManufacturers,                 deleteManufacturer)
  await purge('Localisations', fetchLocations,                     deleteLocation)
  await purge('Statuts',       fetchStatusLabels,                  deleteStatusLabel)

  // ── Entreprises & Départements ────────────────────────
  // Problème : les utilisateurs SnipeIT ont des FK vers company et department.
  // Solution : détacher d'abord les utilisateurs non-admin (company_id=null,
  // department_id=null) via PATCH /users/:id, puis supprimer les entités.
  onProgress?.('Détachement des utilisateurs…')
  try {
    const usersData = await fetchUsers()
    const users     = (usersData.rows || []).filter(u => !u.permissions?.superuser)
    for (const u of users) {
      try {
        await api.patch(`/users/${u.id}`, {
          first_name:    u.first_name,
          username:      u.username,
          company_id:    null,
          department_id: null,
        })
      } catch { /* ignorer les erreurs individuelles */ }
    }
  } catch { /* API users peut être restreinte */ }

  await purge('Départements',  fetchDepartments,  deleteDepartment)
  await purge('Entreprises',   fetchCompanies,    deleteCompany)

  return results
}

export default api