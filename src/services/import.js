// services/import.js
// Logique d'import CSV complet vers SnipeIT avec création en cascade,
// et reset complet de toutes les entités SnipeIT.

import api from '@/services/api'
import { clean, normalizeDate, normalizePrice } from '@/utils/formatters'
import {
  createAsset, updateAsset, fetchAssets, deleteAsset,
  createCategory, deleteCategory, fetchCategories,
  createLocation, deleteLocation, fetchLocations,
  createManufacturer, deleteManufacturer, fetchManufacturers,
  createModel, deleteModel, fetchModels,
  createStatusLabel, deleteStatusLabel, fetchStatusLabels,
  fetchCompanies, deleteCompany,
  fetchDepartments, deleteDepartment,
  fetchUsers, createUser, deleteUser,
  checkoutAsset,
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
  const cacheUsers         = {}   // clé : email.toLowerCase()
  const cacheAssetTags     = {}   // clé : asset_tag.toLowerCase() → id existant

  // ── 1. Charger tout ce qui existe déjà dans SnipeIT ──
  onProgress?.('Chargement des données existantes dans SnipeIT…', 0)
  try {
    const [mfrs, cats, locs, mdls, statuses, companies, depts, users, existingAssets] = await Promise.all([
      api.get('/manufacturers', { params: { limit: 500 } }),
      api.get('/categories',    { params: { limit: 500 } }),
      api.get('/locations',     { params: { limit: 500 } }),
      api.get('/models',        { params: { limit: 500 } }),
      api.get('/statuslabels',  { params: { limit: 200 } }),
      api.get('/companies',     { params: { limit: 500 } }),
      api.get('/departments',   { params: { limit: 500 } }),
      api.get('/users',         { params: { limit: 500 } }),
      api.get('/hardware',      { params: { limit: 500 } }),
    ])
    ;(mfrs.data.rows          || []).forEach(r => { if (r?.name)      cacheManufacturers[r.name.trim().toLowerCase()]      = r.id })
    ;(cats.data.rows          || []).forEach(r => { if (r?.name)      cacheCategories[r.name.trim().toLowerCase()]         = r.id })
    ;(locs.data.rows          || []).forEach(r => { if (r?.name)      cacheLocations[r.name.trim().toLowerCase()]          = r.id })
    ;(mdls.data.rows          || []).forEach(r => { if (r?.name)      cacheModels[r.name.trim().toLowerCase()]             = r.id })
    ;(statuses.data.rows      || []).forEach(r => { if (r?.name)      cacheStatuses[normalizeStatusKey(r.name)]            = r.id })
    ;(companies.data.rows     || []).forEach(r => { if (r?.name)      cacheCompanies[r.name.trim().toLowerCase()]          = r.id })
    ;(depts.data.rows         || []).forEach(r => { if (r?.name)      cacheDepts[r.name.trim().toLowerCase()]              = r.id })
    ;(users.data.rows         || []).forEach(r => { if (r?.email)     cacheUsers[r.email.trim().toLowerCase()]             = r.id })
    ;(existingAssets.data.rows|| []).forEach(r => { if (r?.asset_tag) cacheAssetTags[r.asset_tag.trim().toLowerCase()]     = r.id })

    log.push(
      `Chargé depuis SnipeIT : ` +
      `${Object.keys(cacheManufacturers).length} fabricants, ` +
      `${Object.keys(cacheCategories).length} catégories, ` +
      `${Object.keys(cacheLocations).length} localisations, ` +
      `${Object.keys(cacheModels).length} modèles, ` +
      `${Object.keys(cacheStatuses).length} statuts, ` +
      `${Object.keys(cacheCompanies).length} entreprises, ` +
      `${Object.keys(cacheDepts).length} départements, ` +
      `${Object.keys(cacheUsers).length} utilisateurs, ` +
      `${Object.keys(cacheAssetTags).length} assets existants`
    )
  } catch (e) {
    throw new Error('Impossible de charger les données SnipeIT existantes : ' + e.message)
  }

  // ── Helpers ensure* ───────────────────────────────────

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
          throw new Error(`category_id=${categoryId} ou manufacturer_id=${manufacturerId} manquant`)
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

  async function ensureUser(rawName, rawEmail, companyId, deptId) {
    const email = clean(rawEmail)
    const name  = clean(rawName)
    if (!email && !name) return null

    const key = email ? email.toLowerCase() : `name:${name.toLowerCase()}`
    if (!cacheUsers[key]) {
      try {
        const username = email
          ? email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '')
          : name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '')

        const parts     = (name || username).trim().split(/\s+/)
        const firstName = parts[0]                 || username
        const lastName  = parts.slice(1).join(' ') || ''

        const payload = {
          first_name: firstName,
          last_name:  lastName,
          username,
          ...(email     && { email }),
          ...(companyId && { company_id:    companyId }),
          ...(deptId    && { department_id: deptId }),
          activated:             true,
          password:              'Change@2026!',
          password_confirmation: 'Change@2026!',
        }

        const r  = await createUser(payload)
        const id = r?.payload?.id ?? r?.id ?? null
        if (!id) throw new Error('ID non retourné par SnipeIT')
        cacheUsers[key] = id
        log.push(`✓ Utilisateur créé : "${firstName} ${lastName}" <${email || '—'}> (id=${id})`)
      } catch (e) {
        errors.push(`Utilisateur "${name || email}" : ${e.message}`)
        return null
      }
    }
    return cacheUsers[key]
  }

  // ── 2. Traiter chaque ligne du CSV ───────────────────
  let created = 0
  let failed  = 0

  for (let i = 0; i < rows.length; i++) {
    const row      = rows[i]
    const rowLabel = `Ligne ${i + 1} (${clean(row.asset_tag) || clean(row.name) || '?'})`
    onProgress?.(`${rowLabel}…`, Math.round(((i + 1) / rows.length) * 100))

    try {
      const assetTag     = clean(row.asset_tag)   || `AUTO-${Date.now()}-${i}`
      const serial       = clean(row.serial)       || ''
      const name         = clean(row.name)         || assetTag
      const categoryRaw  = clean(row.category)     || 'Non classé'
      const mfrRaw       = clean(row.manufacturer) || clean(row.model)?.split(' ')?.[0] || 'Inconnu'
      const modelRaw     = clean(row.model)        || name
      const statusRaw    = clean(row.status)       || 'Ready to Deploy'
      const companyRaw   = clean(row.company)
      const deptRaw      = clean(row.department)
      const userRaw      = clean(row.user)
      const emailRaw     = clean(row.email)
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
      const userId    = await ensureUser(userRaw, emailRaw, companyId, deptId)

      if (!modelId)  throw new Error(`model_id introuvable pour modèle "${modelRaw}"`)
      if (!catId)    throw new Error(`category_id introuvable pour catégorie "${categoryRaw}"`)
      if (!statusId) throw new Error(`status_id introuvable pour statut "${statusRaw}"`)

      // Payload asset : PAS de assigned_to ici — SnipeIT l'ignore à la création.
      // Le checkout vers l'utilisateur se fait via un appel séparé après création.
      const assetPayload = {
        name,
        asset_tag:  assetTag,
        status_id:  statusId,
        model_id:   modelId,
        ...(serial       && { serial }),
        ...(companyId    && { company_id:    companyId }),
        ...(deptId       && { department_id: deptId }),
        ...(purchaseDate && { purchase_date: purchaseDate }),
        ...(purchaseCost && { purchase_cost: purchaseCost }),
      }

      // ── Upsert : update si asset_tag déjà présent, create sinon ──
      const tagKey     = assetTag.toLowerCase()
      const existingId = cacheAssetTags[tagKey]
      let   assetId

      if (existingId) {
        await updateAsset(existingId, assetPayload)
        assetId = existingId
        log.push(`↺ Asset mis à jour : "${name}" [${assetTag}] (id=${assetId})`)
      } else {
        const result = await createAsset(assetPayload)
        assetId = result?.payload?.id ?? result?.id ?? null
        if (!assetId) throw new Error('Asset créé mais ID non retourné par SnipeIT')
        cacheAssetTags[tagKey] = assetId
        log.push(`✓ Asset créé : "${name}" [${assetTag}] (id=${assetId})`)
      }

      // ── Checkout vers l'utilisateur (appel séparé obligatoire) ──
      if (userId && assetId) {
        try {
          await checkoutAsset(assetId, userId)
          log.push(`  → Checkout vers user id=${userId}`)
        } catch (e) {
          // Le checkout échoue parfois si le statut n'est pas "deployable"
          // On loggue l'avertissement mais on ne fait pas échouer l'asset
          errors.push(`⚠ Checkout [${assetTag}] → user ${userId} : ${e.message}`)
        }
      }

      created++

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

  // Supprime les IDs en parallèle par batch de BATCH_SIZE requêtes simultanées.
  // Évite de saturer l'API SnipeIT tout en étant bien plus rapide que le séquentiel.
  const BATCH_SIZE = 10

  async function purge(label, fetchFn, deleteFn) {
    onProgress?.(`Suppression : ${label}…`)
    let deleted = 0
    let errors  = 0
    try {
      const data = await fetchFn()
      const ids  = (data.rows || []).map(r => r.id)
      results[label] = { total: ids.length, deleted: 0, errors: 0 }

      // Découper les IDs en batches et traiter chaque batch en parallèle
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.allSettled(batch.map(id => deleteFn(id)))
        batchResults.forEach(r => {
          if (r.status === 'fulfilled') deleted++
          else                          errors++
        })
      }

      results[label].deleted = deleted
      results[label].errors  = errors
    } catch (e) {
      results[label] = { total: 0, deleted: 0, errors: 1, fetchError: e.message }
    }
  }

  // Les entités sont supprimées dans l'ordre obligatoire (dépendances FK)
  // mais au sein de chaque entité les suppressions sont parallèles par batch.
  await purge('Assets',        () => fetchAssets({ limit: 500 }), deleteAsset)
  await purge('Modèles',       fetchModels,                        deleteModel)
  await purge('Catégories',    fetchCategories,                    deleteCategory)
  await purge('Fabricants',    fetchManufacturers,                 deleteManufacturer)
  await purge('Localisations', fetchLocations,                     deleteLocation)
  await purge('Statuts',       fetchStatusLabels,                  deleteStatusLabel)

  // Utilisateurs : supprimer en parallèle par batch, hors superusers
  onProgress?.('Suppression : Utilisateurs…')
  try {
    const usersData = await fetchUsers()
    const users     = (usersData.rows || []).filter(u => !u.permissions?.superuser)
    results['Utilisateurs'] = { total: users.length, deleted: 0, errors: 0 }

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch        = users.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.allSettled(batch.map(u => deleteUser(u.id)))
      batchResults.forEach(r => {
        if (r.status === 'fulfilled') results['Utilisateurs'].deleted++
        else                          results['Utilisateurs'].errors++
      })
    }
  } catch (e) {
    results['Utilisateurs'] = { total: 0, deleted: 0, errors: 1, fetchError: e.message }
  }

  await purge('Départements',  fetchDepartments,  deleteDepartment)
  await purge('Entreprises',   fetchCompanies,    deleteCompany)

  return results
}