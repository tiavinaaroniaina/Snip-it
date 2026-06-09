// services/import.js
// Logique d'import CSV complet vers SnipeIT avec création en cascade,
// et reset complet de toutes les entités SnipeIT.

import api from '@/services/api'
import { clean, normalizeDate, normalizePrice } from '@/utils/formatters'
import {
  createAsset, fetchAssets, deleteAsset,
  createCategory, deleteCategory, fetchCategories,
  createLocation, deleteLocation, fetchLocations,
  createManufacturer, deleteManufacturer, fetchManufacturers,
  createModel, deleteModel, fetchModels,
  createStatusLabel, deleteStatusLabel, fetchStatusLabels,
  fetchCompanies, deleteCompany,
  fetchDepartments, deleteDepartment,
  fetchUsers,
} from '@/services/snipeit'

// ── Helpers internes ──────────────────────────────────

function normalizeStatusKey(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function guessStatusType(name) {
  const n = normalizeStatusKey(name)
  if (n.includes('deploy')) return 'deployable'
  if (n.includes('pending') || n.includes('attente')) return 'pending'
  if (n.includes('repair') || n.includes('répar') || n.includes('broken')) return 'undeployable'
  if (n.includes('archive') || n.includes('retired')) return 'archived'
  return 'deployable'
}

// ── Import complet avec création en cascade ───────────
/**
 * Importe un tableau de lignes CSV vers SnipeIT.
 * Crée automatiquement toutes les entités manquantes (fabricants, catégories, etc.)
 * sans créer de doublons grâce aux caches.
 *
 * @param {Array}    rows       - Lignes CSV normalisées
 * @param {Function} onProgress - Callback(step: string, pct: number)
 * @returns {{ created, failed, errors, log }}
 */
export async function fullImport(rows, onProgress) {
  const log    = []
  const errors = []

  const cacheManufacturers = {}
  const cacheCategories    = {}
  const cacheLocations     = {}
  const cacheModels        = {}
  const cacheStatuses      = {}
  const cacheCompanies     = {}
  const cacheDepts         = {}

  // ── 1. Charger tout ce qui existe déjà dans SnipeIT ──
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
    ;(mfrs.data.rows     || []).forEach(r => { if (r?.name) cacheManufacturers[r.name.trim().toLowerCase()]  = r.id })
    ;(cats.data.rows     || []).forEach(r => { if (r?.name) cacheCategories[r.name.trim().toLowerCase()]     = r.id })
    ;(locs.data.rows     || []).forEach(r => { if (r?.name) cacheLocations[r.name.trim().toLowerCase()]      = r.id })
    ;(mdls.data.rows     || []).forEach(r => { if (r?.name) cacheModels[r.name.trim().toLowerCase()]         = r.id })
    ;(statuses.data.rows || []).forEach(r => { if (r?.name) cacheStatuses[normalizeStatusKey(r.name)]        = r.id })
    ;(companies.data.rows|| []).forEach(r => { if (r?.name) cacheCompanies[r.name.trim().toLowerCase()]      = r.id })
    ;(depts.data.rows    || []).forEach(r => { if (r?.name) cacheDepts[r.name.trim().toLowerCase()]          = r.id })

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
        const r  = await createManufacturer(name)
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
        const r  = await createCategory(name, 'asset')
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
        const r  = await createLocation(name)
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
    const row      = rows[i]
    const rowLabel = `Ligne ${i + 1} (${clean(row.asset_tag) || clean(row.name) || '?'})`
    onProgress?.(`${rowLabel}…`, Math.round(((i + 1) / rows.length) * 100))

    try {
      const assetTag    = clean(row.asset_tag)   || `AUTO-${Date.now()}-${i}`
      const serial      = clean(row.serial)       || ''
      const name        = clean(row.name)         || assetTag
      const categoryRaw = clean(row.category)     || 'Non classé'
      const mfrRaw      = clean(row.manufacturer) || clean(row.model)?.split(' ')?.[0] || 'Inconnu'
      const modelRaw    = clean(row.model)        || name
      const statusRaw   = clean(row.status)       || 'Ready to Deploy'
      const companyRaw  = clean(row.company)
      const deptRaw     = clean(row.department)
      const userRaw     = clean(row.user)
      const emailRaw    = clean(row.email)
      const purchaseDate = normalizeDate(row.purchase_date)
      const purchaseCost = normalizePrice(row.purchase_cost)

      const [mfrId, catId, statusId] = await Promise.all([
        ensureManufacturer(mfrRaw),
        ensureCategory(categoryRaw),
        ensureStatus(statusRaw),
      ])

      const modelId   = await ensureModel(modelRaw, catId, mfrId)
      const companyId = await ensureCompany(companyRaw)
      const deptId    = await ensureDepartment(deptRaw, companyId)

      if (!modelId)  throw new Error(`model_id introuvable pour modèle "${modelRaw}"`)
      if (!catId)    throw new Error(`category_id introuvable pour catégorie "${categoryRaw}"`)
      if (!statusId) throw new Error(`status_id introuvable pour statut "${statusRaw}"`)

      const assetPayload = {
        name,
        asset_tag:  assetTag,
        status_id:  statusId,
        model_id:   modelId,
        ...(serial        && { serial }),
        ...(companyId     && { company_id:    companyId }),
        ...(deptId        && { department_id: deptId }),
        ...(purchaseDate  && { purchase_date: purchaseDate }),
        ...(purchaseCost  && { purchase_cost: purchaseCost }),
        ...((userRaw || emailRaw) && {
          notes: [
            userRaw  ? `Utilisateur : ${userRaw}`  : '',
            emailRaw ? `Email : ${emailRaw}`        : '',
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
/**
 * Supprime toutes les entités dans SnipeIT dans le bon ordre.
 *
 * @param {Function} onProgress - Callback(step: string)
 * @returns {Object} Résultats par entité { label: { total, deleted, errors } }
 */
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

  // Ordre obligatoire : assets → modèles → puis le reste
  await purge('Assets',        () => fetchAssets({ limit: 500 }), deleteAsset)
  await purge('Modèles',       fetchModels,                        deleteModel)
  await purge('Catégories',    fetchCategories,                    deleteCategory)
  await purge('Fabricants',    fetchManufacturers,                 deleteManufacturer)
  await purge('Localisations', fetchLocations,                     deleteLocation)
  await purge('Statuts',       fetchStatusLabels,                  deleteStatusLabel)

  // Détacher les utilisateurs avant de supprimer entreprises/départements
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
